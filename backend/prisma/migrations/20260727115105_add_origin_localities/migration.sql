-- AlterTable
ALTER TABLE "associations" ADD COLUMN     "originLocalities" TEXT[] DEFAULT ARRAY[]::TEXT[];
