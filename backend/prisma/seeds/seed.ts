// backend/prisma/seeds/seed.ts
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding...');

  // 1. Création de l'Association principale
  const association = await prisma.association.upsert({
    where: { code: 'ASSOC-MAIN' },
    update: {},
    create: {
      code: 'ASSOC-MAIN',
      name: 'Association Community',
      isActive: true,
    },
  });

  // 2. Création de l'Antenne par défaut
  await prisma.antenna.upsert({
    where: { 
      associationId_code: { 
        associationId: association.id, 
        code: 'ANT-PARIS-01' 
      } 
    },
    update: {},
    create: {
      associationId: association.id,
      code: 'ANT-PARIS-01',
      name: 'Antenne de Paris',
      isActive: true, 
    },
  });

  // 3. Hachage du mot de passe pour le compte admin
  const hashedPwd = await bcrypt.hash('Lcd123456!', 10);

  // 4. Création unique du Super Admin
  console.log('👤 Création du compte Super Admin...');
  await prisma.user.upsert({
    where: { email: 'thiernodoniko@gmail.com' },
    update: {},
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

  console.log('🎉 Seeding terminé avec succès !');
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