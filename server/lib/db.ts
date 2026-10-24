import { PrismaClient } from "@prisma/client";

// Single client for the process. `tsx watch` re-imports modules on every change, so without
// the global the dev server would leak a connection pool per reload until Postgres refused more.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["warn", "error"] : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/** Listings and documents are soft-deleted; every read path must exclude them. */
export const notDeleted = { deletedAt: null } as const;

/**
 * True when the failure is "there is no usable database", not "that query was wrong".
 *
 * Connection problems reach us in two different shapes: query-time errors carry a P1xxx `code`,
 * while a failure to connect at all throws PrismaClientInitializationError, whose `code` is
 * undefined and whose only signal is the class name and message. Checking just `code` silently
 * misses the second kind — which is the common one when DATABASE_URL is wrong.
 */
export function isDbUnavailable(err: unknown): boolean {
  const e = err as { name?: string; code?: string; message?: string };
  if (e?.name === "PrismaClientInitializationError") return true;
  if (e?.code && ["P1000", "P1001", "P1002", "P1003", "P1010", "P1017", "P2021", "P2022"].includes(e.code)) return true;
  return /authentication failed|can't reach database|does not exist on the database|environment variable not found|connection (refused|timed out)/i.test(
    e?.message ?? ""
  );
}

export const daysSince = (at: Date) => Math.max(0, Math.floor((Date.now() - at.getTime()) / 86_400_000));
