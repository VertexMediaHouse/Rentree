import crypto from "node:crypto";
import type { AddonRequest, PassportAccess, SharedPassport, TenantProfile, User } from "@prisma/client";
import { isDbUnavailable } from "./db";

/**
 * ponytail: in-memory stand-in used only while DATABASE_URL is unset, so the email flows can be
 * exercised before Postgres exists. Records die on restart and are not shared across processes.
 * Every call site reads through orMemory(), so configuring the database switches all of them over
 * with no other change. Delete this file once the database is permanent.
 */

let warned = false;
function warnOnce() {
  if (warned) return;
  warned = true;
  console.warn(
    "[no-db] holding records in memory — they will not survive a restart. Set DATABASE_URL to persist them."
  );
}

/**
 * Runs the database operation, falling back to memory only when there is no usable database.
 * A genuine query error (bad input, constraint violation) still propagates — silently swallowing
 * those would hide real bugs behind a fake success.
 */
export async function orMemory<T>(fromDb: () => Promise<T>, fromMemory: () => T | Promise<T>): Promise<T> {
  try {
    return await fromDb();
  } catch (err) {
    if (!isDbUnavailable(err)) throw err;
    warnOnce();
    return await fromMemory();
  }
}

export const mem = {
  /** Keyed by email. */
  users: new Map<string, User>(),
  /** Keyed by token, which is the capability in the emailed link. */
  passports: new Map<string, SharedPassport>(),
  /** Keyed by userId. */
  profiles: new Map<string, TenantProfile>(),
  accesses: [] as PassportAccess[],
  addonRequests: [] as AddonRequest[],
};

// ─── Users ───────────────────────────────────────────────────────────────────

export function memCreateUser(email: string, name: string): User {
  const user = {
    id: crypto.randomUUID(),
    email,
    name,
    role: "TENANT",
    passwordHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as User;
  mem.users.set(email, user);
  return user;
}

export const memUserByEmail = (email: string) => mem.users.get(email) ?? null;
export const memUserById = (id: string) => [...mem.users.values()].find((u) => u.id === id) ?? null;

// ─── Tenant profiles ─────────────────────────────────────────────────────────

/** A blank profile: every optional column null, with the same defaults the table declares. */
const blankProfile = (userId: string): TenantProfile =>
  ({
    id: crypto.randomUUID(),
    userId,
    fullName: null, email: null, phone: null, city: null, areas: [],
    unitType: null, bedrooms: null, moveIn: null,
    budgetMin: null, budgetMax: null, leaseTerm: null, coApplicants: false,
    employment: null, employer: null, jobTitle: null, income: null,
    verifiedIncome: null, incomeSource: null, employerDuration: null,
    incomeVerifiedAt: null, incomeStatus: "NOT_STARTED",
    currentAddress: null, timeAtAddress: null, currentLandlord: null, landlordPhone: null,
    priorLandlord: null, priorProperty: null, priorRelationship: null, priorContact: null,
    confirmedTenancy: null, confirmedOnTime: null,
    identityConsent: false, identityStatus: "NOT_STARTED", identityMethod: null, identityVerifiedAt: null,
    creditConsent: false, creditStatus: "NOT_STARTED",
    backgroundConsent: false, backgroundStatus: "NOT_STARTED",
    reportPulledAt: null, paymentHistory: null, ltbRecord: null,
    pipedaConsentAt: null,
    landlordReference: null, characterReference: null, guarantor: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as unknown as TenantProfile;

export const memProfile = (userId: string) => mem.profiles.get(userId) ?? null;

/** Merges the provided columns over the stored profile, matching the upsert the route performs. */
export function memUpsertProfile(userId: string, data: Record<string, unknown>): TenantProfile {
  const current = mem.profiles.get(userId) ?? blankProfile(userId);
  const next = { ...current, ...data, updatedAt: new Date() } as TenantProfile;
  mem.profiles.set(userId, next);
  return next;
}

// ─── Shared passports ────────────────────────────────────────────────────────

export function memCreatePassport(input: {
  token: string;
  ownerId: string;
  recipientName: string | null;
  recipientEmail: string | null;
  recipientUnit: string | null;
  data: unknown;
  buildingAddress?: string | null;
  expiresAt: Date;
}): SharedPassport {
  const row = {
    id: crypto.randomUUID(),
    buildingAddress: null,
    ...input,
    createdAt: new Date(),
    revokedAt: null,
  } as unknown as SharedPassport;
  mem.passports.set(input.token, row);
  return row;
}

export const memPassportByToken = (token: string) => mem.passports.get(token) ?? null;

export function memRevokePassport(token: string): Date {
  const row = mem.passports.get(token);
  if (!row) throw new Error("passport not held in memory");
  if (!row.revokedAt) (row as { revokedAt: Date | null }).revokedAt = new Date();
  return row.revokedAt!;
}

// ─── Access log and add-on requests ──────────────────────────────────────────

export function memCreateAccess(input: {
  passportId: string;
  viewerId: string | null;
  claimedUnit: string;
  proofType: PassportAccess["proofType"];
  proofFileName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}): PassportAccess {
  const row = { id: crypto.randomUUID(), proofDocumentId: null, ...input, verifiedAt: new Date() } as PassportAccess;
  mem.accesses.push(row);
  return row;
}

export function memCreateAddonRequest(input: Omit<AddonRequest, "id" | "status" | "createdAt" | "updatedAt">): AddonRequest {
  const row = {
    id: crypto.randomUUID(),
    status: "REQUESTED",
    ...input,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as AddonRequest;
  mem.addonRequests.push(row);
  return row;
}
