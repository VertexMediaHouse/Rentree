import { Router, raw } from "express";
import { db } from "../lib/db";
import { verifyWebhookSignature } from "../lib/elevenlabs";
import { REFERENCE_QUESTIONS } from "../lib/referenceQuestions";
import { mapAnswers, type TranscriptTurn } from "../lib/referenceTranscript";
import { MAX_ATTEMPTS, RETRY_DELAY_MS } from "../lib/sweeper";
import { memCustomQuestionsByIds, orMemory } from "../lib/memoryStore";

// First webhook in the codebase. Signature verification needs the exact bytes, so this router is
// mounted with express.raw() BEFORE the global express.json() in app.ts — req.body is a Buffer here.
const router = Router();

const BY_ID = new Map(REFERENCE_QUESTIONS.map((q) => [q.id, q]));

router.post("/", raw({ type: "*/*", limit: "2mb" }), async (req, res) => {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ success: false, error: "Webhook not configured" });

  const rawBody: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
  if (!verifyWebhookSignature(rawBody, req.header("ElevenLabs-Signature"), secret)) {
    return res.status(401).json({ success: false, error: "Bad signature" });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ success: false, error: "Malformed JSON" });
  }

  const data = payload?.data ?? payload ?? {};
  const conversationId: string | undefined = data.conversation_id ?? data.conversationId;
  if (!conversationId) return res.status(400).json({ success: false, error: "Missing conversation id" });

  const check = await db.screeningCheck.findFirst({ where: { conversationId, step: "REFERENCE" } });
  // Ack unknown/already-resolved conversations with 200 so ElevenLabs stops retrying.
  if (!check || check.status !== "CALLING") return res.json({ success: true });

  const transcript: TranscriptTurn[] = Array.isArray(data.transcript) ? data.transcript : [];
  // Ids outside the fixed bank are approved custom questions; look their text up or their answer
  // would be silently dropped from the results.
  const customIds = check.questions.filter((id) => !BY_ID.has(id));
  const customById = new Map(
    customIds.length
      ? (
          await orMemory(
            () => db.customQuestion.findMany({ where: { id: { in: customIds } }, select: { id: true, text: true } }),
            () => memCustomQuestionsByIds(customIds),
          )
        ).map((c) => [c.id, c] as const)
      : [],
  );
  const questions = check.questions
    .map((id) => BY_ID.get(id) ?? customById.get(id))
    .filter(Boolean) as { id: string; text: string }[];
  const { answers, connected, declinedCall } = mapAnswers(questions, transcript);

  // Not connected = no answer / voicemail: retry up to MAX_ATTEMPTS within 48h, then unreachable.
  if (!connected) {
    if (check.attempts < MAX_ATTEMPTS) {
      await db.screeningCheck.update({
        where: { id: check.id },
        data: { attempts: { increment: 1 }, nextRetryAt: new Date(Date.now() + RETRY_DELAY_MS) },
      });
    } else {
      await db.screeningCheck.update({ where: { id: check.id }, data: { status: "UNREACHABLE", nextRetryAt: null } });
    }
    return res.json({ success: true });
  }

  await db.screeningCheck.update({
    where: { id: check.id },
    data: {
      status: declinedCall ? "DECLINED" : "COMPLETED",
      // Plain object literals so Prisma accepts them as JSON (same shape the mapper produced).
      answers: answers.map((a) => ({ id: a.id, text: a.text, answer: a.answer, status: a.status })),
      // Keep the raw turns for the record; no summary/score/sentiment is stored.
      transcript: transcript.filter((t) => t.message).map((t) => ({ role: t.role, message: t.message })),
      nextRetryAt: null,
    },
  });
  res.json({ success: true });
});

export default router;
