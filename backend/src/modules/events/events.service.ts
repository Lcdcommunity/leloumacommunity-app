// backend/src/modules/events/events.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto, UpdateEventDto, RegisterAttendanceDto } from './dto/event.dto';
import { EventStatus, UserRole, Prisma, EventType, AttendanceStatus, NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../../common/services/mail.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mailService: MailService,
  ) {}

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

    if (role === UserRole.MEMBER) {
      where.status = EventStatus.PUBLISHED; 

      const memberOrCondition: Prisma.EventWhereInput[] = [
        { antennas: { none: {} } },
        { attendees: { some: { userId: user.id } } }
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
          _count: { select: { attendees: true } },
          attendees: { 
            where: { userId: userId }, 
            select: { status: true } 
          }
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

    const inviteAll = dto.inviteAll !== false; 
    const specificMemberIds: string[] = dto.memberIds || [];

    let attendeesCreation = {};
    if (!inviteAll && specificMemberIds.length > 0) {
      attendeesCreation = {
        create: specificMemberIds.map((mId: string) => ({ userId: mId, status: AttendanceStatus.INVITED }))
      };
    }

    const event = await this.prisma.event.create({
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

    if (event.status === EventStatus.PUBLISHED) {
      await this.notifyEventPublished(
        associationId, 
        event, 
        specificMemberIds, 
        inviteAll, 
        connectAntennas.map(a => a.id)
      );
    }

    return event;
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

    let targetAntennaIds = event.antennas.map(a => a.id);

    if (user?.role === UserRole.SUPER_ADMIN && dto.antennaIds) {
      updateData.antennas = { set: dto.antennaIds.map(id => ({ id })) };
      targetAntennaIds = dto.antennaIds;
    }

    const inviteAll = dto.inviteAll !== false;
    const specificMemberIds: string[] = dto.memberIds || [];

    if (inviteAll === false && specificMemberIds.length > 0) {
      updateData.attendees = {
        deleteMany: {}, 
        create: specificMemberIds.map((mId: string) => ({ userId: mId, status: AttendanceStatus.INVITED })) 
      };
    } else if (inviteAll === true) {
      updateData.attendees = {
        deleteMany: {}
      };
    }

    const updatedEvent = await this.prisma.event.update({
      where: { id: eventId },
      data: updateData
    });

    if (event.status !== EventStatus.PUBLISHED && updatedEvent.status === EventStatus.PUBLISHED) {
      await this.notifyEventPublished(
        associationId, 
        updatedEvent, 
        specificMemberIds, 
        inviteAll, 
        targetAntennaIds
      );
    }

    return updatedEvent;
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

  // ==========================================
  // 🔥 UTILS : PROPULSION DES NOTIFICATIONS (push/in-app + email)
  // ==========================================
  private async notifyEventPublished(
    associationId: string, 
    event: any, 
    specificMemberIds: string[], 
    inviteAll: boolean, 
    antennaIds: string[]
  ) {
    const targetUserIds = new Set<string>();

    if (!inviteAll && specificMemberIds.length > 0) {
      specificMemberIds.forEach(id => targetUserIds.add(id));
    } 
    else if (antennaIds && antennaIds.length > 0) {
      const members = await this.prisma.membership.findMany({
        where: { antennaId: { in: antennaIds }, status: 'APPROVED' },
        select: { userId: true }
      });
      members.forEach(m => targetUserIds.add(m.userId));
    } 
    else {
      const users = await this.prisma.user.findMany({
        where: { associationId, status: 'ACTIVE' },
        select: { id: true }
      });
      users.forEach(u => targetUserIds.add(u.id));
    }

    const notifyPromises = Array.from(targetUserIds).map(userId => 
      this.notifications.createForUserWithPush({
        associationId,
        userId,
        type: NotificationType.EVENT_PUBLISHED,
        title: 'Nouvel événement publié',
        message: `L'événement "${event.title}" a été publié. Vous pouvez dès à présent confirmer votre présence !`,
        pushTitle: '📅 Nouvel événement',
        pushBody: `${event.title} - Vérifiez votre espace pour confirmer votre présence.`,
      }).catch(err => console.error(`[EventsService] Échec notif pour user ${userId}:`, err))
    );

    await Promise.all([
      Promise.all(notifyPromises),
      this.sendEventInvitationEmails(associationId, event, Array.from(targetUserIds)),
    ]);
  }

  // 🔥 AJOUT : envoie l'email de convocation à chaque membre ciblé.
  private async sendEventInvitationEmails(associationId: string, event: any, targetUserIds: string[]) {
    if (targetUserIds.length === 0) return;

    const [association, users] = await Promise.all([
      this.prisma.association.findUnique({
        where: { id: associationId },
        select: {
          name: true,
          legalName: true,
          domainName: true,
          logoFile: { select: { url: true } }
        }
      }),
      this.prisma.user.findMany({
        where: { id: { in: targetUserIds } },
        select: { id: true, email: true, firstName: true, lastName: true }
      })
    ]);

    const associationName = association?.legalName || association?.name || 'votre association';
    const logoUrl = association?.logoFile?.url ?? undefined;
    const associationDomain = association?.domainName ?? undefined;

    const displayTitle = typeof event.title === 'string'
      ? event.title.replace(/^\[.*?\]\s*/, '')
      : event.title;

    const emailPromises = users
      .filter(u => !!u.email)
      .map(u =>
        this.mailService.sendEventInvitation({
          to: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          associationName,
          eventTitle: displayTitle,
          eventType: event.type, // 🔥 AJOUT : nécessaire pour construire "à une réunion" / "à une assemblée générale" / etc.
          eventDescription: event.description,
          startsAt: event.startsAt,
          isOnline: event.isOnline,
          meetingLink: event.meetingLink,
          locationText: event.locationText,
          logoUrl,
          associationDomain,
        }).catch(err => console.error(`[EventsService] Échec email d'invitation pour user ${u.id}:`, err))
      );

    await Promise.all(emailPromises);
  }
}