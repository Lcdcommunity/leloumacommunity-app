-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SYSTEM_ADMIN', 'SUPER_ADMIN', 'ANTENNA_ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('EMAIL_UNVERIFIED', 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "ProfessionalStatus" AS ENUM ('EMPLOYEE', 'SELF_EMPLOYED', 'STUDENT', 'UNEMPLOYED', 'RETIRED', 'OTHER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "LanguageCode" AS ENUM ('FR', 'EN');

-- CreateEnum
CREATE TYPE "CurrencyCode" AS ENUM ('EUR', 'USD', 'GNF', 'XOF', 'GBP', 'CAD', 'CHF');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PENDING_VALIDATION', 'VALIDATED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContributionPurpose" AS ENUM ('REGULAR_QUOTA', 'LATE_QUOTA', 'MEMBERSHIP_CARD', 'DONATION');

-- CreateEnum
CREATE TYPE "ValidationChannel" AS ENUM ('PHYSICAL_CASH', 'BANK_STATEMENT', 'MOBILE_MONEY_RECEIPT', 'TRANSFER_PROOF', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('BILL', 'OFFICE_SUPPLIES', 'TRAVEL', 'HOTEL', 'MEALS', 'PROJECT_FUNDING', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING_VALIDATION', 'VALIDATED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PROPOSED', 'UNDER_REVIEW', 'MEMBER_APPROVAL_PENDING', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('NONE', 'PENDING_VERIFICATION', 'ACTIVE', 'FAILED');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CONVERTED_TO_PROJECT');

-- CreateEnum
CREATE TYPE "VoteChoice" AS ENUM ('YES', 'NO', 'ABSTAIN');

-- CreateEnum
CREATE TYPE "VoteSessionStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'CANCELLED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('GENERAL_ASSEMBLY', 'ANTENNA_MEETING', 'FUNDRAISER', 'OTHER');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('INVITED', 'ATTENDING', 'DECLINED', 'ATTENDED', 'ABSENT');

-- CreateEnum
CREATE TYPE "SaaSPlan" AS ENUM ('FREE', 'PREMIUM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ACCOUNT_EMAIL_VERIFICATION', 'ACCOUNT_APPROVED', 'ACCOUNT_REJECTED', 'ACCOUNT_SUSPENDED', 'CONTRIBUTION_SUBMITTED', 'CONTRIBUTION_VALIDATED', 'CONTRIBUTION_REJECTED', 'CONTRIBUTION_CANCELLED', 'EXPENSE_REQUIRES_VALIDATION', 'EXPENSE_VALIDATED', 'EXPENSE_REJECTED', 'PROJECT_PROPOSAL_SUBMITTED', 'PROJECT_PROPOSAL_APPROVED', 'PROJECT_PROPOSAL_REJECTED', 'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_STATUS_CHANGED', 'PROJECT_VOTE_OPEN', 'PROJECT_VOTE_CLOSED', 'EVENT_PUBLISHED', 'EVENT_REMINDER', 'NEWS_PUBLISHED', 'DOCUMENT_PUBLISHED', 'REMINDER_CONTRIBUTION_DELAY', 'SYSTEM_ALERT');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('PROFILE_PHOTO', 'CONTRIBUTION_PROOF', 'EXPENSE_PROOF', 'PROJECT_IMAGE', 'PROJECT_DOCUMENT', 'NEWS_IMAGE', 'EVENT_COVER', 'ASSOCIATION_DOCUMENT', 'ANTENNA_DOCUMENT', 'SPONSOR_LOGO', 'VIDEO_CONTENT', 'VIDEO_THUMBNAIL', 'CAROUSEL_IMAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "FileVisibility" AS ENUM ('PRIVATE', 'ANTENNA_ONLY', 'ASSOCIATION_WIDE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PostScope" AS ENUM ('GLOBAL', 'ANTENNA');

-- CreateEnum
CREATE TYPE "DocumentScope" AS ENUM ('GLOBAL', 'ANTENNA', 'PROJECT', 'PRIVATE');

-- CreateEnum
CREATE TYPE "MembershipApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('CONTRIBUTION_IN', 'DONATION_IN', 'MANUAL_ADJUSTMENT_IN', 'ANTENNA_EXPENSE_OUT', 'PROJECT_EXPENSE_OUT', 'OPERATING_EXPENSE_OUT', 'MANUAL_ADJUSTMENT_OUT', 'TRANSFER_IN', 'TRANSFER_OUT');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING_VALIDATION', 'VALIDATED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProjectionPeriodType" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('USER', 'SYSTEM', 'CRON');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'RESTORE', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_SUCCESS', 'VERIFY_EMAIL', 'APPROVE_ACCOUNT', 'REJECT_ACCOUNT', 'SUSPEND_ACCOUNT', 'REACTIVATE_ACCOUNT', 'SUBMIT_CONTRIBUTION', 'VALIDATE_CONTRIBUTION', 'REJECT_CONTRIBUTION', 'CANCEL_CONTRIBUTION', 'ENGAGE_EXPENSE', 'VALIDATE_EXPENSE', 'REJECT_EXPENSE', 'CREATE_PROJECT', 'UPDATE_PROJECT', 'CHANGE_PROJECT_STATUS', 'CREATE_PROJECT_PROPOSAL', 'REVIEW_PROJECT_PROPOSAL', 'CREATE_VOTE_SESSION', 'CAST_VOTE', 'PUBLISH_NEWS', 'PUBLISH_DOCUMENT', 'CREATE_EVENT', 'UPDATE_EVENT', 'CREATE_ANTENNA', 'UPDATE_ANTENNA', 'SUSPEND_ANTENNA', 'CREATE_ADMIN_ACCOUNT', 'ASSIGN_ADMIN_TO_ANTENNA', 'REMOVE_ADMIN_FROM_ANTENNA');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'INVITATION');

-- CreateEnum
CREATE TYPE "ReminderKind" AS ENUM ('CONTRIBUTION_DELAY_3_MONTHS', 'CONTRIBUTION_DELAY_CUSTOM', 'EVENT_REMINDER', 'GENERAL_ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "DashboardTarget" AS ENUM ('ALL', 'MEMBERS', 'ADMINS', 'SUPER_ADMINS');

-- CreateEnum
CREATE TYPE "ElectionStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SponsorTier" AS ENUM ('PLATINUM', 'GOLD', 'SILVER', 'STANDARD');

-- CreateTable
CREATE TABLE "associations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "legalName" TEXT,
    "registrationNumber" TEXT,
    "country" TEXT,
    "city" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "postalCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "websiteUrl" TEXT,
    "logoFileId" TEXT,
    "domainStatus" "DomainStatus" NOT NULL DEFAULT 'NONE',
    "defaultCurrency" "CurrencyCode" NOT NULL DEFAULT 'EUR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contributionDelayThresholdMonths" INTEGER NOT NULL DEFAULT 3,
    "allowProjectVoting" BOOLEAN NOT NULL DEFAULT true,
    "requireEmailVerification" BOOLEAN NOT NULL DEFAULT true,
    "expenseValidationThreshold" DECIMAL(14,2),
    "subscriptionPlan" "SaaSPlan" NOT NULL DEFAULT 'FREE',
    "stripeCustomerId" TEXT,
    "subscriptionExpiresAt" TIMESTAMP(3),
    "domainName" TEXT,
    "themeColors" JSONB,
    "fontFamily" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "associations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "antennas" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "city" TEXT,
    "region" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "postalCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "delayThresholdMonthsOverride" INTEGER,
    "defaultCurrency" "CurrencyCode" NOT NULL DEFAULT 'EUR',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,

    CONSTRAINT "antennas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "associationId" TEXT,
    "email" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "status" "UserStatus" NOT NULL DEFAULT 'EMAIL_UNVERIFIED',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullNameNormalized" TEXT,
    "phone" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" "Gender",
    "professionalStatus" TEXT,
    "function" TEXT,
    "placeOfBirth" TEXT,
    "countryOfBirth" TEXT,
    "country" TEXT,
    "city" TEXT,
    "originSubPrefecture" TEXT,
    "originDistrict" TEXT,
    "originQuarter" TEXT,
    "originSector" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "postalCode" TEXT,
    "profilePhotoFileId" TEXT,
    "preferredLanguage" "LanguageCode" NOT NULL DEFAULT 'FR',
    "timezone" TEXT DEFAULT 'Europe/Paris',
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedByUserId" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "suspendedByUserId" TEXT,
    "suspendedAt" TIMESTAMP(3),
    "suspensionReason" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "antennaId" TEXT NOT NULL,
    "status" "MembershipApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedByUserId" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "antenna_admin_assignments" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "antennaId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "isPrimaryManager" BOOLEAN NOT NULL DEFAULT true,
    "canValidateMembers" BOOLEAN NOT NULL DEFAULT true,
    "canValidateContributions" BOOLEAN NOT NULL DEFAULT true,
    "canManageProjects" BOOLEAN NOT NULL DEFAULT true,
    "canManageContent" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedByUserId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedByUserId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,

    CONSTRAINT "antenna_admin_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_invitations" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "antennaId" TEXT,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'ANTENNA_ADMIN',
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" TEXT NOT NULL,
    "associationId" TEXT,
    "userId" TEXT,
    "email" TEXT,
    "type" "TokenType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdByIp" TEXT,
    "createdByUserAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "associationId" TEXT,
    "userId" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_token_sessions" (
    "id" TEXT NOT NULL,
    "associationId" TEXT,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_token_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "associationId" TEXT,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_security_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecretEnc" TEXT,
    "backupCodesHash" JSONB,
    "passwordChangedAt" TIMESTAMP(3),
    "forcePasswordReset" BOOLEAN NOT NULL DEFAULT false,
    "lastFailedLoginAt" TIMESTAMP(3),
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_security_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contributions" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "antennaId" TEXT NOT NULL,
    "memberUserId" TEXT NOT NULL,
    "submitterUserId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" "CurrencyCode" NOT NULL DEFAULT 'EUR',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "purpose" "ContributionPurpose" NOT NULL DEFAULT 'REGULAR_QUOTA',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contributionDate" TIMESTAMP(3),
    "monthReference" INTEGER,
    "yearReference" INTEGER,
    "status" "ContributionStatus" NOT NULL DEFAULT 'PENDING_VALIDATION',
    "memberComment" TEXT,
    "adminComment" TEXT,
    "rejectionReason" TEXT,
    "proofFileId" TEXT,
    "externalReference" TEXT,
    "validationChannel" "ValidationChannel",
    "validatedByUserId" TEXT,
    "validatedAt" TIMESTAMP(3),
    "rejectedByUserId" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "cancelledByUserId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "ledgerEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contributions_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "antennaId" TEXT,
    "type" "LedgerEntryType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" "CurrencyCode" NOT NULL DEFAULT 'EUR',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contributionId" TEXT,
    "expenseId" TEXT,
    "projectId" TEXT,
    "documentId" TEXT,
    "referenceCode" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_snapshots" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "antennaId" TEXT,
    "currency" "CurrencyCode" NOT NULL DEFAULT 'EUR',
    "balanceAmount" DECIMAL(14,2) NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "generatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "balance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_proposals" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "antennaId" TEXT,
    "authorUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT NOT NULL,
    "estimatedBudget" DECIMAL(14,2),
    "currency" "CurrencyCode" DEFAULT 'EUR',
    "targetStartDate" TIMESTAMP(3),
    "targetEndDate" TIMESTAMP(3),
    "locationText" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewComment" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_proposal_attachments" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_proposal_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_proposal_comments" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_proposal_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "antennaId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "summary" TEXT,
    "description" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'APPROVED',
    "promoterName" TEXT,
    "specificObjectives" JSONB,
    "targetBeneficiaries" TEXT,
    "populationImpact" TEXT,
    "environmentalImpact" TEXT,
    "expectedResults" JSONB,
    "successIndicators" JSONB,
    "risksAndMitigation" TEXT,
    "implementationMethod" TEXT,
    "budgetAmount" DECIMAL(14,2),
    "currency" "CurrencyCode" DEFAULT 'EUR',
    "amountRaised" DECIMAL(14,2),
    "amountSpent" DECIMAL(14,2),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "targetDate" TIMESTAMP(3),
    "locationText" TEXT,
    "isPublicToMembers" BOOLEAN NOT NULL DEFAULT true,
    "coverImageFileId" TEXT,
    "managerUserId" TEXT,
    "sourceProposalId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_attachments" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_updates" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "progressPercent" INTEGER,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_update_attachments" (
    "id" TEXT NOT NULL,
    "projectUpdateId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_update_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vote_sessions" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "antennaId" TEXT,
    "projectId" TEXT,
    "proposalId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "VoteSessionStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "quorumPercent" DECIMAL(5,2),
    "approvalPercent" DECIMAL(5,2),
    "allowAbstain" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vote_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_votes" (
    "id" TEXT NOT NULL,
    "voteSessionId" TEXT NOT NULL,
    "voterUserId" TEXT NOT NULL,
    "choice" "VoteChoice" NOT NULL,
    "comment" TEXT,
    "castAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_votes_pkey" PRIMARY KEY ("id")
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
    "logoUrl" TEXT,
    "tier" "SponsorTier" NOT NULL DEFAULT 'STANDARD',
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
CREATE TABLE "news_posts" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "antennaId" TEXT,
    "scope" "PostScope" NOT NULL DEFAULT 'GLOBAL',
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "coverImageFileId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "publishedByUserId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "news_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_post_attachments" (
    "id" TEXT NOT NULL,
    "newsPostId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_post_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "antennaId" TEXT,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "categoryLabel" TEXT,
    "scope" "DocumentScope" NOT NULL DEFAULT 'GLOBAL',
    "visibility" TEXT NOT NULL DEFAULT 'ALL',
    "isDownloadable" BOOLEAN NOT NULL DEFAULT true,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "fileId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_assets" (
    "id" TEXT NOT NULL,
    "associationId" TEXT,
    "uploadedByUserId" TEXT,
    "storageProvider" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "checksumSha256" TEXT,
    "category" "FileCategory" NOT NULL DEFAULT 'OTHER',
    "visibility" "FileVisibility" NOT NULL DEFAULT 'PRIVATE',
    "width" INTEGER,
    "height" INTEGER,
    "durationSeconds" INTEGER,
    "url" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "associationId" TEXT,
    "antennaId" TEXT,
    "userId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_recipients" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "deliveryStatus" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "accountEvents" BOOLEAN NOT NULL DEFAULT true,
    "contributionEvents" BOOLEAN NOT NULL DEFAULT true,
    "projectEvents" BOOLEAN NOT NULL DEFAULT true,
    "newsEvents" BOOLEAN NOT NULL DEFAULT true,
    "reminderEvents" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "reminder_run_logs" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "antennaId" TEXT,
    "kind" "ReminderKind" NOT NULL,
    "thresholdMonths" INTEGER,
    "recipientsCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB,
    "triggeredByUserId" TEXT,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_run_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "association_settings" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "association_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "antenna_settings" (
    "id" TEXT NOT NULL,
    "antennaId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "antenna_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_projections" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "antennaId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "periodType" "ProjectionPeriodType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "projectedIncome" DECIMAL(14,2) NOT NULL,
    "projectedExpense" DECIMAL(14,2) NOT NULL,
    "projectedNet" DECIMAL(14,2) NOT NULL,
    "assumptions" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_projections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    "targetUserId" TEXT,
    "associationId" TEXT,
    "antennaId" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "_EventToAntenna" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "associations_code_key" ON "associations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "associations_stripeCustomerId_key" ON "associations"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "associations_domainName_key" ON "associations"("domainName");

-- CreateIndex
CREATE INDEX "associations_isActive_idx" ON "associations"("isActive");

-- CreateIndex
CREATE INDEX "antennas_associationId_isActive_idx" ON "antennas"("associationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "antennas_associationId_code_key" ON "antennas"("associationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "antennas_associationId_name_key" ON "antennas"("associationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_associationId_role_status_idx" ON "users"("associationId", "role", "status");

-- CreateIndex
CREATE INDEX "users_associationId_lastName_firstName_idx" ON "users"("associationId", "lastName", "firstName");

-- CreateIndex
CREATE INDEX "users_createdByUserId_idx" ON "users"("createdByUserId");

-- CreateIndex
CREATE INDEX "users_approvedByUserId_idx" ON "users"("approvedByUserId");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE INDEX "memberships_associationId_antennaId_status_idx" ON "memberships"("associationId", "antennaId", "status");

-- CreateIndex
CREATE INDEX "memberships_userId_status_idx" ON "memberships"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_userId_antennaId_isPrimary_key" ON "memberships"("userId", "antennaId", "isPrimary");

-- CreateIndex
CREATE INDEX "antenna_admin_assignments_associationId_antennaId_isActive_idx" ON "antenna_admin_assignments"("associationId", "antennaId", "isActive");

-- CreateIndex
CREATE INDEX "antenna_admin_assignments_adminUserId_isActive_idx" ON "antenna_admin_assignments"("adminUserId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "antenna_admin_assignments_antennaId_adminUserId_key" ON "antenna_admin_assignments"("antennaId", "adminUserId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_invitations_tokenHash_key" ON "admin_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "admin_invitations_associationId_antennaId_expiresAt_idx" ON "admin_invitations"("associationId", "antennaId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "admin_invitations_associationId_email_role_key" ON "admin_invitations"("associationId", "email", "role");

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_tokenHash_key" ON "auth_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "auth_tokens_associationId_type_expiresAt_idx" ON "auth_tokens"("associationId", "type", "expiresAt");

-- CreateIndex
CREATE INDEX "auth_tokens_userId_type_idx" ON "auth_tokens"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionTokenHash_key" ON "sessions"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_expiresAt_idx" ON "sessions"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "sessions_associationId_expiresAt_idx" ON "sessions"("associationId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_sessions_tokenHash_key" ON "refresh_token_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_token_sessions_userId_idx" ON "refresh_token_sessions"("userId");

-- CreateIndex
CREATE INDEX "refresh_token_sessions_associationId_idx" ON "refresh_token_sessions"("associationId");

-- CreateIndex
CREATE INDEX "refresh_token_sessions_expiresAt_idx" ON "refresh_token_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_associationId_idx" ON "password_reset_tokens"("associationId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_security_settings_userId_key" ON "user_security_settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "contributions_ledgerEntryId_key" ON "contributions"("ledgerEntryId");

-- CreateIndex
CREATE INDEX "contributions_associationId_status_submittedAt_idx" ON "contributions"("associationId", "status", "submittedAt");

-- CreateIndex
CREATE INDEX "contributions_antennaId_status_submittedAt_idx" ON "contributions"("antennaId", "status", "submittedAt");

-- CreateIndex
CREATE INDEX "contributions_memberUserId_submittedAt_idx" ON "contributions"("memberUserId", "submittedAt");

-- CreateIndex
CREATE INDEX "contributions_submitterUserId_submittedAt_idx" ON "contributions"("submitterUserId", "submittedAt");

-- CreateIndex
CREATE INDEX "contributions_yearReference_monthReference_idx" ON "contributions"("yearReference", "monthReference");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_ledgerEntryId_key" ON "expenses"("ledgerEntryId");

-- CreateIndex
CREATE INDEX "expenses_associationId_status_expenseDate_idx" ON "expenses"("associationId", "status", "expenseDate");

-- CreateIndex
CREATE INDEX "expenses_antennaId_status_expenseDate_idx" ON "expenses"("antennaId", "status", "expenseDate");

-- CreateIndex
CREATE INDEX "expenses_engagedByUserId_idx" ON "expenses"("engagedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_contributionId_key" ON "ledger_entries"("contributionId");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_expenseId_key" ON "ledger_entries"("expenseId");

-- CreateIndex
CREATE INDEX "ledger_entries_associationId_effectiveDate_idx" ON "ledger_entries"("associationId", "effectiveDate");

-- CreateIndex
CREATE INDEX "ledger_entries_antennaId_effectiveDate_idx" ON "ledger_entries"("antennaId", "effectiveDate");

-- CreateIndex
CREATE INDEX "ledger_entries_type_effectiveDate_idx" ON "ledger_entries"("type", "effectiveDate");

-- CreateIndex
CREATE INDEX "balance_snapshots_associationId_asOf_idx" ON "balance_snapshots"("associationId", "asOf");

-- CreateIndex
CREATE INDEX "balance_snapshots_antennaId_asOf_idx" ON "balance_snapshots"("antennaId", "asOf");

-- CreateIndex
CREATE INDEX "project_proposals_associationId_status_createdAt_idx" ON "project_proposals"("associationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "project_proposals_antennaId_status_createdAt_idx" ON "project_proposals"("antennaId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "project_proposals_authorUserId_createdAt_idx" ON "project_proposals"("authorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "project_proposal_attachments_proposalId_sortOrder_idx" ON "project_proposal_attachments"("proposalId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "project_proposal_attachments_proposalId_fileId_key" ON "project_proposal_attachments"("proposalId", "fileId");

-- CreateIndex
CREATE INDEX "project_proposal_comments_proposalId_createdAt_idx" ON "project_proposal_comments"("proposalId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "projects_sourceProposalId_key" ON "projects"("sourceProposalId");

-- CreateIndex
CREATE INDEX "projects_associationId_status_createdAt_idx" ON "projects"("associationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "projects_antennaId_status_createdAt_idx" ON "projects"("antennaId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "projects_associationId_slug_key" ON "projects"("associationId", "slug");

-- CreateIndex
CREATE INDEX "project_attachments_projectId_sortOrder_idx" ON "project_attachments"("projectId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "project_attachments_projectId_fileId_key" ON "project_attachments"("projectId", "fileId");

-- CreateIndex
CREATE INDEX "project_updates_projectId_published_createdAt_idx" ON "project_updates"("projectId", "published", "createdAt");

-- CreateIndex
CREATE INDEX "project_update_attachments_projectUpdateId_sortOrder_idx" ON "project_update_attachments"("projectUpdateId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "project_update_attachments_projectUpdateId_fileId_key" ON "project_update_attachments"("projectUpdateId", "fileId");

-- CreateIndex
CREATE INDEX "vote_sessions_associationId_status_startsAt_endsAt_idx" ON "vote_sessions"("associationId", "status", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "vote_sessions_projectId_status_idx" ON "vote_sessions"("projectId", "status");

-- CreateIndex
CREATE INDEX "vote_sessions_proposalId_status_idx" ON "vote_sessions"("proposalId", "status");

-- CreateIndex
CREATE INDEX "project_votes_voteSessionId_choice_idx" ON "project_votes"("voteSessionId", "choice");

-- CreateIndex
CREATE UNIQUE INDEX "project_votes_voteSessionId_voterUserId_key" ON "project_votes"("voteSessionId", "voterUserId");

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
CREATE INDEX "news_posts_associationId_scope_status_publishedAt_idx" ON "news_posts"("associationId", "scope", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "news_posts_antennaId_status_publishedAt_idx" ON "news_posts"("antennaId", "status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "news_posts_associationId_slug_key" ON "news_posts"("associationId", "slug");

-- CreateIndex
CREATE INDEX "news_post_attachments_newsPostId_sortOrder_idx" ON "news_post_attachments"("newsPostId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "news_post_attachments_newsPostId_fileId_key" ON "news_post_attachments"("newsPostId", "fileId");

-- CreateIndex
CREATE INDEX "documents_associationId_scope_publishedAt_idx" ON "documents"("associationId", "scope", "publishedAt");

-- CreateIndex
CREATE INDEX "documents_antennaId_publishedAt_idx" ON "documents"("antennaId", "publishedAt");

-- CreateIndex
CREATE INDEX "documents_projectId_publishedAt_idx" ON "documents"("projectId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "file_assets_storageKey_key" ON "file_assets"("storageKey");

-- CreateIndex
CREATE INDEX "file_assets_associationId_category_createdAt_idx" ON "file_assets"("associationId", "category", "createdAt");

-- CreateIndex
CREATE INDEX "file_assets_uploadedByUserId_createdAt_idx" ON "file_assets"("uploadedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_associationId_type_createdAt_idx" ON "notifications"("associationId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_antennaId_createdAt_idx" ON "notifications"("antennaId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_recipients_userId_channel_deliveryStatus_readA_idx" ON "notification_recipients"("userId", "channel", "deliveryStatus", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_recipients_notificationId_userId_channel_key" ON "notification_recipients"("notificationId", "userId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_preferences_userId_key" ON "user_notification_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE INDEX "reminder_run_logs_associationId_kind_triggeredAt_idx" ON "reminder_run_logs"("associationId", "kind", "triggeredAt");

-- CreateIndex
CREATE INDEX "reminder_run_logs_antennaId_kind_triggeredAt_idx" ON "reminder_run_logs"("antennaId", "kind", "triggeredAt");

-- CreateIndex
CREATE UNIQUE INDEX "association_settings_associationId_key_key" ON "association_settings"("associationId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "antenna_settings_antennaId_key_key" ON "antenna_settings"("antennaId", "key");

-- CreateIndex
CREATE INDEX "financial_projections_associationId_periodType_startDate_en_idx" ON "financial_projections"("associationId", "periodType", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "financial_projections_antennaId_periodType_startDate_endDat_idx" ON "financial_projections"("antennaId", "periodType", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "audit_logs_associationId_createdAt_idx" ON "audit_logs"("associationId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_createdAt_idx" ON "audit_logs"("actorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "virtual_cards_userId_key" ON "virtual_cards"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "virtual_cards_cardNumber_key" ON "virtual_cards"("cardNumber");

-- CreateIndex
CREATE UNIQUE INDEX "virtual_cards_qrToken_key" ON "virtual_cards"("qrToken");

-- CreateIndex
CREATE INDEX "virtual_cards_qrToken_idx" ON "virtual_cards"("qrToken");

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
CREATE UNIQUE INDEX "antenna_transfers_senderLedgerEntryId_key" ON "antenna_transfers"("senderLedgerEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "antenna_transfers_receiverLedgerEntryId_key" ON "antenna_transfers"("receiverLedgerEntryId");

-- CreateIndex
CREATE INDEX "antenna_transfers_associationId_status_createdAt_idx" ON "antenna_transfers"("associationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "antenna_transfers_senderAntennaId_status_createdAt_idx" ON "antenna_transfers"("senderAntennaId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "antenna_transfers_receiverAntennaId_status_createdAt_idx" ON "antenna_transfers"("receiverAntennaId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "_EventToAntenna_AB_unique" ON "_EventToAntenna"("A", "B");

-- CreateIndex
CREATE INDEX "_EventToAntenna_B_index" ON "_EventToAntenna"("B");

-- AddForeignKey
ALTER TABLE "associations" ADD CONSTRAINT "associations_logoFileId_fkey" FOREIGN KEY ("logoFileId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antennas" ADD CONSTRAINT "antennas_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antennas" ADD CONSTRAINT "antennas_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_profilePhotoFileId_fkey" FOREIGN KEY ("profilePhotoFileId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_rejectedByUserId_fkey" FOREIGN KEY ("rejectedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_suspendedByUserId_fkey" FOREIGN KEY ("suspendedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_deletedByUserId_fkey" FOREIGN KEY ("deletedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_antennaId_fkey" FOREIGN KEY ("antennaId") REFERENCES "antennas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_rejectedByUserId_fkey" FOREIGN KEY ("rejectedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antenna_admin_assignments" ADD CONSTRAINT "antenna_admin_assignments_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antenna_admin_assignments" ADD CONSTRAINT "antenna_admin_assignments_antennaId_fkey" FOREIGN KEY ("antennaId") REFERENCES "antennas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antenna_admin_assignments" ADD CONSTRAINT "antenna_admin_assignments_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antenna_admin_assignments" ADD CONSTRAINT "antenna_admin_assignments_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antenna_admin_assignments" ADD CONSTRAINT "antenna_admin_assignments_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_antennaId_fkey" FOREIGN KEY ("antennaId") REFERENCES "antennas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token_sessions" ADD CONSTRAINT "refresh_token_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_security_settings" ADD CONSTRAINT "user_security_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_antennaId_fkey" FOREIGN KEY ("antennaId") REFERENCES "antennas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_memberUserId_fkey" FOREIGN KEY ("memberUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_submitterUserId_fkey" FOREIGN KEY ("submitterUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_validatedByUserId_fkey" FOREIGN KEY ("validatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_rejectedByUserId_fkey" FOREIGN KEY ("rejectedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_proofFileId_fkey" FOREIGN KEY ("proofFileId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "ledger_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_antennaId_fkey" FOREIGN KEY ("antennaId") REFERENCES "antennas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_snapshots" ADD CONSTRAINT "balance_snapshots_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_snapshots" ADD CONSTRAINT "balance_snapshots_antennaId_fkey" FOREIGN KEY ("antennaId") REFERENCES "antennas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_proposals" ADD CONSTRAINT "project_proposals_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_proposals" ADD CONSTRAINT "project_proposals_antennaId_fkey" FOREIGN KEY ("antennaId") REFERENCES "antennas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_proposals" ADD CONSTRAINT "project_proposals_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_proposals" ADD CONSTRAINT "project_proposals_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_proposal_attachments" ADD CONSTRAINT "project_proposal_attachments_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "project_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_proposal_attachments" ADD CONSTRAINT "project_proposal_attachments_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_proposal_comments" ADD CONSTRAINT "project_proposal_comments_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "project_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_proposal_comments" ADD CONSTRAINT "project_proposal_comments_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_antennaId_fkey" FOREIGN KEY ("antennaId") REFERENCES "antennas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_coverImageFileId_fkey" FOREIGN KEY ("coverImageFileId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_sourceProposalId_fkey" FOREIGN KEY ("sourceProposalId") REFERENCES "project_proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_attachments" ADD CONSTRAINT "project_attachments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_attachments" ADD CONSTRAINT "project_attachments_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_update_attachments" ADD CONSTRAINT "project_update_attachments_projectUpdateId_fkey" FOREIGN KEY ("projectUpdateId") REFERENCES "project_updates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_update_attachments" ADD CONSTRAINT "project_update_attachments_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vote_sessions" ADD CONSTRAINT "vote_sessions_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vote_sessions" ADD CONSTRAINT "vote_sessions_antennaId_fkey" FOREIGN KEY ("antennaId") REFERENCES "antennas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vote_sessions" ADD CONSTRAINT "vote_sessions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vote_sessions" ADD CONSTRAINT "vote_sessions_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "project_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vote_sessions" ADD CONSTRAINT "vote_sessions_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_votes" ADD CONSTRAINT "project_votes_voteSessionId_fkey" FOREIGN KEY ("voteSessionId") REFERENCES "vote_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_votes" ADD CONSTRAINT "project_votes_voterUserId_fkey" FOREIGN KEY ("voterUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "news_posts" ADD CONSTRAINT "news_posts_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_posts" ADD CONSTRAINT "news_posts_antennaId_fkey" FOREIGN KEY ("antennaId") REFERENCES "antennas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_posts" ADD CONSTRAINT "news_posts_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_posts" ADD CONSTRAINT "news_posts_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_posts" ADD CONSTRAINT "news_posts_coverImageFileId_fkey" FOREIGN KEY ("coverImageFileId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_post_attachments" ADD CONSTRAINT "news_post_attachments_newsPostId_fkey" FOREIGN KEY ("newsPostId") REFERENCES "news_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_post_attachments" ADD CONSTRAINT "news_post_attachments_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_antennaId_fkey" FOREIGN KEY ("antennaId") REFERENCES "antennas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_antennaId_fkey" FOREIGN KEY ("antennaId") REFERENCES "antennas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_run_logs" ADD CONSTRAINT "reminder_run_logs_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_run_logs" ADD CONSTRAINT "reminder_run_logs_antennaId_fkey" FOREIGN KEY ("antennaId") REFERENCES "antennas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_run_logs" ADD CONSTRAINT "reminder_run_logs_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "association_settings" ADD CONSTRAINT "association_settings_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "association_settings" ADD CONSTRAINT "association_settings_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antenna_settings" ADD CONSTRAINT "antenna_settings_antennaId_fkey" FOREIGN KEY ("antennaId") REFERENCES "antennas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antenna_settings" ADD CONSTRAINT "antenna_settings_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_projections" ADD CONSTRAINT "financial_projections_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_projections" ADD CONSTRAINT "financial_projections_antennaId_fkey" FOREIGN KEY ("antennaId") REFERENCES "antennas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_projections" ADD CONSTRAINT "financial_projections_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_antennaId_fkey" FOREIGN KEY ("antennaId") REFERENCES "antennas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_cards" ADD CONSTRAINT "virtual_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "_EventToAntenna" ADD CONSTRAINT "_EventToAntenna_A_fkey" FOREIGN KEY ("A") REFERENCES "antennas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventToAntenna" ADD CONSTRAINT "_EventToAntenna_B_fkey" FOREIGN KEY ("B") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
