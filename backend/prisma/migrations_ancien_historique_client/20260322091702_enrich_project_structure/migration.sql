-- AlterEnum
ALTER TYPE "ContributionPurpose" ADD VALUE 'LATE_QUOTA';

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "environmentalImpact" TEXT,
ADD COLUMN     "expectedResults" JSONB,
ADD COLUMN     "implementationMethod" TEXT,
ADD COLUMN     "populationImpact" TEXT,
ADD COLUMN     "promoterName" TEXT,
ADD COLUMN     "risksAndMitigation" TEXT,
ADD COLUMN     "specificObjectives" JSONB,
ADD COLUMN     "successIndicators" JSONB,
ADD COLUMN     "targetBeneficiaries" TEXT;
