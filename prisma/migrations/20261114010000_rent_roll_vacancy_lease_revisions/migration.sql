-- Rent roll, vacancy alerts and lease revisions.
--
-- Purely additive: four new enums, four new tables, no change to any existing table or column.
-- Nothing is dropped or retyped, so this is safe to apply to a database with live data. A lease
-- with no rows in lease_revisions behaves exactly as it did before this migration.

CREATE TYPE "LeaseRevisionStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "LeaseRevisionParty" AS ENUM ('LANDLORD', 'TENANT');
CREATE TYPE "NotificationKind" AS ENUM ('VACANCY_MATCH', 'LEASE_REVISION', 'APPLICATION_STATUS');

-- ── Rent roll ───────────────────────────────────────────────────────────────
CREATE TABLE "rent_roll_entries" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "uploadedById" UUID NOT NULL,
    "unit" TEXT NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "rent" DECIMAL(10,2) NOT NULL,
    "vacant" BOOLEAN NOT NULL DEFAULT false,
    "availableFrom" DATE,
    "leaseEnd" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "rent_roll_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rent_roll_entries_listingId_unit_key" ON "rent_roll_entries"("listingId", "unit");
CREATE INDEX "rent_roll_entries_listingId_vacant_idx" ON "rent_roll_entries"("listingId", "vacant");
CREATE INDEX "rent_roll_entries_uploadedById_idx" ON "rent_roll_entries"("uploadedById");

ALTER TABLE "rent_roll_entries" ADD CONSTRAINT "rent_roll_entries_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rent_roll_entries" ADD CONSTRAINT "rent_roll_entries_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Saved buildings (vacancy watch) ─────────────────────────────────────────
CREATE TABLE "saved_buildings" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "moveInFrom" DATE,
    "moveInTo" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_buildings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "saved_buildings_userId_listingId_key" ON "saved_buildings"("userId", "listingId");
CREATE INDEX "saved_buildings_listingId_idx" ON "saved_buildings"("listingId");

ALTER TABLE "saved_buildings" ADD CONSTRAINT "saved_buildings_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_buildings" ADD CONSTRAINT "saved_buildings_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Notifications ───────────────────────────────────────────────────────────
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Lease revisions ─────────────────────────────────────────────────────────
CREATE TABLE "lease_revisions" (
    "id" UUID NOT NULL,
    "leaseId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "proposedBy" "LeaseRevisionParty" NOT NULL,
    "status" "LeaseRevisionStatus" NOT NULL DEFAULT 'PROPOSED',
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "monthlyRent" DECIMAL(10,2) NOT NULL,
    "deposit" DECIMAL(10,2),
    "terms" TEXT NOT NULL,
    "note" TEXT,
    "decidedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lease_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lease_revisions_leaseId_version_key" ON "lease_revisions"("leaseId", "version");
CREATE INDEX "lease_revisions_leaseId_status_idx" ON "lease_revisions"("leaseId", "status");

ALTER TABLE "lease_revisions" ADD CONSTRAINT "lease_revisions_leaseId_fkey"
    FOREIGN KEY ("leaseId") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
