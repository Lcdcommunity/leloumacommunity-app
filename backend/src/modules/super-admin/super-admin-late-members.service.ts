// backend/src/modules/super-admin/super-admin-late-members.service.ts
//
// Fichier isolé (cf. convention du projet : nouvelles fonctionnalités dans
// des fichiers indépendants) pour l'export "Retardataires" du Super Admin
// (super-admin/members/page.tsx, modale d'export PDF/Excel). Reprend le
// même couple buildCoveredMonths/computeLateMonths que member.service.ts,
// dashboard-member.service.ts et admin.service.ts (pattern déjà dupliqué
// à plusieurs endroits de ce code plutôt que factorisé — on suit le même
// choix ici pour rester cohérent et ne rien casser d'existant).
//
// Contrairement à admin.service.ts::listLateMembers (scope antennaIds
// obligatoire d'un admin d'antenne), ici pas de restriction : le Super
// Admin voit par défaut TOUTES les antennes de son association, avec un
// filtre antennaId optionnel pour restreindre à une seule antenne — c'est
// ce paramètre qui alimente le sélecteur "Filtrer par Antenne" déjà
// présent dans la modale d'export de super-admin/members/page.tsx.
//
// Seuil retenu : 1 mois de retard (même seuil que admin.service.ts::
// listLateMembers, qui sert déjà à la relance précoce par les admins/super
// admin) — pas le seuil "communautaire" de 3 mois de member.service.ts.
//
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UserRole,
  UserStatus,
  ContributionStatus,
  ContributionPurpose,
} from '@prisma/client';

// ─── Helpers retard (identiques à member.service.ts / admin.service.ts /
//   dashboard-member.service.ts — pattern dupliqué volontairement) ────────
function buildCoveredMonths(
  contributions: Array<{
    monthReference: number | null;
    yearReference: number | null;
    validatedAt: Date | null;
    createdAt: Date;
    amount?: unknown;
  }>,
  monthlyPrice: number,
): Set<string> {
  const covered = new Set<string>();

  for (const c of contributions) {
    const amt = c.amount != null ? Number(c.amount) : 0;

    const numMonths =
      monthlyPrice > 0 && amt > 0
        ? Math.min(48, Math.max(1, Math.floor(amt / monthlyPrice)))
        : 1;

    let m: number;
    let y: number;

    if (c.monthReference && c.yearReference) {
      m = c.monthReference;
      y = c.yearReference;
    } else {
      const d = new Date(c.validatedAt ?? c.createdAt);
      m = d.getMonth() + 1;
      y = d.getFullYear();
    }

    for (let i = 0; i < numMonths; i++) {
      covered.add(`${y}-${String(m).padStart(2, '0')}`);
      m++;
      if (m > 12) { m = 1; y++; }
    }
  }

  return covered;
}

function computeLateMonths(
  coveredMonths: Set<string>,
  joinDate: Date,
  maxLookback = 24,
): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let lateMonths = 0;
  let checkMonth = currentMonth - 1;
  let checkYear = currentYear;

  if (checkMonth < 1) {
    checkMonth = 12;
    checkYear--;
  }

  for (let i = 0; i < maxLookback; i++) {
    const key = `${checkYear}-${String(checkMonth).padStart(2, '0')}`;
    const monthStart = new Date(checkYear, checkMonth - 1, 1);

    if (monthStart < new Date(joinDate.getFullYear(), joinDate.getMonth(), 1))
      break;

    if (!coveredMonths.has(key)) lateMonths++;

    checkMonth--;
    if (checkMonth < 1) { checkMonth = 12; checkYear--; }
  }

  return lateMonths;
}

export interface SuperAdminLateMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  antennaId: string | null;
  antennaName: string | null;
  currency: string;
  lateMonths: number;
}

@Injectable()
export class SuperAdminLateMembersService {
  constructor(private readonly prisma: PrismaService) {}

  private async getPricingMap(
    associationId: string,
  ): Promise<Record<string, { monthlyQuota: number }>> {
    const rows = await this.prisma.pricing.findMany({ where: { associationId } });
    const map: Record<string, { monthlyQuota: number }> = {};
    for (const p of rows) {
      map[p.currency] = { monthlyQuota: Number(p.monthlyQuota) };
    }
    return map;
  }

  async listLateMembers(
    associationId: string,
    antennaId?: string,
  ): Promise<SuperAdminLateMember[]> {
    const [users, allPricing] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          associationId,
          status: UserStatus.ACTIVE,
          role: UserRole.MEMBER,
          ...(antennaId ? { memberships: { some: { antennaId } } } : {}),
        },
        orderBy: { lastName: 'asc' },
        include: {
          contributions: {
            where: {
              status: ContributionStatus.VALIDATED,
              purpose: {
                in: [ContributionPurpose.REGULAR_QUOTA, ContributionPurpose.LATE_QUOTA],
              },
            },
            select: {
              monthReference: true,
              yearReference: true,
              validatedAt: true,
              createdAt: true,
              amount: true,
            },
          },
          // Si un antennaId est fourni (filtre "par antenne"), on va chercher
          // précisément cette ligne de rattachement. Sinon (vue globale),
          // on retombe sur la ligne isPrimary, comme partout ailleurs dans
          // ce code (admin.service.ts, member.service.ts).
          memberships: {
            where: antennaId ? { antennaId } : { isPrimary: true },
            take: 1,
            select: { antenna: { select: { id: true, name: true, defaultCurrency: true } } },
          },
        },
      }),
      this.getPricingMap(associationId),
    ]);

    const lateMembers: SuperAdminLateMember[] = users
      .map((u) => {
        const antenna = u.memberships[0]?.antenna;
        const antCurrency = antenna?.defaultCurrency ?? 'EUR';
        const monthlyPrice =
          Number(allPricing[antCurrency]?.monthlyQuota) ||
          Number(allPricing['EUR']?.monthlyQuota) ||
          0;
        const covered = buildCoveredMonths(u.contributions, monthlyPrice);
        const referenceDate = u.approvedAt || u.createdAt;
        const lateMonths = computeLateMonths(covered, referenceDate);

        return {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          phone: u.phone,
          role: u.role,
          status: u.status,
          createdAt: u.createdAt.toISOString(),
          antennaId: antenna?.id ?? null,
          antennaName: antenna?.name ?? null,
          currency: antCurrency,
          lateMonths,
        };
      })
      .filter((m) => m.lateMonths >= 1)
      .sort((a, b) => b.lateMonths - a.lateMonths);

    return lateMembers;
  }
}