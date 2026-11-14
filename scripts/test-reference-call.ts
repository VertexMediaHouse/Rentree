/**
 * Dev-only: fire a real outbound reference call to your own phone through the production backend
 * path (startCall → ElevenLabs Twilio outbound), creating a real screening_checks row so the
 * post-call webhook can map answers back. Not wired into the app; delete when the landlord portal
 * triggers live applications itself.
 *
 *   npx tsx scripts/test-reference-call.ts <+E164 phone> [questionCount 7-10]
 *   npx tsx scripts/test-reference-call.ts status <checkId>
 *
 * Needs: DB migrated (npx prisma migrate dev), and .env with ELEVENLABS_API_KEY,
 * ELEVENLABS_PHONE_NUMBER_ID, ELEVENLABS_REFERENCE_AGENT_ID set.
 */
import "dotenv/config";
import { db } from "../server/lib/db";
import { startCall } from "../server/lib/elevenlabs";
import { REFERENCE_QUESTIONS, buildCallVars, selectQuestions } from "../server/lib/referenceQuestions";

async function status(checkId: string) {
  const c = await db.screeningCheck.findUnique({ where: { id: checkId } });
  if (!c) return console.error("No check with that id.");
  console.log(JSON.stringify({ status: c.status, attempts: c.attempts, questions: c.questions, answers: c.answers, firstViewedAt: c.firstViewedAt, purgedAt: c.purgedAt }, null, 2));
}

async function place(phone: string, count: number) {
  // Attach to any seeded application that has a REFERENCE opt-in, and point it at the tester's phone.
  const app = await db.application.findFirst({
    where: { optIns: { some: { step: "REFERENCE" } } },
    orderBy: { createdAt: "desc" },
  });
  if (!app) return console.error("No application with a REFERENCE opt-in. Run `npm run db:seed` first.");

  await db.screeningOptIn.update({
    where: { applicationId_step: { applicationId: app.id, step: "REFERENCE" } },
    data: { contactPhone: phone },
  });
  // Clear prior reference checks so the result view shows only this one.
  await db.screeningCheck.deleteMany({ where: { applicationId: app.id, step: "REFERENCE" } });

  const questions = selectQuestions(REFERENCE_QUESTIONS.slice(0, count).map((q) => q.id));
  const vars = buildCallVars(questions, app.tenantName);
  const check = await db.screeningCheck.create({
    data: { applicationId: app.id, step: "REFERENCE", status: "CALLING", questions: questions.map((q) => q.id) },
  });
  try {
    const conversationId = await startCall("reference", phone, vars);
    await db.screeningCheck.update({ where: { id: check.id }, data: { conversationId } });
    console.log(`Calling ${phone} — application=${app.id} check=${check.id} conversation=${conversationId}`);
    console.log("Dynamic variables sent:");
    console.log(vars);
    console.log(`\nAfter the call ends, the webhook fills in the answers. See them with:`);
    console.log(`  npx tsx scripts/test-reference-call.ts status ${check.id}`);
  } catch (e) {
    await db.screeningCheck.delete({ where: { id: check.id } });
    throw e;
  }
}

async function main() {
  const [a, b] = process.argv.slice(2);
  if (a === "status") {
    if (!b) return console.error("Usage: npx tsx scripts/test-reference-call.ts status <checkId>");
    return status(b);
  }
  if (!a || !a.startsWith("+")) {
    return console.error("Usage: npx tsx scripts/test-reference-call.ts <+E164 phone> [questionCount 7-10]");
  }
  const count = Math.min(10, Math.max(7, Number(b) || 8));
  await place(a, count);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
