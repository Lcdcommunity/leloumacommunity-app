// backend/src/modules/events/events.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto, UpdateEventDto, RegisterAttendanceDto } from './dto/event.dto';
import { EventStatus, UserRole, Prisma, EventType } from '@prisma/client'; // 👈 Ajout EventType

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

    // 🔥 CLOISONNEMENT STRICT : associationId est la racine
    const where: Prisma.EventWhereInput = {
      associationId: associationId,
      ...(status ? { status: status as EventStatus } : {}),
      // 🔥 CORRECTION CHIRURGICALE : Casting vers EventType pour Prisma
      ...(type ? { type: type as EventType } : {})
    };

    // Restrictions selon le rôle
    if (role === UserRole.MEMBER) {
      where.status = EventStatus.PUBLISHED; 
      if (antennaId) {
        where.AND = [
          { associationId: associationId },
          {
            OR: [
              { antennaId: null }, // Événements globaux de l'association
              { antennaId: antennaId } // Événements de son antenne
            ]
          }
        ];
      } else {
        where.antennaId = null; // Un membre sans antenne ne voit que le global
      }
    } else if (role === UserRole.ANTENNA_ADMIN) {
      // Un admin d'antenne ne liste que les événements de son antenne
      if (antennaId) {
        where.antennaId = antennaId;
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
          antenna: { select: { name: true } },
          coverImage: { select: { url: true } },
          _count: { select: { attendees: true } } 
        }
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

    // 🔥 CORRECTION CHIRURGICALE : Accès sécurisé à antennaId sur le DTO
    const antennaId = user.role === UserRole.SUPER_ADMIN ? ((dto as any).antennaId || null) : user.memberships[0]?.antennaId;

    return this.prisma.event.create({
      data: {
        associationId: associationId,
        antennaId: antennaId,
        title: dto.title,
        description: dto.description,
        type: (dto.type as EventType) || EventType.OTHER,
        status: (dto.status as EventStatus) || EventStatus.DRAFT,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        locationText: dto.locationText,
        isOnline: dto.isOnline || false,
        meetingLink: dto.meetingLink,
        coverImageId: dto.coverImageId,
      }
    });
  }

  async updateEvent(userId: string, associationId: string, eventId: string, dto: UpdateEventDto) {
    // 🔥 CLOISONNEMENT : On cherche par ID + AssociationId
    const event = await this.prisma.event.findFirst({ 
      where: { id: eventId, associationId: associationId } 
    });
    
    if (!event) throw new NotFoundException('Événement introuvable dans votre association');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { where: { isPrimary: true } } }
    });

    // Sécurité supplémentaire : Un Admin d'antenne ne peut pas modifier un événement d'une autre antenne
    if (user?.role === UserRole.ANTENNA_ADMIN) {
      const adminAntennaId = user.memberships[0]?.antennaId;
      if (event.antennaId !== adminAntennaId) {
        throw new ForbiddenException("Vous n'avez pas le droit de modifier cet événement");
      }
    }

    return this.prisma.event.update({
      where: { id: eventId },
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type as EventType,
        status: dto.status as EventStatus,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        locationText: dto.locationText,
        isOnline: dto.isOnline,
        meetingLink: dto.meetingLink,
        coverImageId: dto.coverImageId,
      }
    });
  }

  async deleteEvent(associationId: string, eventId: string, role: UserRole, userId: string) {
    // 🔥 CLOISONNEMENT : On cherche par ID + AssociationId
    const event = await this.prisma.event.findFirst({ 
      where: { id: eventId, associationId: associationId } 
    });

    if (!event) throw new NotFoundException('Événement introuvable');

    // Vérification de permission d'antenne
    if (role === UserRole.ANTENNA_ADMIN) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { memberships: { where: { isPrimary: true } } }
      });
      if (event.antennaId !== user?.memberships[0]?.antennaId) {
        throw new ForbiddenException("Action non autorisée sur cet événement");
      }
    }

    return this.prisma.event.delete({ where: { id: eventId } });
  }

  // ==========================================
  // PARTICIPATION DES MEMBRES (Présence)
  // ==========================================
  async registerAttendance(userId: string, associationId: string, eventId: string, dto: RegisterAttendanceDto) {
    // 🔥 CLOISONNEMENT : On vérifie que l'événement appartient bien à l'asso du membre
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