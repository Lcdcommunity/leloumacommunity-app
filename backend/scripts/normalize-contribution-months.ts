// backend/scripts/normalize-contribution-months.ts
//
// Script ponctuel (à lancer une fois, pas un module Nest branché sur une
// route) : réaligne les cotisations validées (REGULAR_QUOTA + LATE_QUOTA)
// de chaque membre pour qu'elles démarrent en JANVIER de leur année,
// au lieu de rester ancrées sur le mois où le versement a été soumis.
//
// Objectif concret : un membre qui a réglé l'équivalent d'une année
// complète (ex. 24€ à 2€/mois) ne doit plus jamais apparaître "en retard"
// pour les mois de la même année précédant la date de son paiement.
// S'il a payé plus qu'une année pleine (ex. 26€), l'excédent (2€) déborde
// naturellement sur janvier de l'année suivante — c'est-à-dire qu'il est
// traité par défaut comme un paiement anticipé, PAS comme un don. Le
// script ne peut pas demander individuellement à chaque membre s'il
// préfère un don : il signale simplement (liste en fin d'exécution) les
// membres concernés par un tel excédent, à toi de décider au cas par cas
// si l'un d'eux doit être reclassé manuellement en DONATION.
//
// ── Garanties de sécurité financière ──────────────────────────────────────
// Ce script NE TOUCHE JAMAIS : amount, ledgerEntryId, purpose, status, ni
// aucun autre champ. Il ne crée, ne supprime, ni ne fusionne aucune ligne.
// Seuls monthReference/yearReference sont réécrits sur les lignes
// existantes. Comme LedgerService.getBalances() ne lit que LedgerEntry
// (jamais Contribution.amount directement), les soldes ne sont affectés
// en aucune façon par ce script.
//
// ── Usage ───────────────────────────────────────────────────────────────
//   cd backend
//   npx ts-node scripts/normalize-contribution-months.ts --associationId=XXX
//     → DRY-RUN : affiche ce qui serait changé, n'écrit rien.
//
//   npx ts-node scripts/normalize-contribution-months.ts --associationId=XXX --apply
//     → applique réellement les changements.
//
//   Ajoutez --memberId=YYY pour tester sur un seul membre d'abord
//   (fortement recommandé avant un --apply global — essayez sur Thierno).
//
import 'dotenv/config';
import { PrismaClient, ContributionPurpose, ContributionStatus, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const QUOTA_PURPOSES = [ContributionPurpose.REGULAR_QUOTA, ContributionPurpose.LATE_QUOTA];

type PlanRow = {
  contributionId: string;
  amount: number;
  oldMonth: number | null;
  oldYear: number | null;
  newMonth: number;
  newYear: number;
  monthsGranted: number;
};

type MemberPlan = {
  userId: string;
  name: string;
  currency: string;
  monthlyPrice: number;
  rows: PlanRow[];
  excessFlag: boolean; // au moins une ligne déborde sur l'année suivante
};

// Même formule que buildCoveredMonths() côté backend (member.service.ts /
// admin.service.ts / dashboard-member.service.ts) — gardée identique pour
// que la reconstruction corresponde exactement à ce que le calcul de
// retard produira ensuite.
function computeMonthsGranted(amount: number, monthlyPrice: number): number {
  if (monthlyPrice <= 0 || amount <= 0) return 1;
  return Math.min(48, Math.max(1, Math.floor(amount / monthlyPrice)));
}

async function getPricingMap(associationId: string): Promise<Record<string, number>> {
  const rows = await prisma.pricing.findMany({ where: { associationId } });
  const map: Record<string, number> = {};
  for (const p of rows) map[p.currency] = Number(p.monthlyQuota);
  return map;
}

async function buildPlan(associationId: string, memberId?: string): Promise<MemberPlan[]> {
  const pricingMap = await getPricingMap(associationId);

  const members = await prisma.user.findMany({
    where: {
      associationId, // 🔒 Cloisonné
      role: UserRole.MEMBER,
      ...(memberId ? { id: memberId } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      memberships: {
        where: { isPrimary: true },
        take: 1,
        select: { antenna: { select: { defaultCurrency: true } } },
      },
      contributions: {
        where: {
          associationId, // 🔒 Cloisonné
          status: ContributionStatus.VALIDATED,
          purpose: { in: QUOTA_PURPOSES },
        },
        select: {
          id: true,
          amount: true,
          monthReference: true,
          yearReference: true,
          validatedAt: true,
          createdAt: true,
        },
      },
    },
  });

  const plans: MemberPlan[] = [];

  for (const u of members) {
    if (u.contributions.length === 0) continue;

    const currency = u.memberships[0]?.antenna?.defaultCurrency ?? 'EUR';
    const monthlyPrice = pricingMap[currency] ?? 0;
    if (monthlyPrice <= 0) {
      console.warn(`⚠️  ${u.firstName} ${u.lastName} (${u.id}) : pas de tarif configuré pour ${currency}, ignoré.`);
      continue;
    }

    // Tri chronologique : respecte l'intention d'origine (monthReference/
    // yearReference déjà posés) ; repli sur validatedAt/createdAt sinon.
    const sorted = [...u.contributions].sort((a, b) => {
      const refDateA = a.validatedAt ?? a.createdAt;
      const refDateB = b.validatedAt ?? b.createdAt;
      const aKey = a.yearReference && a.monthReference
        ? a.yearReference * 100 + a.monthReference
        : refDateA.getFullYear() * 100 + (refDateA.getMonth() + 1);
      const bKey = b.yearReference && b.monthReference
        ? b.yearReference * 100 + b.monthReference
        : refDateB.getFullYear() * 100 + (refDateB.getMonth() + 1);
      if (aKey !== bKey) return aKey - bKey;
      return refDateA.getTime() - refDateB.getTime();
    });

    // Année de départ : la plus ancienne année vue chez ce membre (via
    // monthReference/yearReference existant, sinon validatedAt/createdAt).
    const first = sorted[0];
    const firstRefDate = first.validatedAt ?? first.createdAt;
    const startYear = first.yearReference ?? firstRefDate.getFullYear();

    let cursorMonth = 1;
    let cursorYear = startYear;
    let excessFlag = false;
    const rows: PlanRow[] = [];

    for (const c of sorted) {
      const amount = Number(c.amount);
      const monthsGranted = computeMonthsGranted(amount, monthlyPrice);

      const rowStartMonth = cursorMonth;
      const rowStartYear = cursorYear;

      rows.push({
        contributionId: c.id,
        amount,
        oldMonth: c.monthReference,
        oldYear: c.yearReference,
        newMonth: rowStartMonth,
        newYear: rowStartYear,
        monthsGranted,
      });

      // 🔥 CORRIGÉ : un versement est un excédent réel si (a) il démarre
      // dans une année postérieure à la toute première année de ce membre
      // (donc déjà de l'argent au-delà d'une première année pleine), ou
      // (b) sa propre couverture dépasse décembre de l'année où IL
      // démarre. Sans ce 2e critère isolé par ligne, un simple versement
      // de 12 mois pile depuis janvier (ex. 24€ à 2€/mois) était compté à
      // tort comme "excédent" — son curseur de FIN atterrit en janvier de
      // l'année suivante (prêt pour le PROCHAIN versement), ce qui ne veut
      // pas dire que CE versement-là déborde.
      const lastCoveredMonthIndex = rowStartMonth - 1 + monthsGranted;
      if (rowStartYear > startYear || lastCoveredMonthIndex > 12) {
        excessFlag = true;
      }

      cursorMonth += monthsGranted;
      while (cursorMonth > 12) { cursorMonth -= 12; cursorYear++; }
    }


    plans.push({
      userId: u.id,
      name: `${u.firstName} ${u.lastName}`,
      currency,
      monthlyPrice,
      rows,
      excessFlag,
    });
  }

  return plans;
}

async function main() {
  const args = process.argv.slice(2);
  const associationId = args.find(a => a.startsWith('--associationId='))?.split('=')[1];
  const memberId = args.find(a => a.startsWith('--memberId='))?.split('=')[1];
  const apply = args.includes('--apply');

  if (!associationId) {
    console.error('Usage : ts-node scripts/normalize-contribution-months.ts --associationId=XXX [--memberId=YYY] [--apply]');
    process.exit(1);
  }

  const plans = await buildPlan(associationId, memberId);

  const withChanges = plans.filter(p =>
    p.rows.some(r => r.oldMonth !== r.newMonth || r.oldYear !== r.newYear),
  );

  console.log(`\n${plans.length} membre(s) avec des cotisations analysées, ${withChanges.length} à réaligner.\n`);

  const excessMembers: MemberPlan[] = [];

  for (const plan of withChanges) {
    console.log(`— ${plan.name} (${plan.currency}, tarif mensuel ${plan.monthlyPrice})`);
    for (const r of plan.rows) {
      const from = r.oldMonth && r.oldYear ? `${r.oldMonth}/${r.oldYear}` : '(non défini)';
      const marker = r.oldMonth === r.newMonth && r.oldYear === r.newYear ? '  (inchangé)' : '';
      console.log(`    ${r.amount} ${plan.currency} : ${from} → ${r.newMonth}/${r.newYear} (${r.monthsGranted} mois)${marker}`);
    }
    if (plan.excessFlag) {
      console.log(`    ⚠️  Déborde sur l'année suivante — traité par défaut comme paiement anticipé.`);
      console.log(`        Si ce membre préfère que l'excédent devienne un DON, à reclasser`);
      console.log(`        manuellement ensuite (purpose de la ligne concernée).`);
      excessMembers.push(plan);
    }
    console.log('');
  }

  if (excessMembers.length > 0) {
    console.log(`📋 Récapitulatif — ${excessMembers.length} membre(s) avec un excédent à statuer (Don ou anticipation) :`);
    excessMembers.forEach(p => console.log(`   - ${p.name}`));
    console.log('');
  }

  if (!apply) {
    console.log('🔍 Mode DRY-RUN — aucune modification écrite. Relancez avec --apply pour appliquer.');
    return;
  }

  console.log('✍️  Application des changements...');
  let updated = 0;
  for (const plan of withChanges) {
    for (const r of plan.rows) {
      if (r.oldMonth === r.newMonth && r.oldYear === r.newYear) continue;
      await prisma.contribution.update({
        where: { id: r.contributionId },
        data: { monthReference: r.newMonth, yearReference: r.newYear },
      });
      updated++;
    }
  }
  console.log(`✅  ${updated} cotisation(s) mise(s) à jour.`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());