import { z } from "zod";
import { DOCUMENT_KIND_IDS, SERVICE_ADDON_IDS } from "./enums";

const money = z.number().finite().nonnegative().max(1e10);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Expected YYYY-MM-DD");

export const mortgageSchema = z.object({
  price: z.number().finite().positive().max(1e10),
  down: money,
  province: z.enum(["ON", "BC", "QC", "AB"]),
  amortization: z.number().int().min(5).max(30),
  rate: z.number().finite().min(0).max(30),
  grossIncome: z.number().finite().positive().max(1e9),
  monthlyDebts: money.default(0),
  currentRent: money.optional(),
  propertyTax: money.default(0),
  condoFee: money.default(0),
  heating: money.optional(),
  isFirstTimeBuyer: z.boolean().default(false),
  inToronto: z.boolean().default(false),
});

const scoreSchema = z.number().finite().min(0).max(10);
export const scoresSchema = z.object({
  price: scoreSchema,
  location: scoreSchema,
  transit: scoreSchema,
  walkability: scoreSchema,
  amenities: scoreSchema,
  space: scoreSchema,
});

export const addOnSchema = z.object({
  label: z.string().min(1).max(100),
  price: z.union([money, z.literal("included")]),
  mandatory: z.boolean().optional(),
});

export const matchSchema = z.object({
  scores: scoresSchema,
  prefs: z.object({
    priorities: z.array(z.string().max(30)).max(10).default([]),
    budgetMax: money.optional(),
  }),
  basePrice: money.optional(),
  addOns: z.array(addOnSchema).max(50).optional(),
  selectedAddOns: z.array(z.string()).max(50).optional(),
});

export const rtaSchema = z.object({
  noticeType: z.enum(["N1", "N2", "N4", "N12"]),
  servedDate: isoDate,
  serviceMethod: z.enum(["hand", "mail", "email"]).optional(),
  rentPeriod: z.enum(["monthly", "weekly"]).optional(),
  rentDueDay: z.number().int().min(1).max(31).optional(),
  leaseEndDate: isoDate.optional(),
  lastIncreaseDate: isoDate.optional(),
  firstOccupancyDate: isoDate.optional(),
  yearBuilt: z.number().int().min(1800).max(2100).optional(),
});

export const investmentSchema = z.object({
  purchasePrice: z.number().finite().positive().max(1e10),
  monthlyRent: money,
  occupancyRate: z.number().min(0).max(1).optional(),
  propertyTaxAnnual: money.default(0),
  insuranceAnnual: money.default(0),
  maintenanceAnnual: money.default(0),
  propertyManagementAnnual: money.optional(),
  downPayment: money,
  mortgageRate: z.number().finite().min(0).max(30),
  amortizationYears: z.number().int().min(1).max(40),
  city: z.string().min(1).max(100),
  unitType: z.enum(["bachelor", "one", "two", "three"]),
});

const url = z.string().url().max(2000);
export const createListingSchema = z.object({
  address: z.string().min(1).max(200),
  unit: z.string().max(50).optional(),
  neighbourhood: z.string().min(1).max(100),
  city: z.string().min(1).max(100),
  price: z.number().finite().positive().max(1e6),
  unitType: z.string().min(1).max(30),
  bedrooms: z.number().int().min(0).max(20),
  bathrooms: z.number().min(0).max(20),
  sqft: z.number().int().positive().max(100000),
  yearBuilt: z.number().int().min(1800).max(2100),
  rentControlled: z.boolean(),
  moveIn: z.string().min(1).max(50),
  leaseTerm: z.string().min(1).max(50),
  image: url,
  photos: z.array(url).max(30).default([]),
  floorPlan: url.optional().default(""),
  addOns: z.array(addOnSchema).max(50).default([]),
  scores: scoresSchema.optional(),
});

export const createApplicationSchema = z.object({
  listingId: z.string().min(1).max(100),
  message: z.string().max(2000).optional(),
  monthlyIncome: money.optional(),
  creditScore: z.number().int().min(300).max(900).optional(),
});

export const registerSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(10).max(200),
  name: z.string().min(1).max(100),
  role: z.enum(["tenant", "landlord"]),
});

export const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

// ── Scoring ──
import { normalizeUnitType } from "../data/cmhc";
const unitTypeInput = z
  .string()
  .transform((s, ctx) => {
    const u = normalizeUnitType(s);
    if (!u) ctx.addIssue({ code: "custom", message: "Unknown unit type (studio, 1br, 2br, 3br+)" });
    return u as NonNullable<typeof u>;
  });
const score10 = z.number().finite().min(0).max(10).optional();
const scoreBase = {
  city: z.string().min(1).max(100),
  unitType: unitTypeInput,
  rent: z.number().finite().positive().max(1e6),
  sqft: z.number().int().positive().max(100000).optional(),
  locationScore: score10,
  transitScore: score10,
  walkabilityScore: score10,
  amenitiesScore: score10,
  priorities: z.array(z.string().max(30)).max(10).optional(),
};
export const rentScoreSchema = z.object(scoreBase);
export const dealScoreSchema = z.object({
  ...scoreBase,
  hasParking: z.boolean().optional(),
  hasInSuiteLaundry: z.boolean().optional(),
});

// ── Leads (email capture) ──
export const leadSchema = z.object({
  email: z.string().email().max(200),
  intents: z.array(z.enum(["save_report", "rent_alerts", "renewal_tips"])).min(1).max(3),
  city: z.string().max(100).optional(),
  reportSnapshot: z.record(z.string(), z.unknown()).optional(),
});

// ── Lease redaction ──
export const redactSchema = z.object({ text: z.string().min(1).max(200_000) });

// ── Tenant profile (autosaved, every field optional) ──
const contact = { name: z.string().max(100), phone: z.string().max(30), email: z.string().email().max(200) };
export const profileSchema = z
  .object({
    basics: z.object({
      fullName: z.string().min(1).max(100),
      email: z.string().email().max(200),
      phone: z.string().regex(/^[\d\s()+.-]{7,20}$/, "Invalid phone number"),
      city: z.string().min(1).max(100),
      areas: z.array(z.string().max(100)).max(20),
    }).partial(),
    landlordReference: z.object({ ...contact, from: isoDate, to: isoDate.optional(), consent: z.boolean() }).partial(),
    characterReference: z.object({
      ...contact,
      relationship: z.enum(["employer", "coworker", "mentor", "other"]),
      consent: z.boolean(),
    }).partial(),
    guarantor: z.object({ ...contact, relationship: z.string().max(50) }).partial(),
    credit: z.object({ consent: z.boolean() }).partial(),
    background: z.object({ consent: z.boolean() }).partial(),
    identity: z.object({ consent: z.boolean() }).partial(),
    // What the onboarding wizard collects. Self-reported — the verified counterparts
    // (verifiedIncome, incomeVerifiedAt, …) are written by the provider, never from here.
    employment: z.object({
      employment: z.string().max(50),
      employer: z.string().max(100),
      jobTitle: z.string().max(100),
      income: z.string().max(20),
    }).partial(),
    rentalHistory: z.object({
      currentAddress: z.string().max(200),
      timeAtAddress: z.string().max(50),
      currentLandlord: z.string().max(100),
      landlordPhone: z.string().max(30),
    }).partial(),
    preferences: z.object({
      unitType: z.string().max(50),
      bedrooms: z.string().max(20),
      moveIn: z.string().max(50),
      leaseTerm: z.string().max(50),
      budgetMin: money.max(1e6),
      budgetMax: money.max(1e6),
      coApplicants: z.boolean(),
      areas: z.array(z.string().max(100)).max(30),
    }).partial(),
  })
  .partial();

// Built without .default() so a PATCH that omits photos/addOns/floorPlan leaves them untouched.
export const updateListingSchema = createListingSchema
  .omit({ photos: true, addOns: true, floorPlan: true })
  .partial()
  .extend({
    photos: z.array(url).max(30).optional(),
    addOns: z.array(addOnSchema).max(50).optional(),
    floorPlan: url.optional(),
  });

// ── Renter passport sharing ──
// Only the fields the renter ticked are sent; unknown keys are stripped so the stored snapshot stays bounded.
const field = (max = 200) => z.string().trim().max(max).optional();
export const sharePassportSchema = z.object({
  recipientName: z.string().trim().min(1).max(100),
  recipientEmail: z.string().trim().email().max(200),
  recipientUnit: field(),
  passport: z.object({
    name: field(100),
    email: z.string().trim().email().max(200).optional(),
    phone: field(30),
    city: field(100),
    neighbourhoods: z.array(z.string().max(100)).max(30).optional(),
    unitType: field(50),
    bedrooms: field(20),
    moveIn: field(50),
    budgetMax: field(20),
    employment: field(50),
    employer: field(100),
    jobTitle: field(100),
    income: field(20),
    hasIncomeDoc: z.boolean().optional(),
    hasCreditDoc: z.boolean().optional(),
    currentAddress: field(),
    timeAtAddress: field(50),
    currentLandlord: field(100),
    landlordPhone: field(30),
  }),
});

// ── Screening opt-ins and checks ──
// Normalized to E.164; bare 10-digit numbers are assumed North American.
const phoneE164 = z.string().trim().transform((s, ctx) => {
  const d = s.replace(/\D/g, "");
  const e164 = d.length === 10 ? `+1${d}` : s.startsWith("+") && d.length >= 8 && d.length <= 15 ? `+${d}` : d.length === 11 && d[0] === "1" ? `+${d}` : null;
  if (!e164) ctx.addIssue({ code: "custom", message: "Enter a valid phone number" });
  return e164 as string;
});
// null withdraws consent for that step
export const optInSchema = z.object({
  reference: z.object({ name: z.string().trim().min(1).max(100), phone: phoneE164, relationship: z.string().trim().min(1).max(50) }).nullable().optional(),
  interview: z.object({ phone: phoneE164 }).nullable().optional(),
  report: z.literal(true).nullable().optional(),
});
export const checkSchema = z.object({ type: z.enum(["reference", "interview", "report"]) });

// ── Lease signing (in-app click-to-sign) ──
export const createLeaseSchema = z.object({
  applicationId: z.string().min(1).max(100),
  startDate: isoDate,
  endDate: isoDate.optional(),
  monthlyRent: z.number().finite().positive().max(1e6),
  deposit: money.max(1e6).optional(),
  terms: z.string().trim().min(1).max(50_000),
  signatureName: z.string().trim().min(1).max(100),
}).refine((l) => !l.endDate || l.endDate > l.startDate, { message: "End date must be after the start date", path: ["endDate"] });
export const signLeaseSchema = z.object({
  signatureName: z.string().trim().min(1).max(100),
  agree: z.literal(true, { message: "You must agree to sign electronically" }),
});

// ── Shared passport: landlord ownership gate and add-on requests ──
// The V4 gate collects a unit plus one proof document. The browser only ever reads the file name
// (no bytes are uploaded), so that is all this records — enough for the compliance log.
export const passportAccessSchema = z.object({
  claimedUnit: z.string().trim().min(1).max(200),
  proofType: z.enum(["property_tax_bill", "utility_bill"]),
  proofFileName: z.string().trim().min(1).max(255).optional(),
});

const serviceAddonId = z.enum(SERVICE_ADDON_IDS);
const documentKindId = z.enum(DOCUMENT_KIND_IDS);

export const addonRequestSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("services"),
      claimedUnit: z.string().trim().min(1).max(200),
      addons: z.array(serviceAddonId).min(1).max(10),
      referenceQuestions: z.array(z.string().trim().max(200)).max(20).default([]),
    })
    // Same rule the UI enforces with `rentBackBlocked`: rent-back needs lease signing to exist.
    .refine((r) => !r.addons.includes("rent_back") || r.addons.includes("lease_signing"), {
      message: "Rent-back requires lease signing",
      path: ["addons"],
    }),
  z.object({
    kind: z.literal("documents"),
    claimedUnit: z.string().trim().min(1).max(200),
    requestedDocuments: z.array(documentKindId).min(1).max(10),
  }),
  z.object({
    kind: z.literal("viewing"),
    claimedUnit: z.string().trim().min(1).max(200),
    viewingDay: z.string().trim().min(1).max(20),
    viewingDate: z.string().trim().min(1).max(30),
    viewingTime: z.string().trim().min(1).max(20),
    viewingNote: z.string().trim().max(500).optional(),
  }),
]);

/**
 * Lease drafted from a shared passport rather than an approved application: the landlord has
 * unlocked the passport and ordered lease signing.
 */
export const createLeaseFromPassportSchema = z
  .object({
    passportToken: z.string().trim().min(1).max(100),
    address: z.string().trim().min(1).max(200),
    startDate: isoDate,
    endDate: isoDate.optional(),
    monthlyRent: z.number().finite().positive().max(1e6),
    deposit: money.max(1e6).optional(),
    terms: z.string().trim().min(1).max(50_000),
    signatureName: z.string().trim().min(1).max(100),
  })
  .refine((l) => !l.endDate || l.endDate > l.startDate, {
    message: "End date must be after the start date",
    path: ["endDate"],
  });

// ── Passwordless sign-in (emailed one-time code) ──
export const otpRequestSchema = z.object({
  email: z.string().trim().email().max(200),
  name: z.string().trim().min(1).max(100).optional(),
});
export const otpVerifySchema = z.object({
  email: z.string().trim().email().max(200),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});
