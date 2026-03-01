//backend/prisma/seeds/seed.ts
import { PrismaClient, UserRole, UserStatus, MembershipApprovalStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs'; // <-- Correction ici

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding...');

  const association = await prisma.association.upsert({
    where: { code: 'ASSOC-MAIN' },
    update: {},
    create: {
      code: 'ASSOC-MAIN',
      name: 'Association Community',
      isActive: true,
    },
  });

  const antenna = await prisma.antenna.upsert({
    where: { associationId_code: { associationId: association.id, code: 'ANT-PARIS-01' } },
    update: {},
    create: {
      associationId: association.id,
      code: 'ANT-PARIS-01',
      name: 'Antenne de Paris',
      isActive: true, 
    },
  });

  const hashedPwd = await bcrypt.hash('Admin2026!', 10); //

  // 1. Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@association.com' },
    update: {},
    create: {
      associationId: association.id,
      email: 'superadmin@association.com',
      passwordHash: hashedPwd,
      firstName: 'Super', lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  // 2. Admin Antenne
  const antennaAdmin = await prisma.user.upsert({
    where: { email: 'admin.paris@association.com' },
    update: {},
    create: {
      associationId: association.id,
      email: 'admin.paris@association.com',
      passwordHash: hashedPwd,
      firstName: 'Admin', lastName: 'Paris',
      role: UserRole.ANTENNA_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.antennaAdminAssignment.upsert({
    where: { antennaId_adminUserId: { antennaId: antenna.id, adminUserId: antennaAdmin.id } },
    update: {},
    create: {
      associationId: association.id,
      antennaId: antenna.id,
      adminUserId: antennaAdmin.id,
      isActive: true,
      assignedByUserId: superAdmin.id,
    },
  });

  // 3. Membre Standard
  const member = await prisma.user.upsert({
    where: { email: 'membre@association.com' },
    update: {},
    create: {
      associationId: association.id,
      email: 'membre@association.com',
      passwordHash: hashedPwd,
      firstName: 'Jean', lastName: 'Dupont',
      role: UserRole.MEMBER,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.membership.upsert({
    where: { userId_antennaId_isPrimary: { userId: member.id, antennaId: antenna.id, isPrimary: true } },
    update: {},
    create: {
      associationId: association.id,
      userId: member.id,
      antennaId: antenna.id,
      status: MembershipApprovalStatus.APPROVED,
      isPrimary: true,
    },
  });

  console.log('🎉 Seeding terminé avec succès !');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
  //npx prisma db seed