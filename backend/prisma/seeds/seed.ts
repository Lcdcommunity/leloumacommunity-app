// backend/prisma/seeds/seed.ts
//
// v1.1 — 🔥 CORRIGÉ (sécurité PRODUCTION) : la branche `update` de l'upsert
//   réécrivait à CHAQUE exécution le mot de passe (« Lcd123456! », visible dans
//   le dépôt), le rôle et le statut du compte SYSTEM_ADMIN : lancer le seed sur
//   la base de production réinitialisait le compte du Grand Chef à un mot de
//   passe public. Désormais : (1) un compte existant n'est JAMAIS modifié ;
//   (2) à la création, le mot de passe vient de SEED_ADMIN_PASSWORD
//   (obligatoire, 12 caractères minimum) — plus aucun mot de passe en dur ;
//   (3) l'e-mail est lisible via SEED_ADMIN_EMAIL (défaut inchangé).
//
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding...');

  // ── SYSTEM ADMIN ──
  // Rôle : crée et gère les associations sur la plateforme
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'doniko.digital@gmail.com').trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true },
  });

  if (existing) {
    // 🔒 On ne touche JAMAIS à un compte existant (mot de passe, rôle, statut).
    console.log(`👤 System Admin "${adminEmail}" déjà présent — aucune modification.`);
  } else {
    const seedPassword = process.env.SEED_ADMIN_PASSWORD;
    if (!seedPassword || seedPassword.length < 12) {
      throw new Error(
        'SEED_ADMIN_PASSWORD est obligatoire (12 caractères minimum) pour créer le System Admin.',
      );
    }

    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(seedPassword, 10),
        firstName: 'Doniko',
        lastName: 'JALLOW',
        role: UserRole.SYSTEM_ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    console.log(`👤 System Admin "${adminEmail}" créé.`);
  }

  // ────────────────────────────────────────────────────────────
  // Ces comptes ne sont PAS en base sur cette instance Grand Chef
  // (base réinitialisée récemment) — ne décommente que si tu veux
  // vraiment les recréer ici.
  // ────────────────────────────────────────────────────────────
  //
  // await prisma.association.upsert({ where: { code: 'LCD26DONIKO' }, ... });
  //
  // await prisma.user.upsert({ where: { email: 'lelouma.community@gmail.com' }, ... });
  //
  // await prisma.user.upsert({ where: { email: 'contactlcd26@gmail.com' }, ... });

  console.log('🎉 Seeding terminé !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// npx prisma db seed

