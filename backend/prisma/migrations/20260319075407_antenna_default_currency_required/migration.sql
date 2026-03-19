/*
  Warnings:

  - Made the column `defaultCurrency` on table `antennas` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "antennas" ALTER COLUMN "defaultCurrency" SET NOT NULL,
ALTER COLUMN "defaultCurrency" SET DEFAULT 'EUR';
