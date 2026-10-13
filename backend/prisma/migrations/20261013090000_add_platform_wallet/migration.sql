-- Wallet de la plateforme (Grand Chef) + virements de commission des admins d'antenne.
-- Migration 100 % additive : aucune table ni colonne existante n'est modifiée ou supprimée,
-- hormis l'ajout de 5 valeurs à l'enum AuditAction et d'une colonne avec valeur par défaut
-- sur "PlatformSetting".

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CREATE_PLATFORM_TRANSFER';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'VALIDATE_PLATFORM_TRANSFER';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REJECT_PLATFORM_TRANSFER';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CANCEL_PLATFORM_TRANSFER';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PLATFORM_WALLET_MOVEMENT';

-- CreateEnum
CREATE TYPE "PlatformWalletEntryType" AS ENUM ('COMMISSION_IN', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'WITHDRAWAL_OUT');

-- AlterTable
ALTER TABLE "PlatformSetting" ADD COLUMN "platformWalletCurrencies" "CurrencyCode"[] DEFAULT ARRAY['EUR', 'USD', 'GNF', 'XOF']::"CurrencyCode"[];

-- CreateTable
CREATE TABLE "platform_transfers" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "associationName" TEXT NOT NULL,
    "senderAntennaId" TEXT NOT NULL,
    "senderAntennaName" TEXT NOT NULL,
    "initiatedByUserId" TEXT NOT NULL,
    "initiatedByName" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" "CurrencyCode" NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'COMMISSION',
    "periodLabel" TEXT,
    "notes" TEXT,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING_VALIDATION',
    "decidedByUserId" TEXT,
    "validatedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "senderLedgerEntryId" TEXT,
    "walletEntryId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_wallet_entries" (
    "id" TEXT NOT NULL,
    "type" "PlatformWalletEntryType" NOT NULL,
    "currency" "CurrencyCode" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "referenceCode" TEXT,
    "associationId" TEXT,
    "createdByUserId" TEXT,
    "idempotencyKey" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_wallet_entries_pkey" PRIMARY KEY ("id")
);

-- Garde-fous : montants strictement positifs (le sens vient du type d'écriture)
ALTER TABLE "platform_transfers" ADD CONSTRAINT "platform_transfers_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "platform_wallet_entries" ADD CONSTRAINT "platform_wallet_entries_amount_positive" CHECK ("amount" > 0);

-- CreateIndex
CREATE UNIQUE INDEX "platform_transfers_reference_key" ON "platform_transfers"("reference");
CREATE UNIQUE INDEX "platform_transfers_senderLedgerEntryId_key" ON "platform_transfers"("senderLedgerEntryId");
CREATE UNIQUE INDEX "platform_transfers_walletEntryId_key" ON "platform_transfers"("walletEntryId");
CREATE UNIQUE INDEX "platform_transfers_initiatedByUserId_idempotencyKey_key" ON "platform_transfers"("initiatedByUserId", "idempotencyKey");
CREATE INDEX "platform_transfers_associationId_status_createdAt_idx" ON "platform_transfers"("associationId", "status", "createdAt");
CREATE INDEX "platform_transfers_senderAntennaId_status_currency_idx" ON "platform_transfers"("senderAntennaId", "status", "currency");
CREATE INDEX "platform_transfers_status_createdAt_idx" ON "platform_transfers"("status", "createdAt");

CREATE UNIQUE INDEX "platform_wallet_entries_idempotencyKey_key" ON "platform_wallet_entries"("idempotencyKey");
CREATE INDEX "platform_wallet_entries_currency_effectiveDate_idx" ON "platform_wallet_entries"("currency", "effectiveDate");
CREATE INDEX "platform_wallet_entries_type_effectiveDate_idx" ON "platform_wallet_entries"("type", "effectiveDate");
CREATE INDEX "platform_wallet_entries_associationId_effectiveDate_idx" ON "platform_wallet_entries"("associationId", "effectiveDate");

-- AddForeignKey
ALTER TABLE "platform_transfers" ADD CONSTRAINT "platform_transfers_senderLedgerEntryId_fkey" FOREIGN KEY ("senderLedgerEntryId") REFERENCES "ledger_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "platform_transfers" ADD CONSTRAINT "platform_transfers_walletEntryId_fkey" FOREIGN KEY ("walletEntryId") REFERENCES "platform_wallet_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
