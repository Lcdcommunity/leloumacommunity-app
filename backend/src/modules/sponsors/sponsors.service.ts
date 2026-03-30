// backend/src/modules/sponsors/sponsors.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSponsorDto, UpdateSponsorDto } from './dto/sponsor.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SponsorsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liste les sponsors d'une association avec pagination.
   */
  async listSponsors(associationId: string, page = 1, pageSize = 100) {
    const skip = (page - 1) * pageSize;
    const where: Prisma.SponsorWhereInput = { associationId };

    const [total, items] = await Promise.all([
      this.prisma.sponsor.count({ where }),
      this.prisma.sponsor.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          logoFile: {
            select: { url: true, originalFilename: true }
          }
        }
      })
    ]);
    
    return { 
      items, 
      total, 
      page, 
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * Crée un nouveau partenaire sponsor.
   */
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

  /**
   * Met à jour un sponsor (avec vérification de propriété).
   */
  async updateSponsor(associationId: string, sponsorId: string, dto: UpdateSponsorDto) {
    // On vérifie d'abord l'existence et l'appartenance
    const sponsor = await this.prisma.sponsor.findFirst({
      where: { id: sponsorId, associationId }
    });

    if (!sponsor) throw new NotFoundException('Sponsor introuvable dans votre association.');

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

  /**
   * Supprime définitivement un sponsor.
   */
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