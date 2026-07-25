// backend/prisma/seeds/seed.ts
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding...');

  const hashedPwd = await bcrypt.hash('Lcd123456!', 10);

  // ── SYSTEM ADMIN — doniko.digital@gmail.com ──
  // Rôle : crée et gère les associations sur la plateforme
  await prisma.user.upsert({
    where: { email: 'doniko.digital@gmail.com' },
    update: {
      role: UserRole.SYSTEM_ADMIN,
      passwordHash: hashedPwd,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'doniko.digital@gmail.com',
      passwordHash: hashedPwd,
      firstName: 'Doniko',
      lastName: 'JALLOW',
      role: UserRole.SYSTEM_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  console.log('👤 System Admin "doniko.digital@gmail.com" OK');

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

