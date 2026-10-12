// backend/src/modules/super-admin/super-admin-projects.controller.ts
//
// v1.0 — 🔥 NOUVEAU (correctif) : POST /api/super-admin/projects.
//   Le front (api.createProject → super-admin/projects/page.tsx et
//   components/projects/ProjectModal.tsx) appelle cette route, mais seules
//   GET / PATCH / DELETE existaient côté SuperAdminController : « Créer un
//   projet » depuis le compte Super Admin renvoyait une 404. Contrôleur isolé
//   (aucune modification de super-admin.controller.ts / service) ; mêmes champs
//   et mêmes conversions de statut que admin.service.ts::createProject.
//   Cloisonnement : associationId vient du JWT ; un antennaId éventuel doit
//   appartenir à l'association.
//
import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Prisma, ProjectStatus, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

function toMoney(value: unknown, label: string): Prisma.Decimal | null {
  if (value === undefined || value === null || value === '') return null;
  const n = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  if (!Number.isFinite(n) || n < 0 || n >= 1e12) {
    throw new BadRequestException(`${label} : montant invalide.`);
  }
  return new Prisma.Decimal(n.toFixed(2));
}

function toDate(value: unknown, label: string): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) throw new BadRequestException(`${label} : date invalide.`);
  return d;
}

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN)
export class SuperAdminProjectsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('projects')
  async createProject(@Body() data: any, @CurrentUser() actor: AuthUser) {
    const title = typeof data?.title === 'string' ? data.title.trim() : '';
    if (!title) throw new BadRequestException('Le titre du projet est obligatoire.');

    let safeStatus = data.status;
    if (safeStatus === 'DRAFT') safeStatus = ProjectStatus.PROPOSED;
    if (safeStatus === 'PENDING_APPROVAL') safeStatus = ProjectStatus.UNDER_REVIEW;
    if (safeStatus === 'SUSPENDED') safeStatus = ProjectStatus.ON_HOLD;
    if (safeStatus && !(Object.values(ProjectStatus) as string[]).includes(safeStatus)) {
      throw new BadRequestException('Statut de projet invalide.');
    }

    let antennaId: string | null = null;
    if (data.antennaId) {
      const antenna = await this.prisma.antenna.findFirst({
        where: { id: String(data.antennaId), associationId: actor.associationId },
        select: { id: true },
      });
      if (!antenna) throw new BadRequestException('Antenne introuvable dans votre association.');
      antennaId = antenna.id;
    }

    const photoIds: string[] = Array.isArray(data.photoIds)
      ? data.photoIds.filter((x: unknown): x is string => typeof x === 'string')
      : [];

    return this.prisma.project.create({
      data: {
        associationId: actor.associationId,
        antennaId,
        title,
        summary: data.summary,
        description: data.description ?? data.summary ?? '',
        locationText: data.locationText,
        promoterName: data.promoterName,
        targetBeneficiaries: data.targetBeneficiaries,
        populationImpact: data.populationImpact,
        environmentalImpact: data.environmentalImpact,
        implementationMethod: data.implementationMethod,
        risksAndMitigation: data.risksAndMitigation,
        specificObjectives: data.specificObjectives,
        expectedResults: data.expectedResults,
        successIndicators: data.successIndicators,
        startDate: toDate(data.startsAt, 'Date de début'),
        endDate: toDate(data.endsAt, 'Date de fin'),
        status: safeStatus || ProjectStatus.APPROVED,
        createdByUserId: actor.id,
        budgetAmount: toMoney(data.budgetPlanned, 'Budget prévu'),
        amountSpent: toMoney(data.budgetSpent, 'Montant dépensé') ?? new Prisma.Decimal(0),
        attachments: {
          create: photoIds.map((fileId) => ({ fileId })),
        },
      },
    });
  }
}
