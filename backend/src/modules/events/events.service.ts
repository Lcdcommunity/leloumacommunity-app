// backend/src/modules/events/events.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto, UpdateEventDto, RegisterAttendanceDto } from './dto/event.dto';
import { EventStatus, UserRole, Prisma, EventType, AttendanceStatus } from '@prisma/client';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // LECTURE DES ÉVÉNEMENTS (Admins & Membres)
  // ==========================================
  async listEvents(userId: string, role: UserRole, associationId: string, page = 1, pageSize = 20, status?: string, type?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { where: { isPrimary: true } } }
    });

    if (!user) throw new NotFoundException("Utilisateur introuvable");

    const antennaId = user.memberships[0]?.antennaId;

    const where: Prisma.EventWhereInput = {
      associationId: associationId,
      ...(status ? { status: status as EventStatus } : {}),
      ...(type ? { type: type as EventType } : {})
    };

    // Restrictions selon le rôle (Adapté pour la relation Many-to-Many 'antennas')
    if (role === UserRole.MEMBER) {
      where.status = EventStatus.PUBLISHED; 
      if (antennaId) {
        where.AND = [
          { associationId: associationId },
          {
            OR: [
              { antennas: { none: {} } }, // Événements globaux (aucune antenne spécifiée)
              { antennas: { some: { id: antennaId } } } // Événements ciblant son antenne
            ]
          }
        ];
      } else {
        where.antennas = { none: {} }; // Un membre sans antenne ne voit que le global
      }
    } else if (role === UserRole.ANTENNA_ADMIN) {
      if (antennaId) {
        where.antennas = { some: { id: antennaId } };
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        orderBy: { startsAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          antennas: { select: { id: true, name: true, code: true } },
          coverImage: { select: { url: true } },
          _count: { select: { attendees: true } } 
        }
      })
    ]);

    return { items, total, page, pageSize };
  }

  // ==========================================
  // RÉCUPÉRATION DES PRÉSENCES (RSVP)
  // ==========================================
  async listEventAttendances(associationId: string, eventId: string, page = 1, pageSize = 50, status?: string) {
    const event = await this.prisma.event.findFirst({ 
      where: { id: eventId, associationId: associationId } 
    });

    if (!event) throw new NotFoundException('Événement introuvable');

    const where: Prisma.EventAttendanceWhereInput = {
      eventId: eventId,
      ...(status ? { status: status as AttendanceStatus } : {})
    };

    const [total, items] = await Promise.all([
      this.prisma.eventAttendance.count({ where }),
      this.prisma.eventAttendance.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } }
        },
        // 👇 CORRECTION 1 : updatedAt au lieu de createdAt
        orderBy: { updatedAt: 'desc' }
      })
    ]);

    return { items, total, page, pageSize };
  }

  // ==========================================
  // GESTION PAR LES ADMINS (Créer, Modifier, Supprimer)
  // ==========================================
  async createEvent(userId: string, associationId: string, dto: CreateEventDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { where: { isPrimary: true } } }
    });

    if (!user) throw new NotFoundException("Utilisateur introuvable");

    let connectAntennas = [];
    if (user.role === UserRole.SUPER_ADMIN && dto.antennaIds && dto.antennaIds.length > 0) {
      connectAntennas = dto.antennaIds.map(id => ({ id }));
    } else if (user.role === UserRole.ANTENNA_ADMIN && user.memberships[0]?.antennaId) {
      connectAntennas = [{ id: user.memberships[0].antennaId }];
    }

    return this.prisma.event.create({
      data: {
        // 👇 CORRECTION : Utilisation de "connect" pour la relation association !
        association: { connect: { id: associationId } },
        
        title: dto.title,
        description: dto.description,
        type: (dto.type as EventType) || EventType.OTHER,
        status: (dto.status as EventStatus) || EventStatus.DRAFT,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        locationText: dto.locationText,
        isOnline: dto.isOnline || false,
        meetingLink: dto.meetingLink,
        ...(dto.coverImageId ? { coverImage: { connect: { id: dto.coverImageId } } } : {}),
        
        // 👇 On ne connecte les antennes que si la liste n'est pas vide
        ...(connectAntennas.length > 0 ? { antennas: { connect: connectAntennas } } : {})
      }
    });
  }

  async updateEvent(userId: string, associationId: string, eventId: string, dto: UpdateEventDto) {
    const event = await this.prisma.event.findFirst({ 
      where: { id: eventId, associationId: associationId },
      include: { antennas: true }
    });

    if (!event) throw new NotFoundException('Événement introuvable dans votre association');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { where: { isPrimary: true } } }
    });

    if (user?.role === UserRole.ANTENNA_ADMIN) {
      const adminAntennaId = user.memberships[0]?.antennaId;
      const belongsToAdminAntenna = event.antennas.some(a => a.id === adminAntennaId);
      if (!belongsToAdminAntenna) {
        throw new ForbiddenException("Vous n'avez pas le droit de modifier cet événement");
      }
    }

    const updateData: Prisma.EventUpdateInput = {
      title: dto.title,
      description: dto.description,
      type: dto.type as EventType,
      status: dto.status as EventStatus,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      locationText: dto.locationText,
      isOnline: dto.isOnline,
      meetingLink: dto.meetingLink,
      // 👇 CORRECTION 2 : Syntaxe relationnelle Prisma stricte
      ...(dto.coverImageId ? { coverImage: { connect: { id: dto.coverImageId } } } : {})
    };

    if (user?.role === UserRole.SUPER_ADMIN && dto.antennaIds) {
      updateData.antennas = { set: dto.antennaIds.map(id => ({ id })) };
    }

    return this.prisma.event.update({
      where: { id: eventId },
      data: updateData
    });
  }

  async deleteEvent(associationId: string, eventId: string, role: UserRole, userId: string) {
    const event = await this.prisma.event.findFirst({ 
      where: { id: eventId, associationId: associationId },
      include: { antennas: true }
    });

    if (!event) throw new NotFoundException('Événement introuvable');

    if (role === UserRole.ANTENNA_ADMIN) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { memberships: { where: { isPrimary: true } } }
      });
      const belongsToAdminAntenna = event.antennas.some(a => a.id === user?.memberships[0]?.antennaId);
      if (!belongsToAdminAntenna) {
        throw new ForbiddenException("Action non autorisée sur cet événement");
      }
    }

    return this.prisma.event.delete({ where: { id: eventId } });
  }

  // ==========================================
  // PARTICIPATION DES MEMBRES (Présence)
  // ==========================================
  async registerAttendance(userId: string, associationId: string, eventId: string, dto: RegisterAttendanceDto) {
    const event = await this.prisma.event.findFirst({ 
      where: { id: eventId, associationId: associationId } 
    });

    if (!event) throw new NotFoundException('Événement introuvable');

    return this.prisma.eventAttendance.upsert({
      where: {
        eventId_userId: { eventId, userId }
      },
      update: {
        status: dto.status,
      },
      create: {
        eventId,
        userId,
        status: dto.status,
      }
    });
  }
}