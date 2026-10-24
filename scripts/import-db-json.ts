/**
 * One-off: copy the pre-Postgres JSON store into the database.
 *
 *   DB_PATH=server/data/db.json npx tsx scripts/import-db-json.ts
 *
 * Primary keys are preserved, so the lease -> application and listing -> owner references in the
 * old file keep resolving. Safe to re-run: every write is an upsert or skipDuplicates, and rows
 * whose parent is missing are reported and skipped rather than aborting the run.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PrismaClient, type ApplicationStatus, type ScreeningStep, type ScreeningCheckStatus, type UserRole } from "@prisma/client";

const db = new PrismaClient();
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "server", "data", "db.json");

type OldUser = { id: string; email: string; name: string; role: string; passwordHash?: string; createdAt: string };
type OldListing = Record<string, any> & { id: string; ownerId?: string | null; createdAt: string };
type OldCheck = { id: string; type: string; status: string; conversationId?: string; summary?: string; transcript?: unknown; createdAt: string };
type OldApplication = Record<string, any> & { id: string; listingId: string; tenantId: string; status: string; createdAt: string; optIns?: Record<string, any>; checks?: OldCheck[] };
type OldLease = Record<string, any> & { token: string; applicationId: string };
type OldPassport = Record<string, any> & { token: string; ownerId: string };
type OldProfile = { userId: string; data: Record<string, any>; updatedAt: string };
type OldLead = { id: string; email: string; intents: string[]; city?: string; reportSnapshot?: any; createdAt: string };

const skipped: string[] = [];
const note = (s: string) => skipped.push(s);

const ROLE: Record<string, UserRole> = { tenant: "TENANT", landlord: "LANDLORD", realtor: "REALTOR" };
const STATUS: Record<string, ApplicationStatus> = {
  reviewing: "REVIEWING", interview: "INTERVIEW", approved: "APPROVED", declined: "DECLINED", withdrawn: "WITHDRAWN",
};
const STEP: Record<string, ScreeningStep> = { reference: "REFERENCE", interview: "INTERVIEW", report: "REPORT" };
const CHECK_STATUS: Record<string, ScreeningCheckStatus> = { calling: "CALLING", done: "DONE", failed: "FAILED" };
const INTENT = { save_report: "SAVE_REPORT", rent_alerts: "RENT_ALERTS", renewal_tips: "RENEWAL_TIPS" } as const;

const asDate = (v: unknown, fallback = new Date()) => {
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? fallback : d;
};

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`No JSON store at ${DB_PATH}. Set DB_PATH to point at it.`);
    process.exit(1);
  }
  const old = JSON.parse(fs.readFileSync(DB_PATH, "utf8")) as {
    users?: OldUser[]; listings?: OldListing[]; applications?: OldApplication[];
    leases?: OldLease[]; passports?: OldPassport[]; profiles?: OldProfile[]; leads?: OldLead[];
  };

  // ── Users ────────────────────────────────────────────────────────────────
  const users = old.users ?? [];
  for (const u of users) {
    const role = ROLE[u.role?.toLowerCase()];
    if (!role) { note(`user ${u.email}: unknown role "${u.role}"`); continue; }
    const email = u.email.trim().toLowerCase();
    await db.user.upsert({
      where: { id: u.id },
      update: { email, name: u.name, role, passwordHash: u.passwordHash ?? null },
      create: { id: u.id, email, name: u.name, role, passwordHash: u.passwordHash ?? null, createdAt: asDate(u.createdAt) },
    });
  }
  const userIds = new Set((await db.user.findMany({ select: { id: true } })).map((u) => u.id));

  // ── Listings ─────────────────────────────────────────────────────────────
  for (const l of old.listings ?? []) {
    // The old file allowed listings with no owner, and an owner that no longer exists.
    const ownerId = l.ownerId && userIds.has(l.ownerId) ? l.ownerId : null;
    if (l.ownerId && !ownerId) note(`listing ${l.id}: owner ${l.ownerId} not found, imported unowned`);
    const data = {
      address: l.address, unit: l.unit ?? null, neighbourhood: l.neighbourhood, city: l.city,
      price: l.price, unitType: l.unitType, bedrooms: l.bedrooms, bathrooms: l.bathrooms,
      sqft: l.sqft, yearBuilt: l.yearBuilt, rentControlled: !!l.rentControlled,
      moveIn: l.moveIn, leaseTerm: l.leaseTerm, image: l.image,
      photos: Array.isArray(l.photos) ? l.photos : [], floorPlan: l.floorPlan ?? "",
      landlord: l.landlord ?? "Landlord", addOns: l.addOns ?? [],
      scores: l.scores ?? { price: 5, location: 5, transit: 5, walkability: 5, amenities: 5, space: 5 },
      ownerId,
    };
    await db.listing.upsert({
      where: { id: l.id },
      update: data,
      create: { id: l.id, ...data, createdAt: asDate(l.createdAt) },
    });
  }
  const listingIds = new Set((await db.listing.findMany({ select: { id: true } })).map((l) => l.id));

  // ── Applications, with their consent rows and call results ───────────────
  for (const a of old.applications ?? []) {
    const status = STATUS[a.status?.toLowerCase()];
    if (!status) { note(`application ${a.id}: unknown status "${a.status}"`); continue; }
    if (!listingIds.has(a.listingId)) { note(`application ${a.id}: listing ${a.listingId} missing, skipped`); continue; }
    if (!userIds.has(a.tenantId)) { note(`application ${a.id}: tenant ${a.tenantId} missing, skipped`); continue; }

    const data = {
      listingId: a.listingId, tenantId: a.tenantId, tenantName: a.tenantName ?? "Tenant",
      message: a.message ?? null,
      monthlyIncome: a.monthlyIncome ?? null,
      creditScore: a.creditScore ?? null,
      status,
    };
    await db.application.upsert({
      where: { id: a.id },
      update: data,
      create: { id: a.id, ...data, createdAt: asDate(a.createdAt) },
    });

    // optIns was an object keyed by step; each value carried the consent timestamp.
    for (const [key, v] of Object.entries(a.optIns ?? {})) {
      const step = STEP[key.toLowerCase()];
      if (!step || !v) continue;
      const consent = v as { name?: string; phone?: string; relationship?: string; at?: string };
      await db.screeningOptIn.upsert({
        where: { applicationId_step: { applicationId: a.id, step } },
        update: { contactName: consent.name ?? null, contactPhone: consent.phone ?? null, relationship: consent.relationship ?? null },
        create: {
          applicationId: a.id, step,
          contactName: consent.name ?? null, contactPhone: consent.phone ?? null,
          relationship: consent.relationship ?? null, consentedAt: asDate(consent.at),
        },
      });
    }

    for (const c of a.checks ?? []) {
      const step = STEP[c.type?.toLowerCase()];
      const checkStatus = CHECK_STATUS[c.status?.toLowerCase()];
      if (!step || !checkStatus) { note(`check ${c.id}: unknown type/status "${c.type}"/"${c.status}"`); continue; }
      const data = {
        applicationId: a.id, step, status: checkStatus,
        conversationId: c.conversationId ?? null, summary: c.summary ?? null,
        transcript: (c.transcript ?? null) as any,
      };
      await db.screeningCheck.upsert({
        where: { id: c.id },
        update: data,
        create: { id: c.id, ...data, createdAt: asDate(c.createdAt) },
      });
    }
  }
  const applicationIds = new Set((await db.application.findMany({ select: { id: true } })).map((a) => a.id));

  // ── Leases ───────────────────────────────────────────────────────────────
  for (const l of old.leases ?? []) {
    if (!applicationIds.has(l.applicationId)) { note(`lease ${l.token}: application ${l.applicationId} missing, skipped`); continue; }
    if (!userIds.has(l.landlordId) || !userIds.has(l.tenantId)) { note(`lease ${l.token}: landlord or tenant missing, skipped`); continue; }
    const data = {
      token: l.token, applicationId: l.applicationId, landlordId: l.landlordId, tenantId: l.tenantId,
      tenantName: l.tenantName, tenantEmail: l.tenantEmail, address: l.address,
      startDate: asDate(l.startDate), endDate: l.endDate ? asDate(l.endDate) : null,
      monthlyRent: l.monthlyRent, deposit: l.deposit ?? null, terms: l.terms,
      // Preserved verbatim: it is the fingerprint of what both parties actually signed.
      hash: l.hash,
      landlordSignatureName: l.landlordSignature?.name ?? "Landlord",
      landlordSignedAt: asDate(l.landlordSignature?.at, asDate(l.createdAt)),
      landlordSignatureIp: l.landlordSignature?.ip ?? null,
      tenantSignatureName: l.tenantSignature?.name ?? null,
      tenantSignedAt: l.tenantSignature?.at ? asDate(l.tenantSignature.at) : null,
      tenantSignatureIp: l.tenantSignature?.ip ?? null,
      tenantSignatureUserAgent: l.tenantSignature?.userAgent ?? null,
    };
    await db.lease.upsert({
      where: { applicationId: l.applicationId },
      update: data,
      create: { ...data, createdAt: asDate(l.createdAt) },
    });
  }

  // ── Tenant profiles ──────────────────────────────────────────────────────
  // The old store kept one free-form JSON blob per user; the columns below are the parts the
  // schema now models explicitly. Anything else in the blob was never read by the API.
  for (const p of old.profiles ?? []) {
    if (!userIds.has(p.userId)) { note(`profile ${p.userId}: user missing, skipped`); continue; }
    const d = p.data ?? {};
    const data = {
      fullName: d.basics?.fullName ?? null,
      email: d.basics?.email ?? null,
      phone: d.basics?.phone ?? null,
      city: d.basics?.city ?? null,
      areas: Array.isArray(d.basics?.areas) ? d.basics.areas : [],
      landlordReference: (d.landlordReference ?? null) as any,
      characterReference: (d.characterReference ?? null) as any,
      guarantor: (d.guarantor ?? null) as any,
      creditConsent: !!d.credit?.consent,
      creditStatus: d.credit?.status === "verified" ? ("VERIFIED" as const) : d.credit?.consent ? ("PENDING" as const) : ("NOT_STARTED" as const),
      backgroundConsent: !!d.background?.consent,
      backgroundStatus: d.background?.status === "verified" ? ("VERIFIED" as const) : d.background?.consent ? ("PENDING" as const) : ("NOT_STARTED" as const),
      identityStatus: d.identity?.status === "verified" ? ("VERIFIED" as const) : d.identity?.consent ? ("PENDING" as const) : ("NOT_STARTED" as const),
    };
    await db.tenantProfile.upsert({
      where: { userId: p.userId },
      update: data,
      create: { userId: p.userId, ...data, updatedAt: asDate(p.updatedAt) },
    });
  }

  // ── Shared passports ─────────────────────────────────────────────────────
  for (const p of old.passports ?? []) {
    if (!userIds.has(p.ownerId)) { note(`passport ${p.token}: owner ${p.ownerId} missing, skipped`); continue; }
    const createdAt = asDate(p.createdAt);
    // The CHECK constraint requires expiresAt > createdAt; a malformed date would abort the batch.
    let expiresAt = asDate(p.expiresAt, new Date(createdAt.getTime() + 14 * 86_400_000));
    if (expiresAt <= createdAt) {
      expiresAt = new Date(createdAt.getTime() + 14 * 86_400_000);
      note(`passport ${p.token}: expiresAt was not after createdAt, reset to createdAt + 14d`);
    }
    const data = {
      ownerId: p.ownerId, recipientName: p.recipientName ?? null,
      recipientEmail: p.recipientEmail ?? null, recipientUnit: p.recipientUnit ?? null,
      data: (p.data ?? {}) as any, expiresAt,
    };
    await db.sharedPassport.upsert({
      where: { token: p.token },
      update: data,
      create: { token: p.token, ...data, createdAt },
    });
  }

  // ── Leads ────────────────────────────────────────────────────────────────
  for (const l of old.leads ?? []) {
    const intents = (l.intents ?? [])
      .map((i) => INTENT[i as keyof typeof INTENT])
      .filter((i): i is (typeof INTENT)[keyof typeof INTENT] => !!i);
    const email = l.email.trim().toLowerCase();
    await db.lead.upsert({
      where: { email },
      update: { intents, city: l.city ?? null, reportSnapshot: (l.reportSnapshot ?? null) as any },
      create: { id: l.id ?? crypto.randomUUID(), email, intents, city: l.city ?? null, reportSnapshot: (l.reportSnapshot ?? null) as any, createdAt: asDate(l.createdAt) },
    });
  }

  console.table({
    users: await db.user.count(),
    listings: await db.listing.count(),
    applications: await db.application.count(),
    optIns: await db.screeningOptIn.count(),
    checks: await db.screeningCheck.count(),
    leases: await db.lease.count(),
    profiles: await db.tenantProfile.count(),
    passports: await db.sharedPassport.count(),
    leads: await db.lead.count(),
  });

  if (skipped.length) {
    console.warn(`\n${skipped.length} item(s) needed attention:`);
    for (const s of skipped) console.warn(`  - ${s}`);
  } else {
    console.log("\nImported cleanly, nothing skipped.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
