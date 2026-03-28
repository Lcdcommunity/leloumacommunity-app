// backend/src/modules/events/events.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto, UpdateEventDto, RegisterAttendanceDto } from './dto/event.dto';
import { EventStatus, UserRole } from '@prisma/client';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // LECTURE DES ÉVÉNEMENTS (Admins & Membres)
  // ==========================================
  async listEvents(userId: string, role: UserRole, page = 1, pageSize = 20, status?: string, type?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { where: { isPrimary: true } } }
    });

    if (!user) throw new NotFoundException("Utilisateur introuvable");

    const antennaId = user.memberships[0]?.antennaId;

    // Filtres de base
    const where: any = {
      associationId: user.associationId,
      ...(status ? { status: status as EventStatus } : {}),
      ...(type ? { type } : {})
    };

    // Restrictions selon le rôle
    if (role === UserRole.MEMBER) {
      where.status = EventStatus.PUBLISHED; // Un membre ne voit que ce qui est publié
      if (antennaId) {
        where.OR = [
          { antennaId: null }, // Événements globaux de l'association
          { antennaId: antennaId } // Événements de son antenne
        ];
      }
    } else if (role === UserRole.ANTENNA_ADMIN) {
      if (antennaId) where.antennaId = antennaId;
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
          _count: { select: { attendees: true } } // Nombre total d'inscrits
        }
      })
    ]);

    return { items, total, page, pageSize };
  }

  // ==========================================
  // GESTION PAR LES ADMINS (Créer, Modifier, Supprimer)
  // ==========================================
  async createEvent(userId: string, dto: CreateEventDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { where: { isPrimary: true } } }
    });

    const antennaId = user.role === UserRole.SUPER_ADMIN ? null : user.memberships[0]?.antennaId;

    return this.prisma.event.create({
      data: {
        associationId: user.associationId,
        antennaId: antennaId,
        title: dto.title,
        description: dto.description,
        type: dto.type || 'OTHER',
        status: dto.status || 'DRAFT',
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        locationText: dto.locationText,
        isOnline: dto.isOnline || false,
        meetingLink: dto.meetingLink,
        coverImageId: dto.coverImageId,
      }
    });
  }

  async updateEvent(userId: string, eventId: string, dto: UpdateEventDto) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Événement introuvable');

    return this.prisma.event.update({
      where: { id: eventId },
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        status: dto.status,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        locationText: dto.locationText,
        isOnline: dto.isOnline,
        meetingLink: dto.meetingLink,
        coverImageId: dto.coverImageId,
      }
    });
  }

  async deleteEvent(eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Événement introuvable');

    return this.prisma.event.delete({ where: { id: eventId } });
  }

  // ==========================================
  // PARTICIPATION DES MEMBRES (Présence)
  // ==========================================
  async registerAttendance(userId: string, eventId: string, dto: RegisterAttendanceDto) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
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