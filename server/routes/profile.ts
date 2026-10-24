import { Router } from "express";
import type { Prisma, TenantProfile } from "@prisma/client";
import { db } from "../lib/db";
import { memProfile, memUpsertProfile, orMemory } from "../lib/memoryStore";
import { profileSchema } from "../lib/schemas";
import { requireAuth, validate } from "../middleware/http";

const router = Router();

const filled = (o: any, keys: string[]) =>
  !!o && keys.every((k) => (typeof o[k] === "string" ? o[k].trim() !== "" : !!o[k]));

/**
 * Section completion. Credit, background and identity need a third-party provider (Borrowell, SingleKey, KYC vendor),
 * so consent alone only moves them to "pending"; a provider callback must set status to "verified".
 */
export function evaluate(data: Record<string, any>) {
  const vendor = (key: string) =>
    data[key]?.status === "verified" ? "complete" : data[key]?.consent ? "pending" : "not_started";
  const contact = (key: string, keys: string[]) => (filled(data[key], keys) ? "complete" : data[key] ? "partial" : "not_started");
  const sections = {
    basics: contact("basics", ["fullName", "email", "phone", "city"]),
    credit: vendor("credit"),
    landlordReference: contact("landlordReference", ["name", "phone", "email", "consent"]),
    characterReference: contact("characterReference", ["name", "relationship", "phone", "email", "consent"]),
    background: vendor("background"),
    identity: vendor("identity"),
    guarantor: contact("guarantor", ["name", "relationship", "phone", "email"]), // optional, not counted in strength
  };
  const required = ["basics", "credit", "landlordReference", "characterReference", "background", "identity"] as const;
  const done = required.filter((k) => sections[k] === "complete").length;
  return {
    sections,
    strengthPct: Math.round((done / required.length) * 100),
    // "Complete" tier only once every required section is in; basics alone is the "Incomplete" tier.
    tier: done === required.length ? "complete" : "incomplete",
  };
}

/**
 * Columns are the source of truth; the API still speaks in sections. A section is omitted entirely
 * when untouched, so `evaluate` can tell "not started" from "started but empty" exactly as before.
 */
function toSections(p: TenantProfile | null): Record<string, any> {
  if (!p) return {};
  const status = (s: string) => s.toLowerCase();
  const basics = {
    ...(p.fullName !== null && { fullName: p.fullName }),
    ...(p.email !== null && { email: p.email }),
    ...(p.phone !== null && { phone: p.phone }),
    ...(p.city !== null && { city: p.city }),
    ...(p.areas.length > 0 && { areas: p.areas }),
  };
  const vendor = (consent: boolean, s: string) =>
    consent || s !== "NOT_STARTED" ? { consent, status: status(s) } : undefined;

  const employment = {
    ...(p.employment !== null && { employment: p.employment }),
    ...(p.employer !== null && { employer: p.employer }),
    ...(p.jobTitle !== null && { jobTitle: p.jobTitle }),
    ...(p.income !== null && { income: p.income }),
  };
  const rentalHistory = {
    ...(p.currentAddress !== null && { currentAddress: p.currentAddress }),
    ...(p.timeAtAddress !== null && { timeAtAddress: p.timeAtAddress }),
    ...(p.currentLandlord !== null && { currentLandlord: p.currentLandlord }),
    ...(p.landlordPhone !== null && { landlordPhone: p.landlordPhone }),
  };
  const preferences = {
    ...(p.unitType !== null && { unitType: p.unitType }),
    ...(p.bedrooms !== null && { bedrooms: p.bedrooms }),
    ...(p.moveIn !== null && { moveIn: p.moveIn }),
    ...(p.leaseTerm !== null && { leaseTerm: p.leaseTerm }),
    ...(p.budgetMin !== null && { budgetMin: Number(p.budgetMin) }),
    ...(p.budgetMax !== null && { budgetMax: Number(p.budgetMax) }),
    coApplicants: p.coApplicants,
  };

  return {
    ...(Object.keys(basics).length > 0 && { basics }),
    ...(Object.keys(employment).length > 0 && { employment }),
    ...(Object.keys(rentalHistory).length > 0 && { rentalHistory }),
    ...(Object.keys(preferences).length > 1 && { preferences }),
    ...(p.landlordReference !== null && { landlordReference: p.landlordReference }),
    ...(p.characterReference !== null && { characterReference: p.characterReference }),
    ...(p.guarantor !== null && { guarantor: p.guarantor }),
    ...(vendor(p.creditConsent, p.creditStatus) && { credit: vendor(p.creditConsent, p.creditStatus) }),
    ...(vendor(p.backgroundConsent, p.backgroundStatus) && { background: vendor(p.backgroundConsent, p.backgroundStatus) }),
    ...(vendor(p.identityConsent, p.identityStatus) && { identity: vendor(p.identityConsent, p.identityStatus) }),
  };
}

/** Only the vendor `consent` flags are writable here — status belongs to the provider callback. */
function toColumns(body: Record<string, any>, current: TenantProfile | null): Prisma.TenantProfileUpdateInput {
  const data: Prisma.TenantProfileUpdateInput = {};
  if (body.basics) {
    const b = body.basics;
    if (b.fullName !== undefined) data.fullName = b.fullName;
    if (b.email !== undefined) data.email = b.email;
    if (b.phone !== undefined) data.phone = b.phone;
    if (b.city !== undefined) data.city = b.city;
    if (b.areas !== undefined) data.areas = b.areas;
  }
  // Field-by-field merge over the stored object, so saving one field never wipes the rest.
  const mergeJson = (key: "landlordReference" | "characterReference" | "guarantor") => {
    if (!body[key]) return;
    const prev = (current?.[key] ?? {}) as Record<string, unknown>;
    data[key] = { ...prev, ...body[key] };
  };
  mergeJson("landlordReference");
  mergeJson("characterReference");
  mergeJson("guarantor");

  if (body.credit?.consent !== undefined) data.creditConsent = body.credit.consent;
  if (body.background?.consent !== undefined) data.backgroundConsent = body.background.consent;
  if (body.identity?.consent !== undefined) data.identityConsent = body.identity.consent;

  // Flat sections from the onboarding wizard. Copied field by field so an omitted key is left
  // alone rather than nulled, which is what makes autosave safe.
  const copy = <S extends object>(section: S | undefined, keys: Array<keyof S & keyof Prisma.TenantProfileUpdateInput>) => {
    if (!section) return;
    for (const k of keys) {
      const v = (section as Record<string, unknown>)[k as string];
      if (v !== undefined) (data as Record<string, unknown>)[k as string] = v;
    }
  };
  copy(body.employment, ["employment", "employer", "jobTitle", "income"]);
  copy(body.rentalHistory, ["currentAddress", "timeAtAddress", "currentLandlord", "landlordPhone"]);
  copy(body.preferences, ["unitType", "bedrooms", "moveIn", "leaseTerm", "budgetMin", "budgetMax", "coApplicants", "areas"]);
  return data;
}

const present = (p: TenantProfile | null) => {
  const sections = toSections(p);
  return { profile: sections, ...evaluate(sections) };
};

router.get("/", requireAuth("tenant"), async (req, res) => {
  const userId = req.auth!.sub;
  const profile = await orMemory(
    () => db.tenantProfile.findUnique({ where: { userId } }),
    () => memProfile(userId)
  );
  res.json({ success: true, data: present(profile) });
});

// Autosave: merges each provided section field-by-field, so a single-field save never wipes the rest.
router.put("/", requireAuth("tenant"), validate(profileSchema), async (req, res) => {
  const userId = req.auth!.sub;
  const current = await orMemory(
    () => db.tenantProfile.findUnique({ where: { userId } }),
    () => memProfile(userId)
  );
  const data = toColumns(req.body, current);
  const profile = await orMemory(
    () =>
      db.tenantProfile.upsert({
        where: { userId },
        update: data,
        create: { userId, ...(data as Prisma.TenantProfileCreateWithoutUserInput) },
      }),
    () => memUpsertProfile(userId, data as Record<string, unknown>)
  );
  res.json({ success: true, data: present(profile) });
});

export default router;
