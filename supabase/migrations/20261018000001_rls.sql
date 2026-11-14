-- ⚠ PARKED — NOT what the app currently runs on.
-- This is the Supabase-Auth + Row Level Security variant. It needs dashboard access (to apply it,
-- set SMTP and edit the code email) and a service_role key, none of which we have. The live schema
-- is prisma/migrations/20261016000000_init/migration.sql, where Express owns authorization.

-- Row Level Security for Rentre.
--
-- Default is deny: RLS is enabled on every table and anything without a matching policy is
-- refused. `service_role` bypasses RLS entirely — the Express API uses it for the work that cannot
-- live in the browser (Resend email, ElevenLabs calls, the lease hash check).
--
-- Two flows are opened by people with NO account, via an emailed link: the shared passport and the
-- lease. A policy permissive enough for `anon` to find a row by token would also let anyone page
-- through every row, so those go through SECURITY DEFINER functions at the bottom instead, and the
-- tables stay closed to anon.

ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening_opt_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening_checks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_passports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_accesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addon_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads             ENABLE ROW LEVEL SECURITY;

-- ─── users ───────────────────────────────────────────────────────────────────
-- Own row only. No policy lets one account read another, which is why applications and leases
-- snapshot the counterparty's name at write time instead of joining.

CREATE POLICY users_select_self ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Role is self-selected in this product (the "For Landlords" button), and being a landlord only
-- grants access to your OWN listings, so it is not an escalation over anyone else's data.
CREATE POLICY users_update_self ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ─── listings ────────────────────────────────────────────────────────────────
-- Browsing is public, matching the signed-out search and listing pages.

CREATE POLICY listings_select_public ON public.listings
  FOR SELECT TO anon, authenticated
  USING ("deletedAt" IS NULL);

CREATE POLICY listings_insert_own ON public.listings
  FOR INSERT TO authenticated
  WITH CHECK (
    "ownerId" = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('LANDLORD', 'REALTOR')
    )
  );

-- Covers the soft delete too, which is an UPDATE of "deletedAt".
CREATE POLICY listings_update_own ON public.listings
  FOR UPDATE TO authenticated
  USING ("ownerId" = auth.uid())
  WITH CHECK ("ownerId" = auth.uid());

-- ─── applications ────────────────────────────────────────────────────────────

CREATE POLICY applications_select_party ON public.applications
  FOR SELECT TO authenticated
  USING (
    "tenantId" = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = "listingId" AND l."ownerId" = auth.uid()
    )
  );

CREATE POLICY applications_insert_own ON public.applications
  FOR INSERT TO authenticated
  WITH CHECK ("tenantId" = auth.uid());

-- Policies are OR'd, so these two together reproduce the old rule exactly: a tenant may only
-- withdraw, and a landlord may set anything except withdrawn.
CREATE POLICY applications_withdraw_own ON public.applications
  FOR UPDATE TO authenticated
  USING ("tenantId" = auth.uid())
  WITH CHECK ("tenantId" = auth.uid() AND status = 'WITHDRAWN');

CREATE POLICY applications_decide_as_owner ON public.applications
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = "listingId" AND l."ownerId" = auth.uid()))
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = "listingId" AND l."ownerId" = auth.uid())
    AND status <> 'WITHDRAWN'
  );

-- ─── screening_opt_ins ───────────────────────────────────────────────────────
-- The tenant manages their own consent rows. Landlords get NO access to this table because it
-- holds the reference's phone number — they read the consent through the view below instead.

CREATE POLICY opt_ins_all_own ON public.screening_opt_ins
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = "applicationId" AND a."tenantId" = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = "applicationId" AND a."tenantId" = auth.uid()));

/**
 * Consent without the contact details. RLS is row-level and cannot hide a column, so the phone is
 * excluded by projection here. The view runs as its owner (security_invoker is off by default), so
 * it bypasses the table policy above and authorises through its own WHERE clause.
 */
CREATE VIEW public.screening_consents AS
SELECT
  o."applicationId",
  o.step,
  o."contactName",
  o.relationship,
  o."consentedAt"
FROM public.screening_opt_ins o
JOIN public.applications a ON a.id = o."applicationId"
LEFT JOIN public.listings l ON l.id = a."listingId"
WHERE a."tenantId" = auth.uid() OR l."ownerId" = auth.uid();

GRANT SELECT ON public.screening_consents TO authenticated;

-- ─── screening_checks ────────────────────────────────────────────────────────
-- Results include what the reference said, so only the landlord of the listing may read them —
-- never the tenant. Writes belong to the API, which polls ElevenLabs under service_role.

CREATE POLICY checks_select_listing_owner ON public.screening_checks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.listings l ON l.id = a."listingId"
      WHERE a.id = "applicationId" AND l."ownerId" = auth.uid()
    )
  );

-- ─── tenant_profiles ─────────────────────────────────────────────────────────

CREATE POLICY profiles_all_own ON public.tenant_profiles
  FOR ALL TO authenticated
  USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

-- ─── shared_passports ────────────────────────────────────────────────────────
-- The renter manages their own links, including revoking (an UPDATE of "revokedAt").
-- Landlords reach a passport only through record_passport_access() below.

CREATE POLICY passports_select_own ON public.shared_passports
  FOR SELECT TO authenticated
  USING ("ownerId" = auth.uid());

CREATE POLICY passports_insert_own ON public.shared_passports
  FOR INSERT TO authenticated
  WITH CHECK ("ownerId" = auth.uid());

CREATE POLICY passports_update_own ON public.shared_passports
  FOR UPDATE TO authenticated
  USING ("ownerId" = auth.uid())
  WITH CHECK ("ownerId" = auth.uid());

-- ─── passport_accesses ───────────────────────────────────────────────────────
-- The renter can see who opened their passport. Rows are written by the RPC, not directly.

CREATE POLICY accesses_select_passport_owner ON public.passport_accesses
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shared_passports p WHERE p.id = "passportId" AND p."ownerId" = auth.uid()));

-- ─── addon_requests ──────────────────────────────────────────────────────────
-- Visible to the renter it concerns and to the landlord who made it. Inserts go through the API,
-- which also emails the renter.

CREATE POLICY addon_requests_select_party ON public.addon_requests
  FOR SELECT TO authenticated
  USING (
    "requesterId" = auth.uid()
    OR EXISTS (SELECT 1 FROM public.shared_passports p WHERE p.id = "passportId" AND p."ownerId" = auth.uid())
  );

-- ─── leases ──────────────────────────────────────────────────────────────────
-- Either signatory may read a lease once they have an account. The emailed /lease?t= page is
-- served by the API, which verifies the SHA-256 hash before accepting a signature — that check
-- reproduces a Node JSON.stringify and does not belong in PL/pgSQL.

CREATE POLICY leases_select_party ON public.leases
  FOR SELECT TO authenticated
  USING ("landlordId" = auth.uid() OR "tenantId" = auth.uid());

-- ─── documents ───────────────────────────────────────────────────────────────

CREATE POLICY documents_all_own ON public.documents
  FOR ALL TO authenticated
  USING ("ownerId" = auth.uid())
  WITH CHECK ("ownerId" = auth.uid());

-- ─── leads ───────────────────────────────────────────────────────────────────
-- Public capture form: anyone may add themselves, nobody may read the list back.

CREATE POLICY leads_insert_anyone ON public.leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Token-capability functions
--
-- SECURITY DEFINER so they can read shared_passports while the table stays closed to anon. Each
-- one takes the token as its only way in, so knowing a token grants exactly one row and nothing
-- else. search_path is pinned so a caller cannot shadow the tables these resolve.
-- ─────────────────────────────────────────────────────────────────────────────

/** The passport a landlord was sent, minus anything they must not see. */
CREATE OR REPLACE FUNCTION public.get_shared_passport(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  rec public.shared_passports;
BEGIN
  SELECT * INTO rec FROM public.shared_passports WHERE token = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'passport_not_found' USING ERRCODE = 'no_data_found';
  END IF;
  -- Revocation is immediate and independent of expiry; both close the link for good.
  IF rec."revokedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'passport_revoked' USING ERRCODE = 'raise_exception';
  END IF;
  IF rec."expiresAt" < now() THEN
    RAISE EXCEPTION 'passport_expired' USING ERRCODE = 'raise_exception';
  END IF;

  RETURN jsonb_build_object(
    'recipientName', rec."recipientName",
    'recipientUnit', rec."recipientUnit",
    'buildingAddress', rec."buildingAddress",
    -- The reference phone stays with Rentre, which places the call.
    'passport', (rec.data - 'landlordPhone'),
    'createdAt', rec."createdAt",
    'expiresAt', rec."expiresAt"
  );
END;
$$;

/**
 * The landlord's ownership gate: logs the claim for compliance, then returns the passport.
 * This records an assertion — it does not verify ownership, which no check here could.
 */
CREATE OR REPLACE FUNCTION public.record_passport_access(
  p_token           uuid,
  p_claimed_unit    text,
  p_proof_type      "OwnershipProofType",
  p_proof_file_name text DEFAULT NULL,
  p_user_agent      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_passport_id uuid;
  v_result      jsonb;
BEGIN
  IF p_claimed_unit IS NULL OR btrim(p_claimed_unit) = '' THEN
    RAISE EXCEPTION 'claimed_unit_required' USING ERRCODE = 'raise_exception';
  END IF;

  -- Validates the token and the link's liveness before anything is written.
  v_result := public.get_shared_passport(p_token);

  SELECT id INTO v_passport_id FROM public.shared_passports WHERE token = p_token;

  INSERT INTO public.passport_accesses
    ("passportId", "viewerId", "claimedUnit", "proofType", "proofFileName", "userAgent")
  VALUES
    (v_passport_id, auth.uid(), btrim(p_claimed_unit), p_proof_type, p_proof_file_name, left(p_user_agent, 300));

  RETURN v_result;
END;
$$;

-- Readable by a landlord who has no account yet, which is the whole point of the emailed link.
GRANT EXECUTE ON FUNCTION public.get_shared_passport(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_passport_access(uuid, text, "OwnershipProofType", text, text) TO anon, authenticated;

-- These are reached only through the functions above, never directly.
REVOKE ALL ON public.shared_passports FROM anon;
REVOKE ALL ON public.passport_accesses FROM anon;
