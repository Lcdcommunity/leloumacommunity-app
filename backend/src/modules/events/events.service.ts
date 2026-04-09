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
      
      // Un membre ne voit l'événement que s'il est global (aucune antenne)
      // OU s'il cible son antenne
      // OU s'il a été explicitement invité (via EventAttendance)
      const memberOrCondition: Prisma.EventWhereInput[] = [
        { antennas: { none: {} } }, // Événement global
        { attendees: { some: { userId: user.id } } } // Invité spécifiquement
      ];
      
      if (antennaId) {
        memberOrCondition.push({ 
          antennas: { 
            some: { 
              id: { equals: antennaId } 
            } 
          } 
        });
      }

      where.AND = [
        { associationId: associationId },
        { OR: memberOrCondition }
      ];
    } else if (role === UserRole.ANTENNA_ADMIN) {
      if (antennaId) {
        where.antennas = { some: { id: { equals: antennaId } } }; 
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

    // Gestion des invitations spécifiques (Membres sélectionnés manuellement)
    // @ts-expect-error : Le DTO strict ne connaît pas encore "inviteAll"
    const inviteAll = dto.inviteAll !== false; 
    // @ts-expect-error
    const specificMemberIds: string[] = dto.memberIds || [];
    
    let attendeesCreation = {};
    if (!inviteAll && specificMemberIds.length > 0) {
      attendeesCreation = {
        create: specificMemberIds.map(mId => ({ userId: mId, status: AttendanceStatus.INVITED }))
      };
    }

    return this.prisma.event.create({
      data: {
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
        ...(connectAntennas.length > 0 ? { antennas: { connect: connectAntennas } } : {}),
        ...(Object.keys(attendeesCreation).length > 0 ? { attendees: attendeesCreation } : {})
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
      ...(dto.coverImageId ? { coverImage: { connect: { id: dto.coverImageId } } } : {})
    };

    if (user?.role === UserRole.SUPER_ADMIN && dto.antennaIds) {
      updateData.antennas = { set: dto.antennaIds.map(id => ({ id })) };
    }

    // Gestion de la modification des invitations spécifiques
    // @ts-expect-error
    const inviteAll = dto.inviteAll;
    // @ts-expect-error
    const specificMemberIds: string[] = dto.memberIds;

    if (inviteAll === false && specificMemberIds) {
      updateData.attendees = {
        deleteMany: {}, // Efface tout
        create: specificMemberIds.map(mId => ({ userId: mId, status: AttendanceStatus.INVITED })) // Recrée
      };
    } else if (inviteAll === true) {
      updateData.attendees = {
        deleteMany: {}
      };
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