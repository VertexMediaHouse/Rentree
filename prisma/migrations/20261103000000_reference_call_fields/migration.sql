-- Reference-call question-bank flow: fields the init migration predates.
-- Safe to re-run against a database that already has some of this (IF NOT EXISTS / IF NOT EXISTS enum labels).

-- New ScreeningCheckStatus outcomes. COMPLETED replaces DONE for reference checks;
-- DECLINED = the reference refused the call; UNREACHABLE = no answer after two retries.
ALTER TYPE "ScreeningCheckStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';
ALTER TYPE "ScreeningCheckStatus" ADD VALUE IF NOT EXISTS 'UNREACHABLE';
ALTER TYPE "ScreeningCheckStatus" ADD VALUE IF NOT EXISTS 'DECLINED';

-- Reference-call columns read/written by routes/elevenlabsWebhook.ts and lib/sweeper.ts.
-- questions: selected question ids, snapshotted in bank order at trigger time.
ALTER TABLE "screening_checks" ADD COLUMN IF NOT EXISTS "questions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
-- answers: [{ id, text, answer, status }], status ∈ answered|no_answer|declined_to_answer.
ALTER TABLE "screening_checks" ADD COLUMN IF NOT EXISTS "answers" JSONB;
-- Outbound-call retry bookkeeping (no answer / voicemail → up to two retries within 48h).
ALTER TABLE "screening_checks" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "screening_checks" ADD COLUMN IF NOT EXISTS "nextRetryAt" TIMESTAMPTZ(6);
-- firstViewedAt starts the 48h deletion clock; purgedAt is set once both copies are deleted.
ALTER TABLE "screening_checks" ADD COLUMN IF NOT EXISTS "firstViewedAt" TIMESTAMPTZ(6);
ALTER TABLE "screening_checks" ADD COLUMN IF NOT EXISTS "purgedAt" TIMESTAMPTZ(6);

-- The retry sweeper scans by (status, nextRetryAt); the purge sweeper by (firstViewedAt, purgedAt).
CREATE INDEX IF NOT EXISTS "screening_checks_nextRetryAt_idx" ON "screening_checks"("nextRetryAt");
CREATE INDEX IF NOT EXISTS "screening_checks_firstViewedAt_purgedAt_idx" ON "screening_checks"("firstViewedAt", "purgedAt");
