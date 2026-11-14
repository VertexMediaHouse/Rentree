-- ⚠ PARKED — NOT what the app currently runs on.
-- This is the Supabase-Auth + Row Level Security variant. It needs dashboard access (to apply it,
-- set SMTP and edit the code email) and a service_role key, none of which we have. The live schema
-- is prisma/migrations/20261016000000_init/migration.sql, where Express owns authorization.

-- Rentre — schema for Supabase Postgres.
--
-- Differences from the previous Prisma-managed schema, all because Supabase Auth now owns identity:
--   * public.users.id is a foreign key to auth.users(id), so auth.uid() = users.id and every RLS
--     policy is a direct comparison rather than a join.
--   * users."passwordHash" is gone — Supabase Auth holds credentials.
--   * the otp_codes table is gone — Supabase Auth issues and verifies the email codes.
--   * "updatedAt" is maintained by a trigger. Prisma set it from the client; writes now arrive
--     through PostgREST, which would never touch it.
--
-- Column names stay camelCase and quoted, matching the existing API payloads. PostgREST handles
-- them fine; renaming 100+ columns to snake_case would be churn with no behavioural gain.

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE "UserRole" AS ENUM ('TENANT', 'LANDLORD', 'REALTOR');
CREATE TYPE "ApplicationStatus" AS ENUM ('REVIEWING', 'INTERVIEW', 'APPROVED', 'DECLINED', 'WITHDRAWN');
CREATE TYPE "ScreeningStep" AS ENUM ('REFERENCE', 'INTERVIEW', 'REPORT');
CREATE TYPE "ScreeningCheckStatus" AS ENUM ('CALLING', 'DONE', 'FAILED');
CREATE TYPE "LeadIntent" AS ENUM ('SAVE_REPORT', 'RENT_ALERTS', 'RENEWAL_TIPS');
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'VERIFIED');
CREATE TYPE "OwnershipProofType" AS ENUM ('PROPERTY_TAX_BILL', 'UTILITY_BILL');
CREATE TYPE "ServiceAddon" AS ENUM ('REFERENCE_CALL', 'LOCKBOX', 'LEASE_SIGNING', 'RENT_BACK', 'THIRD_PARTY_SCREENING');
CREATE TYPE "AddonRequestKind" AS ENUM ('SERVICES', 'DOCUMENTS', 'VIEWING');
CREATE TYPE "AddonRequestStatus" AS ENUM ('REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "DocumentKind" AS ENUM (
  'PAYSTUBS', 'BANK_STATEMENT', 'EMPLOYMENT_LETTER', 'NOTICE_OF_ASSESSMENT', 'REFERENCE_LETTER',
  'GOVERNMENT_ID', 'CREDIT_REPORT', 'INCOME_PROOF', 'PROPERTY_TAX_BILL', 'UTILITY_BILL', 'LEASE_FILE'
);

-- ─── Shared trigger: keep "updatedAt" honest ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."updatedAt" := now();
  RETURN NEW;
END;
$$;

-- ─── Identity ────────────────────────────────────────────────────────────────

CREATE TABLE public.users (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  name        text NOT NULL,
  role        "UserRole" NOT NULL DEFAULT 'TENANT',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  -- Soft delete: leases and signatures must outlive account closure.
  "deletedAt" timestamptz
);
CREATE UNIQUE INDEX users_email_key ON public.users (lower(email));
CREATE INDEX users_role_idx ON public.users (role);
CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

/**
 * Mirrors a new auth.users row into public.users. `name` and `role` come from the metadata the
 * client passes to signInWithOtp/signUp; both have fallbacks so a signup can never fail here.
 * SECURITY DEFINER because the trigger runs as the authenticating user, who cannot write this table.
 */
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'name'), ''), split_part(NEW.email, '@', 1)),
    COALESCE(
      NULLIF(UPPER(NEW.raw_user_meta_data ->> 'role'), '')::"UserRole",
      'TENANT'::"UserRole"
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Listings ────────────────────────────────────────────────────────────────

CREATE TABLE public.listings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ownerId"       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  address         text NOT NULL,
  unit            text,
  neighbourhood   text NOT NULL,
  city            text NOT NULL,
  price           numeric(10,2) NOT NULL,
  "unitType"      text NOT NULL,
  bedrooms        integer NOT NULL,
  bathrooms       numeric(3,1) NOT NULL,
  sqft            integer NOT NULL,
  "yearBuilt"     integer NOT NULL,
  "rentControlled" boolean NOT NULL,
  -- Free text in the UI ("Aug 1, 2025"), not a date.
  "moveIn"        text NOT NULL,
  "leaseTerm"     text NOT NULL,
  image           text NOT NULL,
  photos          text[] NOT NULL DEFAULT '{}',
  "floorPlan"     text NOT NULL DEFAULT '',
  landlord        text NOT NULL,
  "addOns"        jsonb NOT NULL DEFAULT '[]',
  scores          jsonb NOT NULL,
  "createdAt"     timestamptz NOT NULL DEFAULT now(),
  "updatedAt"     timestamptz NOT NULL DEFAULT now(),
  "deletedAt"     timestamptz
);
CREATE INDEX listings_city_price_idx ON public.listings (city, price);
CREATE INDEX listings_owner_idx ON public.listings ("ownerId");
CREATE INDEX listings_created_idx ON public.listings ("createdAt");
CREATE INDEX listings_deleted_idx ON public.listings ("deletedAt");
CREATE TRIGGER listings_updated_at BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Applications & screening ────────────────────────────────────────────────

CREATE TABLE public.applications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "listingId"     uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  "tenantId"      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "tenantName"    text NOT NULL,
  message         text,
  "monthlyIncome" numeric(12,2),
  "creditScore"   integer,
  status          "ApplicationStatus" NOT NULL DEFAULT 'REVIEWING',
  "createdAt"     timestamptz NOT NULL DEFAULT now(),
  "updatedAt"     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX applications_listing_tenant_idx ON public.applications ("listingId", "tenantId");
CREATE INDEX applications_tenant_created_idx ON public.applications ("tenantId", "createdAt");
CREATE INDEX applications_listing_status_idx ON public.applications ("listingId", status);
-- A tenant holds at most ONE live application per listing, but may re-apply after withdrawing.
-- A plain unique index cannot express that, and without it two concurrent inserts both succeed.
CREATE UNIQUE INDEX applications_one_live_per_tenant
  ON public.applications ("listingId", "tenantId")
  WHERE status <> 'WITHDRAWN';
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- A row's existence IS the tenant's consent; withdrawing it deletes the row.
CREATE TABLE public.screening_opt_ins (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "applicationId" uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  step            "ScreeningStep" NOT NULL,
  "contactName"   text,
  -- E.164. Never exposed to landlords: Rentre places the call itself.
  "contactPhone"  text,
  relationship    text,
  "consentedAt"   timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("applicationId", step)
);

CREATE TABLE public.screening_checks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "applicationId"  uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  step             "ScreeningStep" NOT NULL,
  status           "ScreeningCheckStatus" NOT NULL DEFAULT 'CALLING',
  "conversationId" text,
  summary          text,
  transcript       jsonb,
  "createdAt"      timestamptz NOT NULL DEFAULT now(),
  "updatedAt"      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX screening_checks_app_step_idx ON public.screening_checks ("applicationId", step);
CREATE INDEX screening_checks_conversation_idx ON public.screening_checks ("conversationId");
CREATE TRIGGER screening_checks_updated_at BEFORE UPDATE ON public.screening_checks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Tenant profile (the renter passport) ────────────────────────────────────

CREATE TABLE public.tenant_profiles (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"  uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,

  "fullName" text,
  email      text,
  phone      text,
  city       text,
  areas      text[] NOT NULL DEFAULT '{}',

  "unitType"     text,
  bedrooms       text,
  "moveIn"       text,
  "budgetMin"    numeric(10,2),
  "budgetMax"    numeric(10,2),
  "leaseTerm"    text,
  "coApplicants" boolean NOT NULL DEFAULT false,

  employment         text,
  employer           text,
  "jobTitle"         text,
  -- Self-reported.
  income             text,
  -- Provider-verified; deliberately separate from the self-reported figure above.
  "verifiedIncome"   numeric(12,2),
  "incomeSource"     text,
  "employerDuration" text,
  "incomeVerifiedAt" timestamptz,
  "incomeStatus"     "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',

  "currentAddress"  text,
  "timeAtAddress"   text,
  "currentLandlord" text,
  -- Withheld from shared passports: Rentre runs the reference call.
  "landlordPhone"   text,

  "priorLandlord"     text,
  "priorProperty"     text,
  "priorRelationship" text,
  "priorContact"      text,
  "confirmedTenancy"  boolean,
  "confirmedOnTime"   boolean,

  "identityConsent"    boolean NOT NULL DEFAULT false,
  "identityStatus"     "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "identityMethod"     text,
  "identityVerifiedAt" timestamptz,

  -- Consent is the renter's to give; status belongs to the provider callback.
  "creditConsent"     boolean NOT NULL DEFAULT false,
  "creditStatus"      "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "backgroundConsent" boolean NOT NULL DEFAULT false,
  "backgroundStatus"  "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "reportPulledAt"    timestamptz,
  "paymentHistory"    text,
  "ltbRecord"         text,

  "pipedaConsentAt" timestamptz,

  -- Written and read whole, never filtered on, so these stay JSON rather than ~15 columns.
  "landlordReference"  jsonb,
  "characterReference" jsonb,
  guarantor            jsonb,

  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER tenant_profiles_updated_at BEFORE UPDATE ON public.tenant_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Shared passports ────────────────────────────────────────────────────────

CREATE TABLE public.shared_passports (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The capability in the emailed link. Unguessable, and never selectable by anon directly.
  token             uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  "ownerId"         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "recipientName"   text,
  "recipientEmail"  text,
  "recipientUnit"   text,
  -- The point-in-time snapshot: only the fields the renter ticked.
  data              jsonb NOT NULL,
  "buildingAddress" text,
  "createdAt"       timestamptz NOT NULL DEFAULT now(),
  "expiresAt"       timestamptz NOT NULL,
  -- Renter-initiated, independent of expiry.
  "revokedAt"       timestamptz,
  CONSTRAINT shared_passports_expiry_after_creation CHECK ("expiresAt" > "createdAt")
);
CREATE INDEX shared_passports_owner_idx ON public.shared_passports ("ownerId", "createdAt");
CREATE INDEX shared_passports_expires_idx ON public.shared_passports ("expiresAt");

-- "Rentre logs all access for compliance": one row per landlord unlock.
CREATE TABLE public.passport_accesses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "passportId"      uuid NOT NULL REFERENCES public.shared_passports(id) ON DELETE CASCADE,
  "viewerId"        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  "claimedUnit"     text NOT NULL,
  "proofType"       "OwnershipProofType" NOT NULL,
  -- The gate reads only the chosen file's name; no bytes are uploaded yet.
  "proofFileName"   text,
  "proofDocumentId" uuid,
  "ipAddress"       text,
  "userAgent"       text,
  "verifiedAt"      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX passport_accesses_passport_idx ON public.passport_accesses ("passportId", "verifiedAt");

CREATE TABLE public.addon_requests (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "passportId"         uuid NOT NULL REFERENCES public.shared_passports(id) ON DELETE CASCADE,
  "requesterId"        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  kind                 "AddonRequestKind" NOT NULL,
  status               "AddonRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "claimedUnit"        text NOT NULL,
  addons               "ServiceAddon"[] NOT NULL DEFAULT '{}',
  "referenceQuestions" text[] NOT NULL DEFAULT '{}',
  "requestedDocuments" "DocumentKind"[] NOT NULL DEFAULT '{}',
  "viewingDay"         text,
  "viewingDate"        text,
  "viewingTime"        text,
  "viewingNote"        text,
  "createdAt"          timestamptz NOT NULL DEFAULT now(),
  "updatedAt"          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX addon_requests_passport_kind_idx ON public.addon_requests ("passportId", kind);
CREATE INDEX addon_requests_status_idx ON public.addon_requests (status);
CREATE TRIGGER addon_requests_updated_at BEFORE UPDATE ON public.addon_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Leases ──────────────────────────────────────────────────────────────────

CREATE TABLE public.leases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token           uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  -- A lease starts from an approved application OR from a shared passport whose landlord ordered
  -- lease signing. Exactly one, enforced below.
  "applicationId" uuid UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  "passportId"    uuid REFERENCES public.shared_passports(id) ON DELETE SET NULL,
  "landlordId"    uuid NOT NULL REFERENCES public.users(id),
  "tenantId"      uuid NOT NULL REFERENCES public.users(id),
  -- Snapshotted so the signed document stays readable if the accounts change later.
  "tenantName"    text NOT NULL,
  "tenantEmail"   text NOT NULL,
  address         text NOT NULL,
  "startDate"     date NOT NULL,
  "endDate"       date,
  "monthlyRent"   numeric(10,2) NOT NULL,
  deposit         numeric(10,2),
  terms           text NOT NULL,
  -- SHA-256 over the agreed content; re-checked at signing to detect tampering.
  hash            text NOT NULL,

  "landlordSignatureName"    text NOT NULL,
  "landlordSignedAt"         timestamptz NOT NULL,
  "landlordSignatureIp"      text,
  "tenantSignatureName"      text,
  "tenantSignedAt"           timestamptz,
  "tenantSignatureIp"        text,
  "tenantSignatureUserAgent" text,

  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT leases_end_after_start CHECK ("endDate" IS NULL OR "endDate" > "startDate"),
  CONSTRAINT leases_one_origin CHECK (num_nonnulls("applicationId", "passportId") = 1)
);
CREATE INDEX leases_landlord_idx ON public.leases ("landlordId");
CREATE INDEX leases_tenant_idx ON public.leases ("tenantId");
CREATE INDEX leases_passport_idx ON public.leases ("passportId");
CREATE TRIGGER leases_updated_at BEFORE UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Documents ───────────────────────────────────────────────────────────────

-- Metadata only. Bytes belong in Supabase Storage; "storagePath" is the object key.
CREATE TABLE public.documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ownerId"     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind          "DocumentKind" NOT NULL,
  "fileName"    text NOT NULL,
  "storagePath" text NOT NULL UNIQUE,
  "mimeType"    text NOT NULL,
  "sizeBytes"   integer NOT NULL,
  "uploadedAt"  timestamptz NOT NULL DEFAULT now(),
  -- Soft delete: a document cited by a signed lease or an access log must stay referencable.
  "deletedAt"   timestamptz
);
CREATE INDEX documents_owner_kind_idx ON public.documents ("ownerId", kind);
CREATE INDEX documents_deleted_idx ON public.documents ("deletedAt");

ALTER TABLE public.passport_accesses
  ADD CONSTRAINT passport_accesses_proof_document_fkey
  FOREIGN KEY ("proofDocumentId") REFERENCES public.documents(id) ON DELETE SET NULL;

-- ─── Marketing ───────────────────────────────────────────────────────────────

CREATE TABLE public.leads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            text NOT NULL UNIQUE,
  intents          "LeadIntent"[] NOT NULL DEFAULT '{}',
  city             text,
  "reportSnapshot" jsonb,
  "createdAt"      timestamptz NOT NULL DEFAULT now(),
  "updatedAt"      timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
