// backend/prisma/seeds/seed.ts
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding...');

  // 1. Association
  const association = await prisma.association.upsert({
    where: { code: 'LCD26DONIKO' },
    update: {
      name: 'Lelouma Community',
      domainName: 'www.leloumacommunity.com',
      isActive: true,
    },
    create: {
      code: 'LCD26DONIKO',
      name: 'Lelouma Community',
      domainName: 'www.leloumacommunity.com',
      isActive: true,
    },
  });
  console.log('🏢 Association "Lelouma Community" OK');

  const hashedPwd = await bcrypt.hash('Lcd123456!', 10);

  // 2. Super Admin existant (inchangé)
  await prisma.user.upsert({
    where: { email: 'lelouma.community@gmail.com' },
    update: {
      role: UserRole.SUPER_ADMIN,
      associationId: association.id,
      passwordHash: hashedPwd,
      status: UserStatus.ACTIVE,
    },
    create: {
      associationId: association.id,
      email: 'lelouma.community@gmail.com',
      passwordHash: hashedPwd,
      firstName: 'Thierno',
      lastName: 'DIALLO',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  console.log('👤 Super Admin "lelouma.community@gmail.com" OK');

  // 3. Nouveau Super Admin — contactlcd26@gmail.com
  await prisma.user.upsert({
    where: { email: 'contactlcd26@gmail.com' },
    update: {
      role: UserRole.SUPER_ADMIN,
      associationId: association.id,
      passwordHash: hashedPwd,
      status: UserStatus.ACTIVE,
    },
    create: {
      associationId: association.id,
      email: 'contactlcd26@gmail.com',
      passwordHash: hashedPwd,
      firstName: 'Contact',
      lastName: 'LCD',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  console.log('👤 Super Admin "contactlcd26@gmail.com" OK');

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
