// backend/src/modules/associations/associations.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class AssociationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService, // Injecté chirurgicalement
  ) {}

  /**
   * Récupère les informations de l'association actuelle.
   */
  async getCurrent() {
    const assoc = await this.prisma.association.findFirst({
      include: { logoFile: true }, // Inclusion du logo pour le front
    });
    if (!assoc) throw new NotFoundException("Association non configurée.");
    return assoc;
  }

  /**
   * Met à jour les paramètres globaux de l'association.
   */
  async updateCurrent(data: any) {
    const assoc = await this.getCurrent();
    
    const updated = await this.prisma.association.update({
      where: { id: assoc.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.legalName !== undefined ? { legalName: data.legalName } : {}),
        ...(data.registrationNumber !== undefined ? { registrationNumber: data.registrationNumber } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.websiteUrl !== undefined ? { websiteUrl: data.websiteUrl } : {}),
        ...(data.country !== undefined ? { country: data.country } : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(data.addressLine1 !== undefined ? { addressLine1: data.addressLine1 } : {}),
        ...(data.addressLine2 !== undefined ? { addressLine2: data.addressLine2 } : {}),
        ...(data.postalCode !== undefined ? { postalCode: data.postalCode } : {}),
        ...(data.defaultCurrency !== undefined ? { defaultCurrency: data.defaultCurrency } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.logoFileId !== undefined ? { logoFileId: data.logoFileId } : {}),
      },
    });

    // ✅ NOTIFICATION : Alerter les Super Admins du changement de configuration globale
    await this.notifications.notifySuperAdmins(
      updated.id,
      `Les informations générales de l'association "${updated.name}" ont été mises à jour.`,
      NotificationType.SYSTEM_ALERT,
    );

    return updated;
  }
}