import { Router } from "express";
import { z } from "zod";
import type { Application, Listing, ScreeningCheck, ScreeningOptIn, ScreeningStep } from "@prisma/client";
import { db, daysSince } from "../lib/db";
import { apiCheckStatus, apiStep, dbStatus, dbStep } from "../lib/enums";
import { HttpError } from "../lib/errors";
import { getConversation, startCall } from "../lib/elevenlabs";
import { checkSchema, createApplicationSchema, optInSchema } from "../lib/schemas";
import { requireAuth, validate } from "../middleware/http";

const router = Router();

type WithRelations = Application & { listing: Listing | null; optIns: ScreeningOptIn[] };

/**
 * Call results only go out through GET /:id/checks (landlord only). Reference and interview phones stay with
 * Rentre, which places the calls: landlords see what was consented to and when, never the numbers.
 */
const presentOptIns = (rows: ScreeningOptIn[], role: "tenant" | "landlord") => {
  if (rows.length === 0) return undefined;
  const out: Record<string, Record<string, unknown>> = {};
  for (const r of rows) {
    const at = r.consentedAt.toISOString();
    if (r.step === "REFERENCE") {
      out.reference = {
        name: r.contactName,
        ...(role === "tenant" && { phone: r.contactPhone }),
        relationship: r.relationship,
        at,
      };
    } else if (r.step === "INTERVIEW") {
      out.interview = { ...(role === "tenant" && { phone: r.contactPhone }), at };
    } else {
      out.report = { at };
    }
  }
  return out;
};

const present = (a: WithRelations, role: "tenant" | "landlord") => ({
  id: a.id,
  listingId: a.listingId,
  tenantId: a.tenantId,
  tenantName: a.tenantName,
  message: a.message ?? undefined,
  monthlyIncome: a.monthlyIncome === null ? undefined : Number(a.monthlyIncome),
  creditScore: a.creditScore ?? undefined,
  status: a.status.toLowerCase(),
  createdAt: a.createdAt.toISOString(),
  optIns: presentOptIns(a.optIns, role),
  appliedDays: daysSince(a.createdAt),
  address: a.listing ? `${a.listing.address}${a.listing.unit ? `, ${a.listing.unit}` : ""}` : undefined,
  price: a.listing ? Number(a.listing.price) : undefined,
  landlord: a.listing?.landlord,
});

const presentCheck = (c: ScreeningCheck) => ({
  id: c.id,
  type: apiStep(c.step),
  status: apiCheckStatus(c.status),
  conversationId: c.conversationId ?? undefined,
  summary: c.summary ?? undefined,
  transcript: c.transcript ?? undefined,
  createdAt: c.createdAt.toISOString(),
});

// Tenants see their own applications; landlords see applications to their listings. Never public: contains PII.
router.get("/", requireAuth(), async (req, res) => {
  const { sub, role } = req.auth!;
  const rows = await db.application.findMany({
    where: role === "tenant" ? { tenantId: sub } : { listing: { ownerId: sub } },
    include: { listing: true, optIns: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ success: true, count: rows.length, data: rows.map((a) => present(a, role)) });
});

router.post("/", requireAuth("tenant"), validate(createApplicationSchema), async (req, res) => {
  const { listingId } = req.body;
  const listing = await db.listing.findFirst({ where: { id: listingId, deletedAt: null }, select: { id: true } });
  if (!listing) throw new HttpError(404, "Listing not found");
  const tenantId = req.auth!.sub;

  // Checked for a clear message; the partial unique index enforces it against concurrent posts.
  const live = await db.application.findFirst({
    where: { listingId, tenantId, status: { not: "WITHDRAWN" } },
    select: { id: true },
  });
  if (live) throw new HttpError(409, "You already applied to this listing");

  const tenant = await db.user.findUnique({ where: { id: tenantId }, select: { name: true } });
  const created = await db.application.create({
    data: {
      listingId,
      tenantId,
      tenantName: tenant?.name ?? "Tenant",
      message: req.body.message ?? null,
      monthlyIncome: req.body.monthlyIncome ?? null,
      creditScore: req.body.creditScore ?? null,
    },
    include: { listing: true, optIns: true },
  });
  res.status(201).json({ success: true, data: present(created, "tenant") });
});

const statusSchema = z.object({ status: z.enum(["reviewing", "interview", "approved", "declined", "withdrawn"]) });

router.patch("/:id/status", requireAuth(), validate(statusSchema), async (req, res) => {
  const app = await db.application.findUnique({
    where: { id: req.params.id as string },
    include: { listing: { select: { ownerId: true } } },
  });
  if (!app) throw new HttpError(404, "Application not found");
  const { sub, role } = req.auth!;
  const { status } = req.body;
  if (role === "tenant") {
    if (app.tenantId !== sub) throw new HttpError(403, "Not your application");
    if (status !== "withdrawn") throw new HttpError(403, "Tenants can only withdraw");
  } else if (app.listing?.ownerId !== sub || status === "withdrawn") {
    throw new HttpError(403, "Not allowed");
  }
  const updated = await db.application.update({
    where: { id: app.id },
    data: { status: dbStatus(status) },
    include: { listing: true, optIns: true },
  });
  res.json({ success: true, data: present(updated, role) });
});

// ── Screening: tenant opts in per step, landlord triggers the check ──

const STALE_CALL_MS = 60 * 60_000;

async function findApp(id: string) {
  const app = await db.application.findUnique({
    where: { id },
    include: { listing: { select: { ownerId: true, address: true } }, optIns: true, checks: true },
  });
  if (!app) throw new HttpError(404, "Application not found");
  return app;
}

router.put("/:id/opt-in", requireAuth("tenant"), validate(optInSchema), async (req, res) => {
  const app = await findApp(req.params.id as string);
  if (app.tenantId !== req.auth!.sub) throw new HttpError(403, "Not your application");

  for (const key of ["reference", "interview", "report"] as const) {
    const v = req.body[key];
    if (v === undefined) continue;
    const step = dbStep(key);
    if (v === null) {
      // null withdraws consent for that step
      await db.screeningOptIn.deleteMany({ where: { applicationId: app.id, step } });
      continue;
    }
    const fields = v === true ? {} : (v as { name?: string; phone?: string; relationship?: string });
    const row = {
      contactName: fields.name ?? null,
      contactPhone: fields.phone ?? null,
      relationship: fields.relationship ?? null,
      consentedAt: new Date(),
    };
    await db.screeningOptIn.upsert({
      where: { applicationId_step: { applicationId: app.id, step } },
      update: row,
      create: { applicationId: app.id, step, ...row },
    });
  }

  const rows = await db.screeningOptIn.findMany({ where: { applicationId: app.id } });
  res.json({ success: true, data: presentOptIns(rows, "tenant") ?? {} });
});

router.post("/:id/checks", requireAuth("landlord"), validate(checkSchema), async (req, res) => {
  const app = await findApp(req.params.id as string);
  if (app.listing?.ownerId !== req.auth!.sub) throw new HttpError(403, "Not allowed");
  if (app.status === "DECLINED" || app.status === "WITHDRAWN") throw new HttpError(409, "Application is closed");

  const type: "reference" | "interview" | "report" = req.body.type;
  const step: ScreeningStep = dbStep(type);
  const consent = app.optIns.find((o) => o.step === step);
  if (!consent) throw new HttpError(409, "The tenant has not opted in to this check");
  if (app.checks.some((c) => c.step === step && c.status !== "FAILED")) {
    throw new HttpError(409, "This check was already requested");
  }
  // Placeholder until a report/ID provider is chosen
  if (step === "REPORT") throw new HttpError(501, "Background report and ID verification are coming soon");

  const vars: Record<string, string> = {
    tenant_name: app.tenantName,
    property_address: app.listing?.address ?? "the property",
  };

  // Reserved before the await so a double-click can't place two calls
  const check = await db.screeningCheck.create({ data: { applicationId: app.id, step, status: "CALLING" } });
  try {
    const conversationId =
      step === "REFERENCE"
        ? await startCall("reference", consent.contactPhone!, {
            ...vars,
            reference_name: consent.contactName!,
            relationship: consent.relationship!,
          })
        : await startCall("interview", app.optIns.find((o) => o.step === "INTERVIEW")!.contactPhone!, vars);
    const saved = await db.screeningCheck.update({ where: { id: check.id }, data: { conversationId } });
    res.status(201).json({ success: true, data: presentCheck(saved) });
  } catch (err) {
    await db.screeningCheck.delete({ where: { id: check.id } });
    throw err;
  }
});

// Landlord only: results include what the reference said. In-progress calls are refreshed from ElevenLabs on read.
router.get("/:id/checks", requireAuth("landlord"), async (req, res) => {
  const app = await findApp(req.params.id as string);
  if (app.listing?.ownerId !== req.auth!.sub) throw new HttpError(403, "Not allowed");

  for (const c of app.checks) {
    if (c.status !== "CALLING") continue;
    try {
      const conv = c.conversationId ? await getConversation(c.conversationId) : null;
      if (conv && (conv.status === "done" || conv.status === "failed")) {
        await db.screeningCheck.update({
          where: { id: c.id },
          data: {
            status: conv.status === "done" && conv.analysis?.call_successful !== "failure" ? "DONE" : "FAILED",
            summary: conv.analysis?.transcript_summary ?? null,
            transcript: (conv.transcript ?? []).filter((t) => t.message).map((t) => ({ role: t.role, message: t.message! })),
          },
        });
      } else if (Date.now() - c.createdAt.getTime() > STALE_CALL_MS) {
        // Unanswered or lost calls would otherwise block the landlord from requesting the check again
        await db.screeningCheck.update({
          where: { id: c.id },
          data: { status: "FAILED", summary: "No result after an hour. You can request this check again." },
        });
      }
    } catch (err) {
      console.warn("Could not refresh call", c.conversationId, (err as Error).message); // keep last known status
    }
  }

  const checks = await db.screeningCheck.findMany({ where: { applicationId: app.id }, orderBy: { createdAt: "asc" } });
  res.json({ success: true, data: checks.map(presentCheck) });
});

export default router;
