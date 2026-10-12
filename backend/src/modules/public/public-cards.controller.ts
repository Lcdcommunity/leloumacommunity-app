// backend/src/modules/public/public-cards.controller.ts
//
// v1.0 — 🔥 NOUVEAU (correctif) : GET /api/public/cards/:token.
//   Le front (api.verifyPublicCard → page /verify-card/[token], cible du QR code
//   imprimé sur la carte membre) appelait cette route, mais elle n'existait pas
//   côté backend : tout scan de QR code retournait « QR Code invalide ».
//   Contrôleur isolé (aucune modification de public.controller.ts / service).
//
//   Données volontairement MINIMALES (route sans authentification) : numéro de
//   carte, statut, date d'expiration, antenne, prénom, nom et photo. Jamais de
//   date/lieu de naissance, adresse, e-mail, téléphone ni identifiants internes.
//   Quota par IP pour limiter l'énumération de jetons (le qrToken est un UUID v4,
//   donc non devinable en pratique).
//
import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../../prisma/prisma.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller('public/cards')
export class PublicCardsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':token')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async verify(@Param('token') token: string) {
    // Réponse identique pour « format invalide » et « jeton inconnu » : on ne
    // révèle rien sur ce qui existe en base.
    if (!UUID_RE.test(token)) {
      throw new NotFoundException('Carte introuvable.');
    }

    const card = await this.prisma.virtualCard.findUnique({
      where: { qrToken: token },
      select: {
        cardNumber: true,
        isLocked: true,
        expiresAt: true,
        qrToken: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            profilePhoto: { select: { url: true } },
            memberships: {
              select: { antenna: { select: { name: true } } },
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
              take: 1,
            },
          },
        },
      },
    });

    if (!card) {
      throw new NotFoundException('Carte introuvable.');
    }

    return {
      cardNumber: card.cardNumber,
      isLocked: card.isLocked,
      expiresAt: card.expiresAt ? card.expiresAt.toISOString() : null,
      qrToken: card.qrToken,
      antennaName: card.user.memberships[0]?.antenna?.name ?? 'Inconnue',
      user: {
        firstName: card.user.firstName,
        lastName: card.user.lastName,
        profilePhotoUrl: card.user.profilePhoto?.url ?? null,
      },
    };
  }
}
