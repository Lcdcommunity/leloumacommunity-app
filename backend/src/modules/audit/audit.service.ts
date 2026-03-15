//src/modules/audit/audit.service.ts
import { Injectable } from '@nestjs/common';
import { AuditAction, AuditActorType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type AuditLogInput = {
  associationId: string;
  antennaId?: string;
  actorType?: AuditActorType;
  actorUserId?: string;
  action: AuditAction;
  targetModel: string;
  targetId?: string;
  targetUserId?: string;
  summary?: string;
  metadata?: Prisma.InputJsonValue;
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
        actorType: input.actorType ?? AuditActorType.USER,
        actorUserId: input.actorUserId,
        action: input.action,
        targetModel: input.targetModel,
        targetId: input.targetId,
        targetUserId: input.targetUserId,
        summary: input.summary,
        metadata: input.metadata,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  async log(input: AuditLogInput): Promise<void> {
    await this.create(input);
  }
}