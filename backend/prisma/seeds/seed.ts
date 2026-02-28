//backend/prisma/seeds/seed.ts
import { PrismaClient, UserRole, UserStatus, MembershipApprovalStatus } from '@prisma/client';
import bcrypt from 'bcryptjs'; // Syntax ES Module correcte

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding...');

  // 1. Créer l'association principale
  const association = await prisma.association.upsert({
    where: { code: 'ASSOC-MAIN' },
    update: {},
    create: {
      code: 'ASSOC-MAIN',
      name: 'Association Community',
      description: 'Association principale par défaut',
      country: 'France',
      city: 'Paris',
      isActive: true,
    },
  });
  console.log(`✅ Association créée : ${association.name}`);

  // 2. Créer une antenne par défaut
  const antenna = await prisma.antenna.upsert({
    where: {
      associationId_code: {
        associationId: association.id,
        code: 'ANT-PARIS-01',
      },
    },
    update: {},
    create: {
      associationId: association.id,
      code: 'ANT-PARIS-01',
      name: 'Antenne de Paris',
      country: 'France',
      city: 'Paris',
      isActive: true,
    },
  });
  console.log(`✅ Antenne créée : ${antenna.name}`);

  // 3. Hasher le mot de passe pour le Super Admin
  const passwordHash = await bcrypt.hash('Admin2026!', 10);

  // 4. Créer l'utilisateur Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@association.com' },
    update: {},
    create: {
      associationId: association.id,
      email: 'superadmin@association.com',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      isPhoneVerified: true,
    },
  });
  console.log(`✅ Super Admin créé : ${superAdmin.email}`);

  // 5. Lier le Super Admin à l'antenne (Membership)
  await prisma.membership.upsert({
    where: {
      userId_antennaId_isPrimary: {
        userId: superAdmin.id,
        antennaId: antenna.id,
        isPrimary: true,
      },
    },
    update: {},
    create: {
      associationId: association.id,
      userId: superAdmin.id,
      antennaId: antenna.id,
      status: MembershipApprovalStatus.APPROVED,
      isPrimary: true,
      joinedAt: new Date(),
    },
  });
  console.log(`✅ Membership créé pour le Super Admin`);

  console.log('🎉 Seeding terminé avec succès !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });