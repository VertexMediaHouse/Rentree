import { Router } from "express";
import crypto from "node:crypto";
import { rateLimit } from "express-rate-limit";
import type { SharedPassport } from "@prisma/client";
import type { z } from "zod";
import { verifyToken } from "../lib/auth";
import { db } from "../lib/db";
import {
  memCreateAccess,
  memCreateAddonRequest,
  memCreatePassport,
  memPassportByToken,
  memRevokePassport,
  memUserById,
  orMemory,
} from "../lib/memoryStore";
import { dbAddonKind, dbDocumentKind, dbProofType, dbServiceAddon } from "../lib/enums";
import { escapeHtml, sendEmail } from "../lib/email";
import { HttpError } from "../lib/errors";
import { addonRequestSchema, passportAccessSchema, sharePassportSchema } from "../lib/schemas";
import { requireAuth, validate } from "../middleware/http";

const router = Router();
// 14 days, per the agreed sharing policy. The V4 share screen no longer promises a fixed window,
// so this is the only place the lifetime is stated.
const TTL_DAYS = 14;

function shareEmail(p: { recipientName: string; recipientUnit?: string; data: Record<string, any> }, url: string) {
  const d = p.data;
  const sender = escapeHtml(d.name || "A renter");
  const rows = [
    // Free-text field: show it as typed unless it's a plain number
    ["Budget", d.budgetMax && `${Number.isFinite(Number(d.budgetMax)) ? `$${Number(d.budgetMax).toLocaleString("en-CA")}` : d.budgetMax}/mo`],
    ["Move-in", d.moveIn],
    ["Looking for", d.unitType],
    ["Employment", d.employment],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#ffffff99;font-size:12px">${k}</td><td style="padding:4px 0;color:#fff;font-size:13px;font-weight:600">${escapeHtml(String(v))}</td></tr>`)
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#FAF7F0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#24352B">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
  <p style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#E8703A;font-weight:700;margin:0 0 8px">Rentre · Renter Passport</p>
  <h1 style="font-size:22px;margin:0 0 16px">${sender} shared their Renter Passport with you</h1>
  <p style="font-size:14px;line-height:1.6">Hi ${escapeHtml(p.recipientName)},</p>
  <p style="font-size:14px;line-height:1.6">${sender} has shared their Renter Passport with you through Rentre${p.recipientUnit ? ` regarding <strong>${escapeHtml(p.recipientUnit)}</strong>` : ""}. It includes self-reported details and any documents they chose to include.</p>
  ${rows ? `<div style="background:#16261D;border-radius:12px;padding:20px 24px;margin:24px 0"><table style="border-collapse:collapse">${rows}</table></div>` : ""}
  <p style="text-align:center;margin:28px 0"><a href="${url}" style="display:inline-block;background:#16261D;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 32px;border-radius:12px">View full passport →</a></p>
  <p style="font-size:11px;color:#8A8580;text-align:center">Link expires in ${TTL_DAYS} days. The renter can revoke it at any time.</p>
  <p style="font-size:11px;color:#A09890;text-align:center;margin-top:32px;border-top:1px solid #D5CFC3;padding-top:16px">You received this because a renter chose to share their passport with you. Rentre does not verify self-reported information.</p>
</div></body></html>`;
}

// Signed-in (email-verified) renters only, so our sending domain can't be used as an open relay
router.post(
  "/share",
  requireAuth("tenant"),
  rateLimit({ windowMs: 60 * 60_000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false }),
  validate(sharePassportSchema),
  async (req, res) => {
    const { recipientName, recipientEmail, recipientUnit, passport } = req.body;
    const now = new Date();
    const token = crypto.randomUUID();
    const email = recipientEmail.toLowerCase();
    const url = `${(process.env.PUBLIC_APP_URL || "http://localhost:5173").replace(/\/$/, "")}/share?t=${token}`;

    await sendEmail({
      to: email,
      subject: `${passport.name || "A renter"} shared their Renter Passport with you`,
      html: shareEmail({ recipientName, recipientUnit, data: passport }, url),
      replyTo: passport.email, // replies go to the renter, only if they chose to share contact details
    });

    // Recorded only after the email is accepted, so a failed send leaves no dangling link.
    const record = {
      token,
      ownerId: req.auth!.sub,
      recipientName,
      recipientEmail: email,
      recipientUnit: recipientUnit ?? null,
      data: passport,
      expiresAt: new Date(now.getTime() + TTL_DAYS * 86_400_000),
    };
    await orMemory(
      () => db.sharedPassport.create({ data: record }),
      () => memCreatePassport(record)
    );

    res.status(201).json({ success: true, data: { token, url } });
  }
);

// Revocation and expiry both close the link for good; see livePassport below.
router.get("/:token", async (req, res) => {
  res.json({ success: true, data: presentPassport(await livePassport(req.params.token as string)) });
});

/** Readable only while the link is live. Shared by the GET and the ownership gate. */
async function livePassport(token: string) {
  const p = await orMemory(
    () => db.sharedPassport.findUnique({ where: { token } }),
    () => memPassportByToken(token)
  );
  if (!p) throw new HttpError(404, "This passport link is invalid");
  if (p.revokedAt) throw new HttpError(410, "This passport link was revoked by the renter");
  if (p.expiresAt < new Date()) throw new HttpError(410, "This passport link has expired");
  return p;
}

const presentPassport = (p: SharedPassport) => {
  // Reference phones stay with Rentre (it runs the reference calls); the page shows "phone hidden"
  const { landlordPhone, ...passport } = (p.data ?? {}) as Record<string, unknown>;
  return {
    recipientName: p.recipientName ?? undefined,
    recipientUnit: p.recipientUnit ?? undefined,
    buildingAddress: p.buildingAddress ?? undefined,
    passport,
    createdAt: p.createdAt.toISOString(),
    expiresAt: p.expiresAt.toISOString(),
  };
};

/**
 * The landlord's ownership gate. "Rentre logs all access for compliance", so every unlock is a row
 * before the profile is returned. The token is still the capability — this records who used it and
 * what they claimed, it does not verify ownership, which no document check here could.
 */
router.post(
  "/:token/access",
  rateLimit({ windowMs: 60 * 60_000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false }),
  validate(passportAccessSchema),
  async (req, res) => {
    const p = await livePassport(req.params.token as string);
    const { claimedUnit, proofType, proofFileName } = req.body;

    // Optional: the gate works without an account, but if the landlord happens to be signed in
    // we attribute the access to them.
    const header = req.headers.authorization;
    const viewer = header?.startsWith("Bearer ") ? verifyToken(header.slice(7)) : null;

    const access = {
      passportId: p.id,
      viewerId: viewer?.sub ?? null,
      claimedUnit,
      proofType: dbProofType(proofType),
      proofFileName: proofFileName ?? null,
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent")?.slice(0, 300) ?? null,
    };
    await orMemory(
      () => db.passportAccess.create({ data: access }),
      () => memCreateAccess(access)
    );

    res.status(201).json({ success: true, data: presentPassport(p) });
  }
);

/** What the landlord asks for after unlocking: paid services, missing documents, or a viewing. */
router.post(
  "/:token/requests",
  rateLimit({ windowMs: 60 * 60_000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false }),
  validate(addonRequestSchema),
  async (req, res) => {
    const p = await livePassport(req.params.token as string);
    const body = req.body as z.infer<typeof addonRequestSchema>;

    // Optional: the gate works without an account, but if the landlord happens to be signed in
    // we attribute the access to them.
    const header = req.headers.authorization;
    const viewer = header?.startsWith("Bearer ") ? verifyToken(header.slice(7)) : null;

    const request = {
      passportId: p.id,
      requesterId: viewer?.sub ?? null,
      kind: dbAddonKind(body.kind),
      claimedUnit: body.claimedUnit,
      addons: body.kind === "services" ? body.addons.map(dbServiceAddon) : [],
      referenceQuestions: body.kind === "services" ? body.referenceQuestions : [],
      requestedDocuments: body.kind === "documents" ? body.requestedDocuments.map(dbDocumentKind) : [],
      viewingDay: body.kind === "viewing" ? body.viewingDay : null,
      viewingDate: body.kind === "viewing" ? body.viewingDate : null,
      viewingTime: body.kind === "viewing" ? body.viewingTime : null,
      viewingNote: body.kind === "viewing" ? (body.viewingNote ?? null) : null,
    };
    const created = await orMemory(
      () => db.addonRequest.create({ data: request }),
      () => memCreateAddonRequest(request)
    );

    // Tell the renter what was asked of them, so a document or viewing request is actionable.
    const owner = await orMemory(
      () => db.user.findUnique({ where: { id: p.ownerId }, select: { email: true, name: true } }),
      () => memUserById(p.ownerId)
    );
    if (owner) {
      const summary =
        body.kind === "services"
          ? `ordered ${body.addons.length} Rentre service${body.addons.length === 1 ? "" : "s"}`
          : body.kind === "documents"
            ? `requested ${body.requestedDocuments.length} document${body.requestedDocuments.length === 1 ? "" : "s"}`
            : `proposed a viewing on ${body.viewingDay} ${body.viewingDate} at ${body.viewingTime}`;
      await sendEmail({
        to: owner.email,
        subject: `A landlord ${summary} — ${body.claimedUnit}`,
        html: `<!doctype html><html><body style="margin:0;background:#FAF7F0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#24352B">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
  <p style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#E8703A;font-weight:700;margin:0 0 8px">Rentre · Renter Passport</p>
  <h1 style="font-size:22px;margin:0 0 16px">Next step on your passport</h1>
  <p style="font-size:14px;line-height:1.6">Hi ${escapeHtml(owner.name)},</p>
  <p style="font-size:14px;line-height:1.6">A landlord reviewing your passport for <strong>${escapeHtml(body.claimedUnit)}</strong> ${escapeHtml(summary)}.</p>
  <p style="font-size:12px;color:#8A8580">Sign in to Rentre to see the details and respond.</p>
</div></body></html>`,
      }).catch((err) => console.error("Add-on request email failed", owner.email, err.message));
    }

    res.status(201).json({ success: true, data: { id: created.id, kind: body.kind, status: created.status.toLowerCase() } });
  }
);

/** The renter may cut off a link they already sent. Idempotent: revoking twice keeps the first time. */
router.delete("/:token", requireAuth("tenant"), async (req, res) => {
  const token = req.params.token as string;
  const p = await orMemory(
    () => db.sharedPassport.findUnique({ where: { token }, select: { id: true, ownerId: true, revokedAt: true } }),
    () => memPassportByToken(token)
  );
  if (!p) throw new HttpError(404, "This passport link is invalid");
  if (p.ownerId !== req.auth!.sub) throw new HttpError(403, "Not your passport link");

  const revokedAt =
    p.revokedAt ??
    (await orMemory(
      async () =>
        (await db.sharedPassport.update({ where: { id: p.id }, data: { revokedAt: new Date() }, select: { revokedAt: true } }))
          .revokedAt!,
      () => memRevokePassport(token)
    ));
  res.json({ success: true, data: { revokedAt: revokedAt.toISOString() } });
});

export default router;
