-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING_VALIDATION', 'VALIDATED', 'REJECTED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LedgerEntryType" ADD VALUE 'TRANSFER_IN';
ALTER TYPE "LedgerEntryType" ADD VALUE 'TRANSFER_OUT';

-- CreateTable
CREATE TABLE "antenna_transfers" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "senderAntennaId" TEXT NOT NULL,
    "initiatedByUserId" TEXT NOT NULL,
    "sendAmount" DECIMAL(14,2) NOT NULL,
    "sendCurrency" "CurrencyCode" NOT NULL,
    "receiverAntennaId" TEXT NOT NULL,
    "receiveAmount" DECIMAL(14,2) NOT NULL,
    "receiveCurrency" "CurrencyCode" NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING_VALIDATION',
    "notes" TEXT,
    "validatedByUserId" TEXT,
    "validatedAt" TIMESTAMP(3),
    "rejectedByUserId" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "senderLedgerEntryId" TEXT,
    "receiverLedgerEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "antenna_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "antenna_transfers_senderLedgerEntryId_key" ON "antenna_transfers"("senderLedgerEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "antenna_transfers_receiverLedgerEntryId_key" ON "antenna_transfers"("receiverLedgerEntryId");

-- CreateIndex
CREATE INDEX "antenna_transfers_associationId_status_createdAt_idx" ON "antenna_transfers"("associationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "antenna_transfers_senderAntennaId_status_createdAt_idx" ON "antenna_transfers"("senderAntennaId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "antenna_transfers_receiverAntennaId_status_createdAt_idx" ON "antenna_transfers"("receiverAntennaId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "antenna_transfers" ADD CONSTRAINT "antenna_transfers_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antenna_transfers" ADD CONSTRAINT "antenna_transfers_senderAntennaId_fkey" FOREIGN KEY ("senderAntennaId") REFERENCES "antennas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antenna_transfers" ADD CONSTRAINT "antenna_transfers_receiverAntennaId_fkey" FOREIGN KEY ("receiverAntennaId") REFERENCES "antennas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antenna_transfers" ADD CONSTRAINT "antenna_transfers_initiatedByUserId_fkey" FOREIGN KEY ("initiatedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antenna_transfers" ADD CONSTRAINT "antenna_transfers_validatedByUserId_fkey" FOREIGN KEY ("validatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antenna_transfers" ADD CONSTRAINT "antenna_transfers_rejectedByUserId_fkey" FOREIGN KEY ("rejectedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antenna_transfers" ADD CONSTRAINT "antenna_transfers_senderLedgerEntryId_fkey" FOREIGN KEY ("senderLedgerEntryId") REFERENCES "ledger_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antenna_transfers" ADD CONSTRAINT "antenna_transfers_receiverLedgerEntryId_fkey" FOREIGN KEY ("receiverLedgerEntryId") REFERENCES "ledger_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

