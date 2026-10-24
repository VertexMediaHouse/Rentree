import { Router } from "express";
import crypto from "node:crypto";
import type { User } from "@prisma/client";
import { db } from "../lib/db";
import { memCreateUser, memUserByEmail, memUserById, orMemory } from "../lib/memoryStore";
import { authRole, dbRole } from "../lib/enums";
import { HttpError } from "../lib/errors";
import { hashPassword, issueToken, verifyPassword } from "../lib/auth";
import { sendEmail } from "../lib/email";
import { loginSchema, otpRequestSchema, otpVerifySchema, registerSchema } from "../lib/schemas";
import { requireAuth, validate } from "../middleware/http";

/**
 * Sign-in is ours, not Supabase Auth's: the Supabase project is the client's and a publishable key
 * cannot set the sender or template for a sign-in email. Doing it here means the code goes out
 * through Resend on a domain we control.
 *
 * Deliberately needs no database. Pending codes live in memory, and if Postgres is not configured
 * yet the verified account is held in memory too, so the whole flow can be exercised first and
 * persisted later.
 */
const router = Router();
const isProd = process.env.NODE_ENV === "production";

/** Never leak the password hash, and keep the lowercase role the clients already parse. */
const publicUser = (u: User) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role.toLowerCase(),
  createdAt: u.createdAt.toISOString(),
});

const sessionFor = (u: User) => ({ user: publicUser(u), token: issueToken(u.id, authRole(u.role)) });

// ── Accounts ──────────────────────────────────────────────────────────────────

/** Finds or creates the account for a verified email, in Postgres when it is available. */
async function findOrCreateUser(email: string, name: string): Promise<User> {
  return orMemory(
    async () =>
      (await db.user.findFirst({ where: { email, deletedAt: null } })) ??
      (await db.user.create({ data: { email, name, role: "TENANT" } })),
    () => memUserByEmail(email) ?? memCreateUser(email, name)
  );
}

async function findUserById(id: string): Promise<User | null> {
  return orMemory(
    () => db.user.findFirst({ where: { id, deletedAt: null } }),
    () => memUserById(id)
  );
}

router.post("/register", validate(registerSchema), async (req, res) => {
  const { email, password, name, role } = req.body;
  const normalized = email.trim().toLowerCase();
  if (await db.user.findUnique({ where: { email: normalized }, select: { id: true } })) {
    throw new HttpError(409, "Email already registered");
  }
  const user = await db.user.create({
    data: { email: normalized, name, role: dbRole(role), passwordHash: hashPassword(password) },
  });
  res.status(201).json({ success: true, data: sessionFor(user) });
});

router.post("/login", validate(loginSchema), async (req, res) => {
  const user = await db.user.findFirst({
    where: { email: req.body.email.trim().toLowerCase(), deletedAt: null },
  });
  // Same error for unknown email and wrong password to avoid account enumeration
  if (!user?.passwordHash || !verifyPassword(req.body.password, user.passwordHash)) {
    throw new HttpError(401, "Invalid email or password");
  }
  res.json({ success: true, data: sessionFor(user) });
});

// ── Passwordless sign-in: email a 6-digit code, exchange it for a session token ──

const OTP_TTL_MS = 10 * 60_000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_MS = 30_000;

/**
 * ponytail: pending codes are process-local, so they die on restart and are not shared between
 * instances. Move them to the otp_codes table (the model already exists) if the API is ever run
 * as more than one process.
 */
const otps = new Map<string, { codeHash: string; name?: string; expires: number; attempts: number; sentAt: number }>();

/** Hashed even in memory, so a heap dump or log of this map does not expose live codes. */
const hashCode = (code: string) => crypto.createHash("sha256").update(code).digest("hex");

const otpEmail = (code: string) => `<!doctype html><html><body style="margin:0;background:#FAF7F0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#24352B">
<div style="max-width:480px;margin:0 auto;padding:32px 16px">
  <p style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#E8703A;font-weight:700;margin:0 0 8px">Rentre</p>
  <h1 style="font-size:20px;margin:0 0 16px">Your sign-in code</h1>
  <p style="font-size:14px;line-height:1.6">Enter this code to confirm your email and sign in:</p>
  <p style="font-size:34px;font-weight:700;letter-spacing:.3em;background:#16261D;color:#fff;border-radius:12px;padding:18px 0;text-align:center;margin:24px 0">${code}</p>
  <p style="font-size:12px;color:#8A8580">It expires in ${OTP_TTL_MS / 60_000} minutes. If you didn't try to sign in to Rentre, you can ignore this email.</p>
</div></body></html>`;

router.post("/otp/request", validate(otpRequestSchema), async (req, res) => {
  const email = req.body.email.trim().toLowerCase();

  // Drop expired codes so abandoned sign-ins don't accumulate in memory
  for (const [k, v] of otps) if (v.expires < Date.now()) otps.delete(k);

  const prev = otps.get(email);
  if (prev && Date.now() - prev.sentAt < OTP_RESEND_MS) {
    throw new HttpError(429, "Please wait 30 seconds before requesting another code");
  }

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  otps.set(email, {
    codeHash: hashCode(code),
    name: req.body.name,
    expires: Date.now() + OTP_TTL_MS,
    attempts: 0,
    sentAt: Date.now(),
  });

  if (!isProd) console.log(`[dev] sign-in code for ${email}: ${code}`);
  try {
    await sendEmail({ to: email, subject: `${code} is your Rentre sign-in code`, html: otpEmail(code) });
  } catch (err) {
    if (isProd) {
      otps.delete(email);
      throw err;
    }
    // A sandbox sender only delivers to the Resend account owner; in dev the logged code still works
    console.warn(`[dev] code email not delivered: ${(err as Error).message}`);
  }
  // Same response whether or not the account exists, so this can't be used to probe for registered emails
  res.status(202).json({ success: true });
});

router.post("/otp/verify", validate(otpVerifySchema), async (req, res) => {
  const email = req.body.email.trim().toLowerCase();
  const entry = otps.get(email);

  if (!entry || entry.expires < Date.now()) {
    otps.delete(email);
    throw new HttpError(400, "This code has expired. Request a new one.");
  }
  // Counted before the comparison, so a guess costs an attempt either way.
  if (++entry.attempts > OTP_MAX_ATTEMPTS) {
    otps.delete(email);
    throw new HttpError(429, "Too many incorrect attempts. Request a new code.");
  }
  if (!crypto.timingSafeEqual(Buffer.from(entry.codeHash), Buffer.from(hashCode(req.body.code)))) {
    throw new HttpError(400, "That code is incorrect");
  }
  otps.delete(email); // single use

  const user = await findOrCreateUser(email, entry.name?.trim() || email.split("@")[0]);
  res.json({ success: true, data: sessionFor(user) });
});

router.get("/me", requireAuth(), async (req, res) => {
  const user = await findUserById(req.auth!.sub);
  if (!user) throw new HttpError(401, "Account no longer exists");
  res.json({ success: true, data: publicUser(user) });
});

export default router;
