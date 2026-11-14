-- Co-tenant and co-signing selection on the renter's rental package.
--
-- Additive and nullable only: no existing row changes, no column is dropped or retyped, so this
-- is safe to apply to a database with live profiles in it.
ALTER TABLE "tenant_profiles" ADD COLUMN "tenancyKind" TEXT;
ALTER TABLE "tenant_profiles" ADD COLUMN "coTenants" JSONB;
