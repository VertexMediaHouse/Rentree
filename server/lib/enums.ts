import type {
  AddonRequestKind,
  ApplicationStatus,
  DocumentKind,
  LeadIntent,
  OwnershipProofType,
  ScreeningCheckStatus,
  ScreeningStep,
  ServiceAddon,
  UserRole,
} from "@prisma/client";

/**
 * The HTTP API speaks lowercase ("tenant", "save_report") because that is what the zod schemas
 * and every shipped client already use. Postgres enums are uppercase.
 *
 * Most pairs differ by case alone, so they are a cast rather than a lookup table. The two that do
 * not — service add-ons and document kinds — have explicit maps at the bottom of this file. When
 * adding an enum value, check which group it belongs to.
 */
const toDb = <T extends string>(s: string) => s.toUpperCase() as T;
const toApi = (s: string) => s.toLowerCase();

export const dbRole = (s: string) => toDb<UserRole>(s);
export const apiRole = (r: UserRole) => toApi(r) as "tenant" | "landlord" | "realtor";

export const dbStatus = (s: string) => toDb<ApplicationStatus>(s);
export const apiStatus = (s: ApplicationStatus) => toApi(s);

export const dbStep = (s: string) => toDb<ScreeningStep>(s);
export const apiStep = (s: ScreeningStep) => toApi(s);

export const apiCheckStatus = (s: ScreeningCheckStatus) => toApi(s);

export const dbIntent = (s: string) => toDb<LeadIntent>(s);

/** Session tokens only carry tenant/landlord; a realtor signs in as a landlord for authorization. */
export const authRole = (r: UserRole): "tenant" | "landlord" => (r === "TENANT" ? "tenant" : "landlord");

export const dbAddonKind = (s: string) => toDb<AddonRequestKind>(s);
export const dbProofType = (s: string) => toDb<OwnershipProofType>(s);

/**
 * These two do NOT differ by case alone, so they get real tables. The ids on the left are the ones
 * the shared-passport UI sends (SERVICE_ADDONS and ADDON_OPTIONS in SharedPackageScreen.tsx).
 */
const SERVICE_ADDONS: Record<string, ServiceAddon> = {
  reference_call: "REFERENCE_CALL",
  lockbox: "LOCKBOX",
  lease_signing: "LEASE_SIGNING",
  rent_back: "RENT_BACK",
  third_party: "THIRD_PARTY_SCREENING",
};

const DOCUMENT_KINDS: Record<string, DocumentKind> = {
  paystubs: "PAYSTUBS",
  bankstmt: "BANK_STATEMENT",
  employment: "EMPLOYMENT_LETTER",
  noa: "NOTICE_OF_ASSESSMENT",
  reference: "REFERENCE_LETTER",
};

export const SERVICE_ADDON_IDS = Object.keys(SERVICE_ADDONS) as [string, ...string[]];
export const DOCUMENT_KIND_IDS = Object.keys(DOCUMENT_KINDS) as [string, ...string[]];

export const dbServiceAddon = (s: string) => SERVICE_ADDONS[s];
export const dbDocumentKind = (s: string) => DOCUMENT_KINDS[s];

const invert = <T extends string>(m: Record<string, T>) =>
  Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k])) as Record<T, string>;

const SERVICE_ADDON_API = invert(SERVICE_ADDONS);
const DOCUMENT_KIND_API = invert(DOCUMENT_KINDS);

export const apiServiceAddon = (a: ServiceAddon) => SERVICE_ADDON_API[a];
export const apiDocumentKind = (d: DocumentKind) => DOCUMENT_KIND_API[d] ?? toApi(d);
