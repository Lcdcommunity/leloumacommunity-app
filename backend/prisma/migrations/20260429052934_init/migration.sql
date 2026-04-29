/*
  Warnings:

  - You are about to drop the column `revokedReason` on the `admin_invitations` table. All the data in the column will be lost.
  - You are about to drop the column `actorType` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `targetId` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `targetModel` on the `audit_logs` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stripeCustomerId]` on the table `associations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[domainName]` on the table `associations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[expenseId]` on the table `ledger_entries` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `details` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entity` to the `audit_logs` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProfessionalStatus" AS ENUM ('EMPLOYEE', 'SELF_EMPLOYED', 'STUDENT', 'UNEMPLOYED', 'RETIRED', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('BILL', 'OFFICE_SUPPLIES', 'TRAVEL', 'HOTEL', 'MEALS', 'PROJECT_FUNDING', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING_VALIDATION', 'VALIDATED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('GENERAL_ASSEMBLY', 'ANTENNA_MEETING', 'FUNDRAISER', 'OTHER');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('INVITED', 'ATTENDING', 'DECLINED', 'ATTENDED', 'ABSENT');

-- CreateEnum
CREATE TYPE "SaaSPlan" AS ENUM ('FREE', 'PREMIUM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "DashboardTarget" AS ENUM ('ALL', 'MEMBERS', 'ADMINS', 'SUPER_ADMINS');

-- CreateEnum
CREATE TYPE "ElectionStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'ENGAGE_EXPENSE';
ALTER TYPE "AuditAction" ADD VALUE 'VALIDATE_EXPENSE';
ALTER TYPE "AuditAction" ADD VALUE 'REJECT_EXPENSE';
ALTER TYPE "AuditAction" ADD VALUE 'CREATE_EVENT';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_EVENT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CurrencyCode" ADD VALUE 'CAD';
ALTER TYPE "CurrencyCode" ADD VALUE 'CHF';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FileCategory" ADD VALUE 'EXPENSE_PROOF';
ALTER TYPE "FileCategory" ADD VALUE 'EVENT_COVER';
ALTER TYPE "FileCategory" ADD VALUE 'SPONSOR_LOGO';
ALTER TYPE "FileCategory" ADD VALUE 'VIDEO_CONTENT';
ALTER TYPE "FileCategory" ADD VALUE 'VIDEO_THUMBNAIL';
ALTER TYPE "FileCategory" ADD VALUE 'CAROUSEL_IMAGE';

-- AlterEnum
ALTER TYPE "LedgerEntryType" ADD VALUE 'ANTENNA_EXPENSE_OUT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'EXPENSE_REQUIRES_VALIDATION';
ALTER TYPE "NotificationType" ADD VALUE 'EXPENSE_VALIDATED';
ALTER TYPE "NotificationType" ADD VALUE 'EXPENSE_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_PUBLISHED';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_REMINDER';

-- AlterEnum
ALTER TYPE "ReminderKind" ADD VALUE 'EVENT_REMINDER';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SYSTEM_ADMIN';

-- DropIndex
DROP INDEX "audit_logs_action_createdAt_idx";

-- DropIndex
DROP INDEX "audit_logs_antennaId_createdAt_idx";

-- DropIndex
DROP INDEX "audit_logs_targetModel_targetId_idx";

-- AlterTable
ALTER TABLE "admin_invitations" DROP COLUMN "revokedReason",
ADD COLUMN     "revokeReason" TEXT;

-- AlterTable
ALTER TABLE "associations" ADD COLUMN     "domainName" TEXT,
ADD COLUMN     "expenseValidationThreshold" DECIMAL(14,2),
ADD COLUMN     "fontFamily" TEXT,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "subscriptionExpiresAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionPlan" "SaaSPlan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "themeColors" JSONB;

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "actorType",
DROP COLUMN "metadata",
DROP COLUMN "summary",
DROP COLUMN "targetId",
DROP COLUMN "targetModel",
ADD COLUMN     "details" JSONB NOT NULL,
ADD COLUMN     "entity" TEXT NOT NULL,
ADD COLUMN     "entityId" TEXT,
ALTER COLUMN "associationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "auth_tokens" ALTER COLUMN "associationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "contributions" ADD COLUMN     "submitterUserId" TEXT;

-- AlterTable
ALTER TABLE "file_assets" ALTER COLUMN "associationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ledger_entries" ADD COLUMN     "expenseId" TEXT;

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "associationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "password_reset_tokens" ALTER COLUMN "associationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "refresh_token_sessions" ALTER COLUMN "associationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "sessions" ALTER COLUMN "associationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "function" TEXT,
ADD COLUMN     "originDistrict" TEXT,
ADD COLUMN     "originQuarter" TEXT,
ADD COLUMN     "originSector" TEXT,
ADD COLUMN     "professionalStatus" TEXT,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "associationId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "antennaId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" "CurrencyCode" NOT NULL DEFAULT 'EUR',
    "category" "ExpenseCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'OTHER',
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING_VALIDATION',
    "rejectionReason" TEXT,
    "proofFileId" TEXT,
    "ledgerEntryId" TEXT,
    "engagedByUserId" TEXT NOT NULL,
    "validatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "validatedAt" TIMESTAMP(3),

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "EventType" NOT NULL DEFAULT 'OTHER',
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "locationText" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "meetingLink" TEXT,
    "coverImageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_attendances" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'INVITED',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsors" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "contactEmail" TEXT,
    "logoFileId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_posts" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "antennaId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "videoFileId" TEXT NOT NULL,
    "thumbnailId" TEXT,
    "targetAudience" "DashboardTarget" NOT NULL DEFAULT 'ALL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carousel_images" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "antennaId" TEXT,
    "title" TEXT,
    "imageFileId" TEXT NOT NULL,
    "linkUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "targetAudience" "DashboardTarget" NOT NULL DEFAULT 'ALL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carousel_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'fr',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "expirationTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricings" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "currency" "CurrencyCode" NOT NULL,
    "monthlyQuota" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "membershipCard" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expenseValidationThreshold" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "elections" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ElectionStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "elections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_positions" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "election_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_candidates" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "photoUrl" TEXT,

    CONSTRAINT "election_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_votes" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "voterUserId" TEXT NOT NULL,
    "castAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "election_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EventToAntenna" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "expenses_ledgerEntryId_key" ON "expenses"("ledgerEntryId");

-- CreateIndex
CREATE INDEX "expenses_associationId_status_expenseDate_idx" ON "expenses"("associationId", "status", "expenseDate");

-- CreateIndex
CREATE INDEX "expenses_antennaId_status_expenseDate_idx" ON "expenses"("antennaId", "status", "expenseDate");

-- CreateIndex
CREATE INDEX "expenses_engagedByUserId_idx" ON "expenses"("engagedByUserId");

-- CreateIndex
CREATE INDEX "events_associationId_startsAt_idx" ON "events"("associationId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "event_attendances_eventId_userId_key" ON "event_attendances"("eventId", "userId");

-- CreateIndex
CREATE INDEX "video_posts_associationId_isActive_idx" ON "video_posts"("associationId", "isActive");

-- CreateIndex
CREATE INDEX "video_posts_antennaId_isActive_idx" ON "video_posts"("antennaId", "isActive");

-- CreateIndex
CREATE INDEX "carousel_images_associationId_isActive_sortOrder_idx" ON "carousel_images"("associationId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "carousel_images_antennaId_isActive_sortOrder_idx" ON "carousel_images"("antennaId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "pricings_associationId_idx" ON "pricings"("associationId");

-- CreateIndex
CREATE UNIQUE INDEX "pricings_associationId_currency_key" ON "pricings"("associationId", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "election_candidates_positionId_userId_key" ON "election_candidates"("positionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "election_votes_positionId_voterUserId_key" ON "election_votes"("positionId", "voterUserId");

-- CreateIndex
CREATE UNIQUE INDEX "_EventToAntenna_AB_unique" ON "_EventToAntenna"("A", "B");

-- CreateIndex
CREATE INDEX "_EventToAntenna_B_index" ON "_EventToAntenna"("B");

-- CreateIndex
CREATE UNIQUE INDEX "associations_stripeCustomerId_key" ON "associations"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "associations_domainName_key" ON "associations"("domainName");

-- CreateIndex
CREATE INDEX "contributions_submitterUserId_submittedAt_idx" ON "contributions"("submitterUserId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_expenseId_key" ON "ledger_entries"("expenseId");

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_submitterUserId_fkey" FOREIGN KEY ("submitterUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_antennaId_fkey" FOREIGN KEY ("antennaId") REFERENCES "antennas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_engagedByUserId_fkey" FOREIGN KEY ("engagedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_validatedByUserId_fkey" FOREIGN KEY ("validatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_proofFileId_fkey" FOREIGN KEY ("proofFileId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendances" ADD CONSTRAINT "event_attendances_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendances" ADD CONSTRAINT "event_attendances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_logoFileId_fkey" FOREIGN KEY ("logoFileId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_posts" ADD CONSTRAINT "video_posts_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_posts" ADD CONSTRAINT "video_posts_antennaId_fkey" FOREIGN KEY ("antennaId") REFERENCES "antennas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_posts" ADD CONSTRAINT "video_posts_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_posts" ADD CONSTRAINT "video_posts_videoFileId_fkey" FOREIGN KEY ("videoFileId") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_posts" ADD CONSTRAINT "video_posts_thumbnailId_fkey" FOREIGN KEY ("thumbnailId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carousel_images" ADD CONSTRAINT "carousel_images_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carousel_images" ADD CONSTRAINT "carousel_images_antennaId_fkey" FOREIGN KEY ("antennaId") REFERENCES "antennas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carousel_images" ADD CONSTRAINT "carousel_images_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carousel_images" ADD CONSTRAINT "carousel_images_imageFileId_fkey" FOREIGN KEY ("imageFileId") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricings" ADD CONSTRAINT "pricings_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "elections" ADD CONSTRAINT "elections_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_positions" ADD CONSTRAINT "election_positions_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_candidates" ADD CONSTRAINT "election_candidates_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "election_positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_candidates" ADD CONSTRAINT "election_candidates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_votes" ADD CONSTRAINT "election_votes_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "election_positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_votes" ADD CONSTRAINT "election_votes_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "election_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_votes" ADD CONSTRAINT "election_votes_voterUserId_fkey" FOREIGN KEY ("voterUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventToAntenna" ADD CONSTRAINT "_EventToAntenna_A_fkey" FOREIGN KEY ("A") REFERENCES "antennas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventToAntenna" ADD CONSTRAINT "_EventToAntenna_B_fkey" FOREIGN KEY ("B") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
