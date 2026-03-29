// backend/src/modules/audit/audit.service.ts
import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client'; // Supprimé AuditActorType qui n'est plus dans le modèle
import { PrismaService } from '../../prisma/prisma.service';

export type AuditLogInput = {
  associationId?: string;
  antennaId?: string;
  actorUserId?: string;
  action: AuditAction;
  entity: string;         // Renommé (était targetModel)
  entityId?: string;      // Renommé (était targetId)
  targetUserId?: string;
  details: Prisma.InputJsonValue; // Renommé (était metadata)
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: AuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        associationId: input.associationId,
        antennaId: input.antennaId,
        actorUserId: input.actorUserId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        targetUserId: input.targetUserId,
        details: input.details,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  async log(input: AuditLogInput): Promise<void> {
    await this.create(input);
  }

  // Ajout de la méthode list() pour que le contrôleur fonctionne
  async list(filters: { associationId?: string; antennaId?: string }) {
    return this.prisma.auditLog.findMany({
      where: {
        OR: [
          { associationId: filters.associationId },
          { antennaId: filters.antennaId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        actorUser: { select: { firstName: true, lastName: true } }
      }
    });
  }
}