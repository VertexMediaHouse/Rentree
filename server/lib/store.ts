import fs from "node:fs";
import path from "node:path";
import { INITIAL_LISTINGS, ListingData } from "../data/mockData";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "tenant" | "landlord";
  passwordHash?: string; // absent for passwordless (email code) accounts
  createdAt: string;
}

export type StoredListing = Omit<ListingData, "postedDays"> & { ownerId?: string; createdAt: string };

export interface StoredApplication {
  id: string;
  listingId: string;
  tenantId: string;
  tenantName: string;
  message?: string;
  monthlyIncome?: number;
  creditScore?: number;
  status: "reviewing" | "interview" | "approved" | "declined" | "withdrawn";
  createdAt: string;
  // Tenant consent for each screening step, with the timestamp it was given
  optIns?: {
    reference?: { name: string; phone: string; relationship: string; at: string };
    interview?: { phone: string; at: string };
    report?: { at: string };
  };
  checks?: ScreeningCheck[];
}

export interface ScreeningCheck {
  id: string;
  type: "reference" | "interview" | "report";
  status: "calling" | "done" | "failed";
  conversationId?: string;
  summary?: string;
  transcript?: { role: string; message: string }[];
  createdAt: string;
}

export interface Lease {
  token: string;
  applicationId: string;
  landlordId: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  address: string;
  startDate: string;
  endDate?: string;
  monthlyRent: number;
  deposit?: number;
  terms: string;
  hash: string; // SHA-256 of the lease content both parties signed
  landlordSignature: { name: string; at: string; ip?: string };
  tenantSignature?: { name: string; at: string; ip?: string; userAgent?: string };
  createdAt: string;
}

export interface Lead {
  id: string;
  email: string;
  intents: string[];
  city?: string;
  reportSnapshot?: Record<string, unknown>;
  createdAt: string;
}

export interface Profile {
  userId: string;
  data: Record<string, any>;
  updatedAt: string;
}

export interface SharedPassport {
  token: string;
  ownerId: string;
  recipientEmail: string;
  recipientName: string;
  recipientUnit?: string;
  data: Record<string, unknown>;
  createdAt: string;
  expiresAt: string;
}

interface DB {
  users: User[];
  listings: StoredListing[];
  applications: StoredApplication[];
  leads: Lead[];
  profiles: Profile[];
  passports: SharedPassport[];
  leases: Lease[];
}

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "server", "data", "db.json");

function seed(): DB {
  const now = Date.now();
  return {
    users: [],
    applications: [],
    leads: [],
    profiles: [],
    passports: [],
    leases: [],
    listings: INITIAL_LISTINGS.map(({ postedDays, ...l }) => ({
      ...l,
      createdAt: new Date(now - postedDays * 86_400_000).toISOString(),
    })),
  };
}

function load(): DB {
  try {
    // Merge over the seed so databases written by older versions gain any new collections
    return { ...seed(), ...JSON.parse(fs.readFileSync(DB_PATH, "utf8")) } as DB;
  } catch (err: any) {
    if (err.code !== "ENOENT") console.error("Failed to read db, starting from seed:", err.message);
    return seed();
  }
}

const db: DB = load();

/** Atomic write: temp file then rename, so a crash never leaves a half-written db. */
function persist() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_PATH);
}

export const store = {
  users: db.users,
  listings: db.listings,
  applications: db.applications,
  leads: db.leads,
  profiles: db.profiles,
  passports: db.passports,
  leases: db.leases,
  save: persist,
};

export const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
