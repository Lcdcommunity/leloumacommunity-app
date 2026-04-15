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
  const hashedPwd = await bcrypt.hash('Lcd123456!', 10);

  // 3. CRÉATION DU GRAND CHEF (SYSTEM_ADMIN)
  // Indépendant de toute association, maître de la plateforme
  console.log('👑 Création du compte Grand Chef (SYSTEM_ADMIN)...');
  await prisma.user.upsert({
    where: { email: 'thiernodoniko21@outlook.fr' },
    update: {
      role: UserRole.SYSTEM_ADMIN,
      associationId: null, // Très important : le grand chef est au-dessus
      passwordHash: hashedPwd,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'thiernodoniko21@outlook.fr',
      passwordHash: hashedPwd,
      firstName: 'Système',
      lastName: 'Admin',
      role: UserRole.SYSTEM_ADMIN,
      status: UserStatus.ACTIVE,
      associationId: null,
    },
  });

  // 4. Création du Super Admin de l'association locale
  console.log('👤 Création du compte Super Admin...');
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
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
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