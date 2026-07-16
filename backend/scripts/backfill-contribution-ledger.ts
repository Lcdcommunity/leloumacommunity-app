// backend/scripts/backfill-contribution-ledger.ts
import { PrismaClient, LedgerEntryType, ContributionStatus } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const orphans = await prisma.contribution.findMany({
    where: { status: ContributionStatus.VALIDATED, ledgerEntryId: null },
    select: {
      id: true,
      associationId: true,
      antennaId: true,
      amount: true,
      currency: true,
      purpose: true,
      validatedByUserId: true,
      memberUserId: true,
    },
  });

  console.log(`${orphans.length} cotisation(s) validée(s) sans écriture ledger trouvée(s).`);

  if (DRY_RUN) {
    const byCurrency: Record<string, number> = {};
    for (const c of orphans) {
      byCurrency[c.currency] = (byCurrency[c.currency] ?? 0) + Number(c.amount);
    }
    console.log('--- DRY RUN : rien n\'est écrit en base ---');
    console.log('Montants qui seraient ajoutés par devise :', byCurrency);
    console.log('Exemples (5 premiers) :', orphans.slice(0, 5));
    return;
  }

  let created = 0;

  for (const c of orphans) {
    const ledger = await prisma.ledgerEntry.create({
      data: {
        associationId: c.associationId,
        antennaId: c.antennaId,
        contributionId: c.id,
        type: LedgerEntryType.CONTRIBUTION_IN,
        amount: c.amount,
        currency: c.currency,
        title: `Cotisation validée (rattrapage) — ${c.purpose}`,
        createdByUserId: c.validatedByUserId ?? c.memberUserId,
      },
    });

    await prisma.contribution.update({
      where: { id: c.id },
      data: { ledgerEntryId: ledger.id },
    });

    created++;
  }

  console.log(`Rattrapage terminé : ${created} écriture(s) LedgerEntry créée(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());