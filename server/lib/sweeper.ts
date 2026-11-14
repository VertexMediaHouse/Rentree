import { Prisma } from "@prisma/client";
import { db } from "./db";
import { deleteConversation, startCall } from "./elevenlabs";
import { buildCallVars, selectQuestions } from "./referenceQuestions";

// Retry/purge policy for reference calls. Two retries spaced so all three attempts land inside 48h.
export const MAX_ATTEMPTS = 2;
export const RETRY_DELAY_MS = 20 * 60 * 60_000; // 20h between attempts → 3 tries within 48h
export const PURGE_AFTER_MS = 48 * 60 * 60_000; // delete our copy 48h after the landlord first views
const SWEEP_INTERVAL_MS = 15 * 60_000;

// ponytail: in-process timer, assumes ONE app process. Move to an external cron / queue hitting a
// protected endpoint if the API is ever run multi-process or serverless.

/** Re-place reference calls whose retry is due. */
async function sweepRetries() {
  const due = await db.screeningCheck.findMany({
    where: { step: "REFERENCE", status: "CALLING", nextRetryAt: { lte: new Date() } },
    include: { application: { include: { optIns: true } } },
  });
  for (const c of due) {
    const consent = c.application.optIns.find((o) => o.step === "REFERENCE");
    if (!consent?.contactPhone) {
      await db.screeningCheck.update({ where: { id: c.id }, data: { status: "FAILED", nextRetryAt: null } });
      continue;
    }
    try {
      const vars = buildCallVars(selectQuestions(c.questions), c.application.tenantName);
      const conversationId = await startCall("reference", consent.contactPhone, vars);
      await db.screeningCheck.update({ where: { id: c.id }, data: { conversationId, nextRetryAt: null } });
    } catch (err) {
      // Provider hiccup: try again next tick without consuming an attempt.
      console.warn("Reference retry could not be placed", c.id, (err as Error).message);
      await db.screeningCheck.update({ where: { id: c.id }, data: { nextRetryAt: new Date(Date.now() + RETRY_DELAY_MS) } });
    }
  }
}

/** Purge our copy and the ElevenLabs conversation 48h after the landlord first viewed results. */
async function sweepPurges() {
  const cutoff = new Date(Date.now() - PURGE_AFTER_MS);
  const due = await db.screeningCheck.findMany({
    where: { firstViewedAt: { lte: cutoff }, purgedAt: null },
  });
  for (const c of due) {
    if (c.conversationId) {
      try {
        await deleteConversation(c.conversationId);
      } catch (err) {
        // Leave purgedAt null so the next tick retries the vendor delete; don't wipe our copy yet.
        console.warn("ElevenLabs delete failed, will retry", c.conversationId, (err as Error).message);
        continue;
      }
    }
    await db.screeningCheck.update({
      where: { id: c.id },
      // DbNull writes SQL NULL; `undefined` would be a no-op and leave the data in place.
      data: { answers: Prisma.DbNull, transcript: Prisma.DbNull, summary: null, purgedAt: new Date() },
    });
  }
}

let running = false;
async function sweep() {
  if (running) return; // don't let a slow tick overlap the next
  running = true;
  try {
    await sweepRetries();
    await sweepPurges();
  } catch (err) {
    console.error("Sweep failed", (err as Error).message);
  } finally {
    running = false;
  }
}

// Guard against tsx-watch reloads stacking intervals (same trick db.ts uses for the Prisma client).
const g = globalThis as unknown as { __rentreSweeper?: NodeJS.Timeout };

export function startSweeper() {
  if (g.__rentreSweeper) return;
  g.__rentreSweeper = setInterval(sweep, SWEEP_INTERVAL_MS);
  if (typeof g.__rentreSweeper.unref === "function") g.__rentreSweeper.unref();
}
