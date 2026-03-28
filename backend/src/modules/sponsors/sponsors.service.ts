// backend/src/modules/sponsors/sponsors.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSponsorDto, UpdateSponsorDto } from './dto/sponsor.dto';

@Injectable()
export class SponsorsService {
  constructor(private readonly prisma: PrismaService) {}

  async listSponsors(associationId: string) {
    const [total, items] = await Promise.all([
      this.prisma.sponsor.count({ where: { associationId } }),
      this.prisma.sponsor.findMany({
        where: { associationId },
        orderBy: { createdAt: 'desc' },
        include: {
          logoFile: {
            select: { url: true, originalFilename: true }
          }
        }
      })
    ]);
    
    // On simule une pagination (même si on ramène tout pour l'instant)
    return { items, total, page: 1, pageSize: 100 };
  }

  async createSponsor(associationId: string, dto: CreateSponsorDto) {
    return this.prisma.sponsor.create({
      data: {
        associationId,
        name: dto.name,
        websiteUrl: dto.websiteUrl,
        contactEmail: dto.contactEmail,
        logoFileId: dto.logoFileId,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateSponsor(associationId: string, sponsorId: string, dto: UpdateSponsorDto) {
    const sponsor = await this.prisma.sponsor.findFirst({
      where: { id: sponsorId, associationId }
    });

    if (!sponsor) throw new NotFoundException('Sponsor introuvable.');

    return this.prisma.sponsor.update({
      where: { id: sponsorId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.websiteUrl !== undefined && { websiteUrl: dto.websiteUrl }),
        ...(dto.contactEmail !== undefined && { contactEmail: dto.contactEmail }),
        ...(dto.logoFileId !== undefined && { logoFileId: dto.logoFileId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteSponsor(associationId: string, sponsorId: string) {
    const sponsor = await this.prisma.sponsor.findFirst({
      where: { id: sponsorId, associationId }
    });

    if (!sponsor) throw new NotFoundException('Sponsor introuvable.');

    return this.prisma.sponsor.delete({
      where: { id: sponsorId }
    });
  }
}