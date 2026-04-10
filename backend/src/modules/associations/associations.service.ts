// backend/src/modules/associations/associations.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, CurrencyCode } from '@prisma/client';
import { UpdateAssociationDto } from './dto/update-association.dto';

@Injectable()
export class AssociationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async getCurrent() {
    const assoc = await this.prisma.association.findFirst({
      include: { logoFile: true },
    });
    if (!assoc) throw new NotFoundException("Association non configurée.");
    return assoc;
  }

  async updateCurrent(data: UpdateAssociationDto) {
    const assoc = await this.getCurrent();

    // ✅ Nous avons retiré la tentative de sauvegarde de "foundedAt" 
    // car ce champ n'existe pas dans le modèle Prisma Association.

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
        ...(data.defaultCurrency !== undefined ? { defaultCurrency: data.defaultCurrency as CurrencyCode } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        
        // 🔥 L'AJOUT FINAL EST ICI ! On dit au service de sauvegarder le seuil dans Prisma
        ...(data.expenseValidationThreshold !== undefined ? { expenseValidationThreshold: data.expenseValidationThreshold } : {}),
      },
    });

    await this.notifications.notifySuperAdmins(
      updated.id,
      `Les informations générales de l'association "${updated.name}" ont été mises à jour.`,
      NotificationType.SYSTEM_ALERT,
    );

    return updated;
  }
}