// backend/prisma/seeds/seed.ts
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding pour le compte client...');

  // 1. Création ou mise à jour de l'Association du client
  // Le domainName est configuré sans "www." pour correspondre au déploiement actuel
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
  console.log('🏢 Association "Lelouma Community" configurée.');

  // Hachage du mot de passe sécurisé pour les comptes créés
  const hashedPwd = await bcrypt.hash('Lcd123456!', 10);

  // 2. Création du compte SUPER_ADMIN du client
  // Ce compte est rattaché à l'association créée ci-dessus
  console.log('👤 Création du compte Super Admin client...');
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

  console.log('🎉 Seeding terminé avec succès ! L\'espace client est prêt.');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
  //npx prisma db seed