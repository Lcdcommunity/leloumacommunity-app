// backend/src/modules/audit/audit.service.ts
import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type AuditLogInput = {
  associationId?: string;
  antennaId?: string;
  actorUserId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  targetUserId?: string;
  details: Prisma.InputJsonValue;
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

  /**
   * 🔥 CORRECTION CHIRURGICALE : Isolation AND + Pagination native
   */
  async list(filters: { 
    associationId: string; 
    antennaId?: string; 
    page: number; 
    pageSize: number 
  }) {
    const skip = (filters.page - 1) * filters.pageSize;

    // Construction du filtre strict : Toujours filtrer par associationId
    const where: Prisma.AuditLogWhereInput = {
      associationId: filters.associationId,
      ...(filters.antennaId ? { antennaId: filters.antennaId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: filters.pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          actorUser: { select: { firstName: true, lastName: true } },
          antenna: { select: { name: true } } // Ajout utile pour l'admin
        }
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return {
      items,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages: Math.ceil(total / filters.pageSize)
    };
  }
}