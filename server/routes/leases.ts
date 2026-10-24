import { Router } from "express";
import crypto from "node:crypto";
import type { Lease } from "@prisma/client";
import { db } from "../lib/db";
import { escapeHtml, sendEmail } from "../lib/email";
import { HttpError } from "../lib/errors";
import { createLeaseFromPassportSchema, createLeaseSchema, signLeaseSchema } from "../lib/schemas";
import { requireAuth, validate } from "../middleware/http";

const router = Router();
const appUrl = () => (process.env.PUBLIC_APP_URL || "http://localhost:5173").replace(/\/$/, "");

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/**
 * The hash covers everything both parties agree to, so any later edit is detectable.
 * Dates are hashed as YYYY-MM-DD and money as a plain number, matching what the client sent —
 * change either and every lease signed before the change fails its own tamper check.
 */
const leaseHash = (l: {
  address: string; tenantName: string; tenantEmail: string;
  startDate: string; endDate: string | null; monthlyRent: number; deposit: number | null; terms: string;
}) =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify([l.address, l.tenantName, l.tenantEmail, l.startDate, l.endDate, l.monthlyRent, l.deposit, l.terms]))
    .digest("hex");

const hashOf = (l: Lease) =>
  leaseHash({
    address: l.address,
    tenantName: l.tenantName,
    tenantEmail: l.tenantEmail,
    startDate: isoDay(l.startDate),
    endDate: l.endDate ? isoDay(l.endDate) : null,
    monthlyRent: Number(l.monthlyRent),
    deposit: l.deposit === null ? null : Number(l.deposit),
    terms: l.terms,
  });

const emailShell = (title: string, body: string) => `<!doctype html><html><body style="margin:0;background:#FAF7F0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#24352B">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
  <p style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#E8703A;font-weight:700;margin:0 0 8px">Rentre · Lease</p>
  <h1 style="font-size:22px;margin:0 0 16px">${title}</h1>${body}
</div></body></html>`;
const button = (url: string, label: string) =>
  `<p style="text-align:center;margin:28px 0"><a href="${url}" style="display:inline-block;background:#16261D;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 32px;border-radius:12px">${label}</a></p>`;

interface LeaseFields {
  startDate: string;
  endDate?: string;
  monthlyRent: number;
  deposit?: number;
  terms: string;
}

/**
 * Signs the lease as the landlord, emails the tenant the link to countersign, and stores it.
 * Shared by both origins — an approved application, or a shared passport whose landlord ordered
 * lease signing. `origin` is what the leases_one_origin CHECK constraint requires exactly one of.
 */
async function draftAndSend(opts: {
  landlordId: string;
  tenant: { id: string; name: string; email: string };
  address: string;
  signatureName: string;
  ip?: string;
  fields: LeaseFields;
  origin: { applicationId: string } | { passportId: string };
}) {
  const { landlordId, tenant, address, signatureName, ip, fields, origin } = opts;
  const hash = leaseHash({
    address,
    tenantName: tenant.name,
    tenantEmail: tenant.email,
    startDate: fields.startDate,
    endDate: fields.endDate ?? null,
    monthlyRent: fields.monthlyRent,
    deposit: fields.deposit ?? null,
    terms: fields.terms,
  });

  const token = crypto.randomUUID();
  const url = `${appUrl()}/lease?t=${token}`;

  await sendEmail({
    to: tenant.email,
    subject: `Your lease for ${address} is ready to sign`,
    html: emailShell(
      "Your lease is ready to sign",
      `<p style="font-size:14px;line-height:1.6">Hi ${escapeHtml(tenant.name)},</p>
  <p style="font-size:14px;line-height:1.6">${escapeHtml(signatureName)} has signed the lease for <strong>${escapeHtml(address)}</strong> and sent it to you to review and sign.</p>
  ${button(url, "Review &amp; sign lease →")}
  <p style="font-size:11px;color:#8A8580;text-align:center">Only open this link yourself. Anyone with it can view the lease.</p>`
    ),
  });

  // Written only after the email is accepted, so a failed send leaves no dangling link.
  await db.lease.create({
    data: {
      token,
      ...origin,
      landlordId,
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantEmail: tenant.email,
      address,
      startDate: new Date(`${fields.startDate}T00:00:00Z`),
      endDate: fields.endDate ? new Date(`${fields.endDate}T00:00:00Z`) : null,
      monthlyRent: fields.monthlyRent,
      deposit: fields.deposit ?? null,
      terms: fields.terms,
      hash,
      landlordSignatureName: signatureName,
      landlordSignedAt: new Date(),
      landlordSignatureIp: ip ?? null,
    },
  });

  return { token, url, hash };
}

// Landlord drafts and signs first; the tenant gets an emailed link to review and countersign
router.post("/", requireAuth("landlord"), validate(createLeaseSchema), async (req, res) => {
  const { applicationId, signatureName, ...fields } = req.body;
  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: { listing: true, tenant: true },
  });
  if (!app || !app.listing) throw new HttpError(404, "Application not found");
  if (app.listing.ownerId !== req.auth!.sub) throw new HttpError(403, "Not allowed");
  if (app.status !== "APPROVED") throw new HttpError(409, "Approve the application before sending a lease");
  if (await db.lease.findUnique({ where: { applicationId }, select: { id: true } })) {
    throw new HttpError(409, "A lease was already sent for this application");
  }
  if (!app.tenant || app.tenant.deletedAt) throw new HttpError(404, "Tenant account no longer exists");

  const result = await draftAndSend({
    landlordId: req.auth!.sub,
    tenant: app.tenant,
    address: `${app.listing.address}${app.listing.unit ? `, ${app.listing.unit}` : ""}`,
    signatureName,
    ip: req.ip,
    fields,
    origin: { applicationId },
  });
  res.status(201).json({ success: true, data: result });
});

/**
 * The other origin: a landlord unlocked a shared passport and ordered lease signing, so there is
 * no listing and no application. Requires a signed-in landlord — the lease needs a real
 * counterparty to attribute the signature to, which the anonymous token gate cannot provide.
 */
router.post("/from-passport", requireAuth("landlord"), validate(createLeaseFromPassportSchema), async (req, res) => {
  const { passportToken, address, signatureName, ...fields } = req.body;

  const passport = await db.sharedPassport.findUnique({
    where: { token: passportToken },
    include: { owner: true },
  });
  if (!passport) throw new HttpError(404, "This passport link is invalid");
  if (passport.revokedAt) throw new HttpError(410, "This passport link was revoked by the renter");
  if (passport.expiresAt < new Date()) throw new HttpError(410, "This passport link has expired");
  if (!passport.owner || passport.owner.deletedAt) throw new HttpError(404, "Renter account no longer exists");

  // Only a landlord who actually went through the ownership gate on this passport may draft from it.
  const access = await db.passportAccess.findFirst({
    where: { passportId: passport.id, viewerId: req.auth!.sub },
    select: { id: true },
  });
  if (!access) throw new HttpError(403, "Confirm the unit on this passport before sending a lease");

  // Lease signing must have been ordered, which is also what the rent-back opt-in depends on.
  const ordered = await db.addonRequest.findFirst({
    where: { passportId: passport.id, kind: "SERVICES", addons: { has: "LEASE_SIGNING" } },
    select: { id: true },
  });
  if (!ordered) throw new HttpError(409, "Add the lease signing service before sending a lease");

  if (await db.lease.findFirst({ where: { passportId: passport.id, landlordId: req.auth!.sub }, select: { id: true } })) {
    throw new HttpError(409, "You already sent a lease for this passport");
  }

  const result = await draftAndSend({
    landlordId: req.auth!.sub,
    tenant: passport.owner,
    address,
    signatureName,
    ip: req.ip,
    fields,
    origin: { passportId: passport.id },
  });
  res.status(201).json({ success: true, data: result });
});

// The token is the capability: it was only ever sent to the tenant's verified email
const view = (l: Lease) => ({
  tenantName: l.tenantName,
  tenantEmail: l.tenantEmail,
  address: l.address,
  startDate: isoDay(l.startDate),
  endDate: l.endDate ? isoDay(l.endDate) : undefined,
  monthlyRent: Number(l.monthlyRent),
  deposit: l.deposit === null ? undefined : Number(l.deposit),
  terms: l.terms,
  hash: l.hash,
  createdAt: l.createdAt.toISOString(),
  landlordSignature: { name: l.landlordSignatureName, at: l.landlordSignedAt.toISOString() },
  tenantSignature: l.tenantSignatureName
    ? { name: l.tenantSignatureName, at: l.tenantSignedAt!.toISOString() }
    : undefined,
});

async function findLease(token: string) {
  const lease = await db.lease.findUnique({ where: { token } });
  if (!lease) throw new HttpError(404, "This lease link is invalid");
  return lease;
}

router.get("/:token", async (req, res) => {
  res.json({ success: true, data: view(await findLease(req.params.token as string)) });
});

router.post("/:token/sign", validate(signLeaseSchema), async (req, res) => {
  const lease = await findLease(req.params.token as string);
  if (lease.tenantSignatureName) throw new HttpError(409, "This lease is already signed");
  // A declined or withdrawn application cancels the unsigned lease. Passport-originated leases have
  // no application; revoking the passport afterwards does not cancel a lease already sent, since
  // the lease is its own agreement between the two parties.
  if (lease.applicationId) {
    const app = await db.application.findUnique({ where: { id: lease.applicationId }, select: { status: true } });
    if (app?.status !== "APPROVED") throw new HttpError(409, "This lease is no longer active");
  }
  if (hashOf(lease) !== lease.hash) throw new HttpError(409, "This lease was modified after it was sent");

  const signed = await db.lease.update({
    where: { id: lease.id },
    data: {
      tenantSignatureName: req.body.signatureName,
      tenantSignedAt: new Date(),
      tenantSignatureIp: req.ip ?? null,
      tenantSignatureUserAgent: req.get("user-agent")?.slice(0, 300) ?? null,
    },
  });

  // Both parties get a confirmation with the fingerprint of what was signed
  const landlord = await db.user.findUnique({ where: { id: signed.landlordId }, select: { email: true } });
  const html = emailShell(
    "Lease signed by both parties",
    `<p style="font-size:14px;line-height:1.6">The lease for <strong>${escapeHtml(signed.address)}</strong> is fully signed.</p>
  <p style="font-size:13px;line-height:1.7">Landlord: ${escapeHtml(signed.landlordSignatureName)} · ${signed.landlordSignedAt.toISOString()}<br>Tenant: ${escapeHtml(signed.tenantSignatureName!)} · ${signed.tenantSignedAt!.toISOString()}</p>
  <p style="font-size:11px;color:#8A8580;word-break:break-all">Document fingerprint (SHA-256): ${signed.hash}</p>
  ${button(`${appUrl()}/lease?t=${signed.token}`, "View signed lease →")}`
  );
  for (const to of [signed.tenantEmail, landlord?.email].filter(Boolean) as string[]) {
    // The signature is already recorded; a failed confirmation email must not undo it
    await sendEmail({ to, subject: `Signed: lease for ${signed.address}`, html }).catch((err) =>
      console.error("Lease confirmation email failed", to, err.message)
    );
  }
  res.json({ success: true, data: view(signed) });
});

export default router;
