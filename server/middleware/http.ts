import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, ZodType } from "zod";
import { HttpError } from "../lib/errors";
import { TokenPayload, verifyToken } from "../lib/auth";
import { isDbUnavailable } from "../lib/db";

declare module "express-serve-static-core" {
  interface Request {
    auth?: TokenPayload;
  }
}

/** Parse and strip unknown keys from req.body; replaces body with the typed result. */
export const validate =
  <T>(schema: ZodType<T>): RequestHandler =>
  (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new HttpError(
          400,
          "Validation failed",
          parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
        )
      );
    }
    req.body = parsed.data;
    next();
  };

/**
 * Validates the session token this API issued (HMAC-SHA256 over the payload, see lib/auth.ts).
 *
 * Identity is ours rather than Supabase Auth's, deliberately: the Supabase project is the client's
 * and we hold only a publishable key, which cannot configure the sender or template for a sign-in
 * email. Owning the token means the OTP goes out through Resend, which we do control.
 */
export const requireAuth =
  (role?: TokenPayload["role"]): RequestHandler =>
  (req, _res, next) => {
    const header = req.headers.authorization;
    const payload = header?.startsWith("Bearer ") ? verifyToken(header.slice(7)) : null;
    if (!payload) return next(new HttpError(401, "Authentication required"));
    if (role && payload.role !== role) return next(new HttpError(403, `Requires ${role} account`));
    req.auth = payload;
    next();
  };

export const notFound: RequestHandler = (req, _res, next) =>
  next(new HttpError(404, `Route not found: ${req.method} ${req.path}`));

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ success: false, error: err.message, details: err.details });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ success: false, error: "Validation failed" });
  }
  if (err?.type === "entity.parse.failed") return res.status(400).json({ success: false, error: "Malformed JSON body" });
  if (err?.type === "entity.too.large") return res.status(413).json({ success: false, error: "Request body too large" });
  // Database constraints are the backstop for races the route checks cannot win on their own
  // (two concurrent applications to one listing, a duplicate email). Without this they surface
  // as a 500 even though the request was simply a conflict.
  if (err?.code === "P2002") return res.status(409).json({ success: false, error: "Already exists" });
  if (err?.code === "P2003" || err?.code === "P2025") {
    return res.status(404).json({ success: false, error: "Referenced record not found" });
  }
  // The database is unreachable, rejecting the credentials, or has no schema. That is an
  // operator problem, not a bad request, and saying so beats a blank 500.
  if (isDbUnavailable(err)) {
    console.error("Database unavailable:", err?.code ?? err?.name, "-", String(err?.message ?? "").split(/\r?\n/)[0]);
    return res.status(503).json({
      success: false,
      error: "Database not available. Sign-in works; saving data needs DATABASE_URL configured.",
    });
  }
  console.error(err);
  res.status(500).json({ success: false, error: "Internal server error" });
}
