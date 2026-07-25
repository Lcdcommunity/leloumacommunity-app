-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('NONE', 'PENDING_VERIFICATION', 'ACTIVE', 'FAILED');

-- AlterTable
ALTER TABLE "associations" ADD COLUMN     "domainStatus" "DomainStatus" NOT NULL DEFAULT 'NONE';

