//backend/src/modules/associations/associations.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AssociationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent() {
    const assoc = await this.prisma.association.findFirst();
    if (!assoc) throw new NotFoundException("Association non configurée.");
    return assoc;
  }

  async updateCurrent(data: any) {
    const assoc = await this.getCurrent();
    return this.prisma.association.update({
      where: { id: assoc.id },
      data,
    });
  }
}