-- CreateEnum
CREATE TYPE "ContributionPurpose" AS ENUM ('REGULAR_QUOTA', 'MEMBERSHIP_CARD', 'DONATION');

-- AlterTable
ALTER TABLE "contributions" ADD COLUMN     "purpose" "ContributionPurpose" NOT NULL DEFAULT 'REGULAR_QUOTA';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "countryOfBirth" TEXT,
ADD COLUMN     "originSubPrefecture" TEXT,
ADD COLUMN     "placeOfBirth" TEXT;

-- CreateTable
CREATE TABLE "virtual_cards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isLocked" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "virtual_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "virtual_cards_userId_key" ON "virtual_cards"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "virtual_cards_cardNumber_key" ON "virtual_cards"("cardNumber");

-- CreateIndex
CREATE UNIQUE INDEX "virtual_cards_qrToken_key" ON "virtual_cards"("qrToken");

-- CreateIndex
CREATE INDEX "virtual_cards_qrToken_idx" ON "virtual_cards"("qrToken");

-- AddForeignKey
ALTER TABLE "virtual_cards" ADD CONSTRAINT "virtual_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
