// backend/prisma/seeds/seed.ts
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding pour le compte client...');

  // 1. Création ou mise à jour de l'Association du client
  // Ajout du "www." pour correspondre à l'URL de ton navigateur
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
  console.log('🏢 Association "Lelouma Community" configurée avec le domaine www.');

  // Hachage du mot de passe sécurisé
  const hashedPwd = await bcrypt.hash('Lcd123456!', 10);

  // 2. Création du compte SUPER_ADMIN du client
  console.log('👤 Mise à jour du compte Super Admin...');
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

  console.log('🎉 Seeding terminé ! Essaye de te connecter sur www.leloumacommunity.com');
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
