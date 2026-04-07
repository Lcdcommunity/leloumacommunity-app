// backend/src/modules/preferences/preferences.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async update(
    userId: string,
    associationId: string,
    dto: UpdatePreferencesDto,
  ): Promise<{ ok: boolean; preferences: Record<string, unknown> }> {
    // Vérifie que l'utilisateur existe et appartient à l'association
    const user = await this.prisma.user.findFirst({
      where: { id: userId, associationId },
      include: { preferences: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Upsert des préférences directement dans le modèle UserPreference
    const preferences = await this.prisma.userPreference.upsert({
      where: { userId },
      create: {
        userId,
        emailNotifications: dto.emailNotifications ?? true,
        smsNotifications: dto.smsNotifications ?? false,
        pushNotifications: dto.pushNotifications ?? false,
        language: dto.language ?? 'fr',
        theme: dto.theme ?? 'system',
      },
      update: {
        ...(dto.emailNotifications !== undefined && {
          emailNotifications: dto.emailNotifications,
        }),
        ...(dto.smsNotifications !== undefined && {
          smsNotifications: dto.smsNotifications,
        }),
        ...(dto.pushNotifications !== undefined && {
          pushNotifications: dto.pushNotifications,
        }),
        ...(dto.language !== undefined && { language: dto.language }),
        ...(dto.theme !== undefined && { theme: dto.theme }),
      },
    });

    return {
      ok: true,
      preferences: {
        emailNotifications: preferences.emailNotifications,
        smsNotifications: preferences.smsNotifications,
        pushNotifications: preferences.pushNotifications,
        language: preferences.language,
        theme: preferences.theme,
      },
    };
  }

  async get(
    userId: string,
    associationId: string,
  ): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, associationId },
      include: { preferences: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Si les préférences existent déjà en base
    if (user.preferences) {
      return {
        emailNotifications: user.preferences.emailNotifications,
        smsNotifications: user.preferences.smsNotifications,
        pushNotifications: user.preferences.pushNotifications,
        language: user.preferences.language,
        theme: user.preferences.theme,
      };
    }

    // Valeurs par défaut si l'utilisateur n'a pas encore de préférences enregistrées
    return {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: false,
      language: 'fr',
      theme: 'system',
    };
  }
}