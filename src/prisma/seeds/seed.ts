//src/prisma/seeds/seed.ts
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL || 'superadmin@example.org';
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD || 'ChangeMe123!';

  const passwordHash = await bcrypt.hash(superAdminPassword, 12);

  const association = await prisma.association.upsert({
    where: { code: 'LELOUMA-COMMUNITY' },
    update: {},
    create: {
      code: 'LELOUMA-COMMUNITY',
      name: 'Lelouna Communauté pour le Développement',
      isActive: true,
    },
  });

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail.toLowerCase() },
    update: {},
    create: {
      associationId: association.id,
      email: superAdminEmail.toLowerCase(),
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      status: 'ACTIVE' as any,
      emailVerifiedAt: new Date(),
      isActive: true as any,
    } as any,
  });

  const antennas = [
    { code: 'PARIS', name: 'Antenne Paris' },
    { code: 'CONAKRY', name: 'Antenne Conakry' },
    { code: 'LONDON', name: 'Antenne Londres' },
  ];

  for (const a of antennas) {
    await prisma.antenna.upsert({
      where: { associationId_code: { associationId: association.id, code: a.code } } as any,
      update: {},
      create: {
        associationId: association.id,
        code: a.code,
        name: a.name,
        isActive: true,
      },
    });
  }

  console.log('✅ Seed done');
  console.log({
    associationId: association.id,
    superAdminEmail,
    superAdminPassword,
    superAdminId: superAdmin.id,
  });
}

main()
  .catch((e) => {
    console.error('❌ Seed failed', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });