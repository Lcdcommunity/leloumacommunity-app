-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "platformName" TEXT NOT NULL DEFAULT 'LCD Platform',
    "contactEmail" TEXT,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);
