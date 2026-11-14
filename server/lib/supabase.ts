import crypto from "node:crypto";
import { HttpError } from "./errors";

/**
 * Supabase REST (PostgREST) client for the `users` table.
 *
 * The secret key bypasses Row Level Security, so this module is server-only and every caller
 * must do its own authorization. `users` denies inserts to the publishable key by policy, which
 * is why sign-in cannot go through the browser key.
 *
 * ponytail: hand-rolled fetch instead of @supabase/supabase-js — this is three REST calls and
 * the SDK is ~250KB. Swap it in if realtime, storage or auth are ever needed.
 */

const URL_BASE = process.env.SUPABASE_URL;
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Mirrors the public."UserRole" Postgres enum. */
export type UserRole = "TENANT" | "LANDLORD" | "REALTOR";

/** A row of public.users, as PostgREST returns it. */
export interface SupabaseUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

function config() {
  if (!URL_BASE || !SECRET) {
    throw new HttpError(503, "Database is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  }
  return { url: URL_BASE, secret: SECRET };
}

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, secret } = config();
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const body = await res.text();
  if (!res.ok) {
    // PostgREST returns {code, message, details, hint}; surface the message, keep the rest in logs.
    let message = body.slice(0, 200);
    try {
      message = (JSON.parse(body).message as string) || message;
    } catch {
      /* non-JSON error body — use the raw text */
    }
    console.error(`[supabase] ${init.method ?? "GET"} ${path} -> ${res.status}: ${body.slice(0, 300)}`);
    throw new HttpError(502, `Database error: ${message}`);
  }
  return (body ? JSON.parse(body) : null) as T;
}

const q = encodeURIComponent;

/** Live (not soft-deleted) user for an email, or null. */
export async function userByEmail(email: string): Promise<SupabaseUser | null> {
  const rows = await rest<SupabaseUser[]>(`users?email=eq.${q(email)}&deletedAt=is.null&limit=1`);
  return rows[0] ?? null;
}

/** Live (not soft-deleted) user by id, or null. */
export async function userById(id: string): Promise<SupabaseUser | null> {
  const rows = await rest<SupabaseUser[]>(`users?id=eq.${q(id)}&deletedAt=is.null&limit=1`);
  return rows[0] ?? null;
}

/**
 * Inserts a user. `id` and `updatedAt` are NOT NULL with no database default, so both are
 * supplied here rather than left to Postgres.
 */
export async function createUser(input: {
  email: string;
  name: string;
  role?: UserRole;
  passwordHash?: string;
}): Promise<SupabaseUser> {
  const now = new Date().toISOString();
  const rows = await rest<SupabaseUser[]>("users", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      email: input.email,
      name: input.name,
      role: input.role ?? "TENANT",
      passwordHash: input.passwordHash ?? null,
      createdAt: now,
      updatedAt: now,
    }),
  });
  if (!rows[0]) throw new HttpError(502, "Database error: insert returned no row");
  return rows[0];
}
