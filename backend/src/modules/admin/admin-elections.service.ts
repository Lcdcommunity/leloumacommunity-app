/////// backend/src/modules/admin/admin-elections.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminElectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listElections(associationId: string) {
    return this.prisma.election.findMany({
      where: { associationId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { positions: true } }
      }
    });
  }
}