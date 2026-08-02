// backend/src/modules/associations/associations.service.ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';
import { UpdateAssociationDto } from './dto/update-association.dto';

@Injectable()
export class AssociationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async getCurrent(associationId: string | null) {
    if (!associationId) {
      throw new ForbiddenException("Ce compte n'est rattaché à aucune association.");
    }
    const assoc = await this.prisma.association.findUnique({
      where: { id: associationId },
      include: { logoFile: true },
    });
    if (!assoc) throw new NotFoundException('Association introuvable.');
    return assoc;
  }

  async updateCurrent(associationId: string | null, data: UpdateAssociationDto) {
    const assoc = await this.getCurrent(associationId);

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
        // 🔥 CORRECTION : plus besoin de `as CurrencyCode` — le DTO valide
        // désormais la valeur via @IsEnum(CurrencyCode), data.defaultCurrency
        // est déjà correctement typé CurrencyCode ici.
        ...(data.defaultCurrency !== undefined ? { defaultCurrency: data.defaultCurrency } : {}),
        ...(data.originLocalities !== undefined ? { originLocalities: data.originLocalities } : {}),
        // 🔒 isActive : volontairement absent (SYSTEM_ADMIN uniquement).
        // 🔒 expenseValidationThreshold : volontairement absent — concept
        // exclusivement par devise désormais (table Pricing), voir
        // expenses.service.ts. La colonne reste en base mais n'est plus
        // jamais écrite ni lue par l'application.
        ...(data.logoFileId !== undefined ? { logoFileId: data.logoFileId } : {}),
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