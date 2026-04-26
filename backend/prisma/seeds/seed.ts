// backend/prisma/seeds/seed.ts
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding...');

  // 1. Création ou mise à jour de l'Association
  // IMPORTANT : Vérifie que 'LCD26DONIKO' est bien le code existant dans Neon
  const association = await prisma.association.upsert({
    where: { code: 'LCD26DONIKO' }, 
    update: {
      name: 'Lelouma Community',
      domainName: 'leloumacommunity.com', 
      isActive: true,
    },
    create: {
      code: 'LCD26DONIKO',
      name: 'Lelouma Community',
      domainName: 'leloumacommunity.com', 
      isActive: true,
    },
  });
  console.log('🏢 Association configurée.');

  const hashedPwd = await bcrypt.hash('Lcd123456!', 10);

  // 2. Création du SYSTEM_ADMIN
  await prisma.user.upsert({
    where: { email: 'thiernodoniko21@outlook.fr' },
    update: {
      role: UserRole.SYSTEM_ADMIN,
      passwordHash: hashedPwd,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'thiernodoniko21@outlook.fr',
      passwordHash: hashedPwd,
      firstName: 'Doniko',
      lastName: 'DIALLO',
      role: UserRole.SYSTEM_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  // 3. Création du SUPER_ADMIN lié à l'association du client
  await prisma.user.upsert({
    where: { email: 'thiernodoniko@gmail.com' },
    update: {
      role: UserRole.SUPER_ADMIN,
      associationId: association.id,
      passwordHash: hashedPwd,
      status: UserStatus.ACTIVE,
    },
    create: {
      associationId: association.id,
      email: 'thiernodoniko@gmail.com',
      passwordHash: hashedPwd,
      firstName: 'Thierno',
      lastName: 'DIALLO',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  console.log('🎉 Seeding terminé !');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
  //npx prisma db seed