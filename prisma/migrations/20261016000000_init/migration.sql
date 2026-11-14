warn The configuration property `package.json#prisma` is deprecated and will be removed in Prisma 7. Please migrate to a Prisma config file (e.g., `prisma.config.ts`).
For more information, see: https://pris.ly/prisma-config

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('TENANT', 'LANDLORD', 'REALTOR');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('REVIEWING', 'INTERVIEW', 'APPROVED', 'DECLINED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ScreeningStep" AS ENUM ('REFERENCE', 'INTERVIEW', 'REPORT');

-- CreateEnum
CREATE TYPE "ScreeningCheckStatus" AS ENUM ('CALLING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "LeadIntent" AS ENUM ('SAVE_REPORT', 'RENT_ALERTS', 'RENEWAL_TIPS');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'VERIFIED');

-- CreateEnum
CREATE TYPE "OwnershipProofType" AS ENUM ('PROPERTY_TAX_BILL', 'UTILITY_BILL');

-- CreateEnum
CREATE TYPE "ServiceAddon" AS ENUM ('REFERENCE_CALL', 'LOCKBOX', 'LEASE_SIGNING', 'RENT_BACK', 'THIRD_PARTY_SCREENING');

-- CreateEnum
CREATE TYPE "AddonRequestKind" AS ENUM ('SERVICES', 'DOCUMENTS', 'VIEWING');

-- CreateEnum
CREATE TYPE "AddonRequestStatus" AS ENUM ('REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('PAYSTUBS', 'BANK_STATEMENT', 'EMPLOYMENT_LETTER', 'NOTICE_OF_ASSESSMENT', 'REFERENCE_LETTER', 'GOVERNMENT_ID', 'CREDIT_REPORT', 'INCOME_PROOF', 'PROPERTY_TAX_BILL', 'UTILITY_BILL', 'LEASE_FILE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "name" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "sentAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMPTZ(6),

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" UUID NOT NULL,
    "ownerId" UUID,
    "address" TEXT NOT NULL,
    "unit" TEXT,
    "neighbourhood" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "unitType" TEXT NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" DECIMAL(3,1) NOT NULL,
    "sqft" INTEGER NOT NULL,
    "yearBuilt" INTEGER NOT NULL,
    "rentControlled" BOOLEAN NOT NULL,
    "moveIn" TEXT NOT NULL,
    "leaseTerm" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "photos" TEXT[],
    "floorPlan" TEXT NOT NULL DEFAULT '',
    "landlord" TEXT NOT NULL,
    "addOns" JSONB NOT NULL DEFAULT '[]',
    "scores" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "tenantName" TEXT NOT NULL,
    "message" TEXT,
    "monthlyIncome" DECIMAL(12,2),
    "creditScore" INTEGER,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'REVIEWING',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screening_opt_ins" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "step" "ScreeningStep" NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "relationship" TEXT,
    "consentedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screening_opt_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screening_checks" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "step" "ScreeningStep" NOT NULL,
    "status" "ScreeningCheckStatus" NOT NULL DEFAULT 'CALLING',
    "conversationId" TEXT,
    "summary" TEXT,
    "transcript" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "screening_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leases" (
    "id" UUID NOT NULL,
    "token" UUID NOT NULL,
    "applicationId" UUID,
    "passportId" UUID,
    "landlordId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "tenantName" TEXT NOT NULL,
    "tenantEmail" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "monthlyRent" DECIMAL(10,2) NOT NULL,
    "deposit" DECIMAL(10,2),
    "terms" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "landlordSignatureName" TEXT NOT NULL,
    "landlordSignedAt" TIMESTAMPTZ(6) NOT NULL,
    "landlordSignatureIp" TEXT,
    "tenantSignatureName" TEXT,
    "tenantSignedAt" TIMESTAMPTZ(6),
    "tenantSignatureIp" TEXT,
    "tenantSignatureUserAgent" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "leases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "fullName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "areas" TEXT[],
    "unitType" TEXT,
    "bedrooms" TEXT,
    "moveIn" TEXT,
    "budgetMin" DECIMAL(10,2),
    "budgetMax" DECIMAL(10,2),
    "leaseTerm" TEXT,
    "coApplicants" BOOLEAN NOT NULL DEFAULT false,
    "employment" TEXT,
    "employer" TEXT,
    "jobTitle" TEXT,
    "income" TEXT,
    "verifiedIncome" DECIMAL(12,2),
    "incomeSource" TEXT,
    "employerDuration" TEXT,
    "incomeVerifiedAt" TIMESTAMPTZ(6),
    "incomeStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "currentAddress" TEXT,
    "timeAtAddress" TEXT,
    "currentLandlord" TEXT,
    "landlordPhone" TEXT,
    "priorLandlord" TEXT,
    "priorProperty" TEXT,
    "priorRelationship" TEXT,
    "priorContact" TEXT,
    "confirmedTenancy" BOOLEAN,
    "confirmedOnTime" BOOLEAN,
    "identityConsent" BOOLEAN NOT NULL DEFAULT false,
    "identityStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "identityMethod" TEXT,
    "identityVerifiedAt" TIMESTAMPTZ(6),
    "creditConsent" BOOLEAN NOT NULL DEFAULT false,
    "creditStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "backgroundConsent" BOOLEAN NOT NULL DEFAULT false,
    "backgroundStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "reportPulledAt" TIMESTAMPTZ(6),
    "paymentHistory" TEXT,
    "ltbRecord" TEXT,
    "pipedaConsentAt" TIMESTAMPTZ(6),
    "landlordReference" JSONB,
    "characterReference" JSONB,
    "guarantor" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_passports" (
    "id" UUID NOT NULL,
    "token" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "recipientName" TEXT,
    "recipientEmail" TEXT,
    "recipientUnit" TEXT,
    "data" JSONB NOT NULL,
    "buildingAddress" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),

    CONSTRAINT "shared_passports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passport_accesses" (
    "id" UUID NOT NULL,
    "passportId" UUID NOT NULL,
    "viewerId" UUID,
    "claimedUnit" TEXT NOT NULL,
    "proofType" "OwnershipProofType" NOT NULL,
    "proofFileName" TEXT,
    "proofDocumentId" UUID,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "verifiedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "passport_accesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addon_requests" (
    "id" UUID NOT NULL,
    "passportId" UUID NOT NULL,
    "requesterId" UUID,
    "kind" "AddonRequestKind" NOT NULL,
    "status" "AddonRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "claimedUnit" TEXT NOT NULL,
    "addons" "ServiceAddon"[],
    "referenceQuestions" TEXT[],
    "requestedDocuments" "DocumentKind"[],
    "viewingDay" TEXT,
    "viewingDate" TEXT,
    "viewingTime" TEXT,
    "viewingNote" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "addon_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "intents" "LeadIntent"[],
    "city" TEXT,
    "reportSnapshot" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE INDEX "otp_codes_expiresAt_idx" ON "otp_codes"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "otp_codes_email_key" ON "otp_codes"("email");

-- CreateIndex
CREATE INDEX "listings_city_price_idx" ON "listings"("city", "price");

-- CreateIndex
CREATE INDEX "listings_ownerId_idx" ON "listings"("ownerId");

-- CreateIndex
CREATE INDEX "listings_createdAt_idx" ON "listings"("createdAt");

-- CreateIndex
CREATE INDEX "listings_deletedAt_idx" ON "listings"("deletedAt");

-- CreateIndex
CREATE INDEX "applications_listingId_tenantId_idx" ON "applications"("listingId", "tenantId");

-- CreateIndex
CREATE INDEX "applications_tenantId_createdAt_idx" ON "applications"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "applications_listingId_status_idx" ON "applications"("listingId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "screening_opt_ins_applicationId_step_key" ON "screening_opt_ins"("applicationId", "step");

-- CreateIndex
CREATE INDEX "screening_checks_applicationId_step_idx" ON "screening_checks"("applicationId", "step");

-- CreateIndex
CREATE INDEX "screening_checks_conversationId_idx" ON "screening_checks"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "leases_token_key" ON "leases"("token");

-- CreateIndex
CREATE UNIQUE INDEX "leases_applicationId_key" ON "leases"("applicationId");

-- CreateIndex
CREATE INDEX "leases_landlordId_idx" ON "leases"("landlordId");

-- CreateIndex
CREATE INDEX "leases_tenantId_idx" ON "leases"("tenantId");

-- CreateIndex
CREATE INDEX "leases_passportId_idx" ON "leases"("passportId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_profiles_userId_key" ON "tenant_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "shared_passports_token_key" ON "shared_passports"("token");

-- CreateIndex
CREATE INDEX "shared_passports_ownerId_createdAt_idx" ON "shared_passports"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "shared_passports_expiresAt_idx" ON "shared_passports"("expiresAt");

-- CreateIndex
CREATE INDEX "passport_accesses_passportId_verifiedAt_idx" ON "passport_accesses"("passportId", "verifiedAt");

-- CreateIndex
CREATE INDEX "addon_requests_passportId_kind_idx" ON "addon_requests"("passportId", "kind");

-- CreateIndex
CREATE INDEX "addon_requests_status_idx" ON "addon_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "documents_storagePath_key" ON "documents"("storagePath");

-- CreateIndex
CREATE INDEX "documents_ownerId_kind_idx" ON "documents"("ownerId", "kind");

-- CreateIndex
CREATE INDEX "documents_deletedAt_idx" ON "documents"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "leads_email_key" ON "leads"("email");

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_opt_ins" ADD CONSTRAINT "screening_opt_ins_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_checks" ADD CONSTRAINT "screening_checks_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_passportId_fkey" FOREIGN KEY ("passportId") REFERENCES "shared_passports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_profiles" ADD CONSTRAINT "tenant_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_passports" ADD CONSTRAINT "shared_passports_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passport_accesses" ADD CONSTRAINT "passport_accesses_passportId_fkey" FOREIGN KEY ("passportId") REFERENCES "shared_passports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passport_accesses" ADD CONSTRAINT "passport_accesses_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passport_accesses" ADD CONSTRAINT "passport_accesses_proofDocumentId_fkey" FOREIGN KEY ("proofDocumentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addon_requests" ADD CONSTRAINT "addon_requests_passportId_fkey" FOREIGN KEY ("passportId") REFERENCES "shared_passports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addon_requests" ADD CONSTRAINT "addon_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Raw SQL beyond what the Prisma datamodel can express.
-- ─────────────────────────────────────────────────────────────────────────────

-- A tenant may hold only ONE live application per listing, but may re-apply after withdrawing.
-- Prisma has no syntax for a filtered unique index, so it is declared here. This closes the race
-- where two concurrent POSTs both pass the existence check in routes/applications.ts.
CREATE UNIQUE INDEX "applications_one_live_per_tenant"
  ON "applications" ("listingId", "tenantId")
  WHERE "status" <> 'WITHDRAWN';

-- A lease cannot end before it starts. createLeaseSchema refuses this at the edge; this keeps it
-- true for anything written outside the API (seeds, imports, SQL console).
ALTER TABLE "leases"
  ADD CONSTRAINT "leases_end_after_start"
  CHECK ("endDate" IS NULL OR "endDate" > "startDate");

-- Expiry must be after creation, or a share link would arrive already dead.
ALTER TABLE "shared_passports"
  ADD CONSTRAINT "shared_passports_expiry_after_creation"
  CHECK ("expiresAt" > "createdAt");

-- A lease originates from an approved application OR from a shared passport (the landlord ordering
-- lease signing), never both and never neither. Nullable columns alone cannot say that.
ALTER TABLE "leases"
  ADD CONSTRAINT "leases_one_origin"
  CHECK (num_nonnulls("applicationId", "passportId") = 1);
