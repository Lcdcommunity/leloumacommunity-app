// backend/src/modules/super-admin-activity/super-admin-activity.service.ts
//
// v1.0 — NOUVEAU : deux flux de visibilité (pas de validation) pour le
// dashboard super-admin : réponses de présence aux événements (toutes
// antennes confondues) et historique des communications envoyées. Fichier
// isolé, ne touche ni events.service.ts ni communications.service.ts.
//
// Réponses aux événements : EventAttendance n'a pas d'associationId direct
// — jointure via event.associationId. On exclut le statut INVITED (pas
// encore de décision prise par le membre).
//
// Communications : réutilise ReminderRunLog, déjà rempli par
// CommunicationsService.sendCampaign() (voir details.title/audienceType) —
// aucune nouvelle table, aucune migration.
//
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceStatus, UserRole } from '@prisma/client';

@Injectable()
export class SuperAdminActivityService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveAssociationId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, associationId: true },
    });

    if (!user || (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.SYSTEM_ADMIN)) {
      throw new ForbiddenException('Accès réservé au super administrateur.');
    }
    if (!user.associationId) {
      throw new ForbiddenException('Aucune association associée à ce compte.');
    }
    return user.associationId;
  }

  async listRecentEventResponses(userId: string, take = 10) {
    const associationId = await this.resolveAssociationId(userId);

    const attendances = await this.prisma.eventAttendance.findMany({
      where: {
        status: { not: AttendanceStatus.INVITED },
        event: { associationId },
      },
      orderBy: { updatedAt: 'desc' },
      take,
      select: {
        id: true,
        status: true,
        updatedAt: true,
        user: { select: { id: true, firstName: true, lastName: true } },
        event: {
          select: {
            id: true,
            title: true,
            startsAt: true,
            antennas: { select: { name: true }, take: 1 },
          },
        },
      },
    });

    return attendances.map((a) => ({
      id: a.id,
      status: a.status,
      updatedAt: a.updatedAt.toISOString(),
      memberId: a.user.id,
      memberName: `${a.user.firstName} ${a.user.lastName}`,
      eventId: a.event.id,
      eventTitle: a.event.title,
      eventStartsAt: a.event.startsAt.toISOString(),
      antennaName: a.event.antennas[0]?.name ?? null,
    }));
  }

  async listRecentCommunications(userId: string, take = 10) {
    const associationId = await this.resolveAssociationId(userId);

    const logs = await this.prisma.reminderRunLog.findMany({
      where: { associationId },
      orderBy: { triggeredAt: 'desc' },
      take,
      select: {
        id: true,
        kind: true,
        channel: true,
        recipientsCount: true,
        successCount: true,
        failedCount: true,
        triggeredAt: true,
        details: true,
        antenna: { select: { name: true } },
        triggeredByUser: { select: { firstName: true, lastName: true } },
      },
    });

    return logs.map((log) => {
      const details = (log.details ?? {}) as { title?: string; audienceType?: string };
      return {
        id: log.id,
        title: details.title ?? null,
        audienceType: details.audienceType ?? null,
        kind: log.kind,
        channel: log.channel,
        recipientsCount: log.recipientsCount,
        successCount: log.successCount,
        failedCount: log.failedCount,
        triggeredAt: log.triggeredAt.toISOString(),
        antennaName: log.antenna?.name ?? null,
        sentByName: log.triggeredByUser
          ? `${log.triggeredByUser.firstName} ${log.triggeredByUser.lastName}`
          : null,
      };
    });
  }
}