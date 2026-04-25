// backend/prisma/seeds/seed.ts
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding de production...');

  // 1. Création de l'Association principale
  const association = await prisma.association.upsert({
    where: { code: 'LCD26DONIKO' },
    update: {
      name: 'Lelouma Community',
    },
    create: {
      code: 'LCD26DONIKO',
      name: 'Lelouma Community',
    },
  });
  console.log('🏢 Association principale configurée.');

  // 2. Hachage du mot de passe
  // Utilisation du mot de passe souhaité : Lcd123456!
  const hashedPwd = await bcrypt.hash('Lcd123456!', 10);

  // 3. CRÉATION DU GRAND CHEF (SYSTEM_ADMIN)
  console.log('👑 Création du compte Grand Chef (SYSTEM_ADMIN)...');
  await prisma.user.upsert({
    where: { email: 'thiernodoniko21@outlook.fr' },
    update: {
      role: UserRole.SYSTEM_ADMIN,
      associationId: null,
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
      associationId: null,
    },
  });

  // 4. Création du premier Super Admin
  console.log('👤 Création du compte Super Admin (Thierno)...');
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

  // 5. CRÉATION DU SECOND SUPER ADMIN (Fatoumata DIALLO)
  console.log('👤 Création du compte Super Admin (Fatoumata)...');
  await prisma.user.upsert({
    where: { email: 'istevediallo@gmail.com' },
    update: {
      role: UserRole.SUPER_ADMIN,
      associationId: association.id,
      passwordHash: hashedPwd,
      status: UserStatus.ACTIVE,
      phone: '0033658944985',
      professionalStatus: 'Salarié',
      addressLine1: '21 rue du petit champ',
      postalCode: '77700',
      city: 'Chessy',
      emailVerifiedAt: new Date(), // Marqué comme vérifié pour accès immédiat
    },
    create: {
      email: 'istevediallo@gmail.com',
      passwordHash: hashedPwd,
      firstName: 'Fatoumata',
      lastName: 'DIALLO',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      associationId: association.id,
      phone: '0033658944985',
      professionalStatus: 'Salarié',
      addressLine1: '21 rue du petit champ',
      postalCode: '77700',
      city: 'Chessy',
      emailVerifiedAt: new Date(),
    },
  });

  console.log('🎉 Seeding terminé avec succès ! La base est prête.');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
// Commande pour exécuter : npx prisma db seed
  //npx prisma db seed