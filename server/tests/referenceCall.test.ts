import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { REFERENCE_QUESTIONS, buildCallVars, selectQuestions } from "../lib/referenceQuestions";
import { mapAnswers } from "../lib/referenceTranscript";
import { getConversationToken, verifyWebhookSignature } from "../lib/elevenlabs";
import { checkSchema } from "../lib/schemas";

test("question bank is exactly 15 with counsel flags on orders 6, 8, 15", () => {
  assert.equal(REFERENCE_QUESTIONS.length, 15);
  const orders = REFERENCE_QUESTIONS.map((q) => q.order);
  assert.deepEqual(orders, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  const counsel = REFERENCE_QUESTIONS.filter((q) => q.counsel).map((q) => q.order).sort((a, b) => a - b);
  assert.deepEqual(counsel, [6, 8, 15]);
  assert.equal(new Set(REFERENCE_QUESTIONS.map((q) => q.id)).size, 15, "ids are unique");
});

test("selectQuestions reorders to bank order, dedupes, and rejects unknown ids", () => {
  const picked = selectQuestions(["rent_again", "tenancy_dates", "rent_again"]);
  assert.deepEqual(picked.map((q) => q.id), ["tenancy_dates", "rent_again"]);
  assert.throws(() => selectQuestions(["tenancy_dates", "nope"]), /Unknown reference question id/);
});

test("buildCallVars fills q1..qN, blanks the rest, sets count and first name", () => {
  const picked = selectQuestions(REFERENCE_QUESTIONS.slice(0, 7).map((q) => q.id));
  const vars = buildCallVars(picked, "Maya Thompson");
  assert.equal(vars.tenant_first_name, "Maya");
  assert.equal(vars.question_count, "7");
  assert.equal(vars.q1, picked[0].text);
  assert.equal(vars.q7, picked[6].text);
  assert.equal(vars.q8, "");
  assert.equal(vars.q10, "");
});

test("checkSchema enforces 7–10 questions for reference, none for interview", () => {
  const seven = REFERENCE_QUESTIONS.slice(0, 7).map((q) => q.id);
  assert.equal(checkSchema.safeParse({ type: "reference", questionIds: seven }).success, true);
  assert.equal(checkSchema.safeParse({ type: "reference", questionIds: seven.slice(0, 6) }).success, false);
  assert.equal(
    checkSchema.safeParse({ type: "reference", questionIds: REFERENCE_QUESTIONS.slice(0, 11).map((q) => q.id) }).success,
    false,
  );
  assert.equal(checkSchema.safeParse({ type: "interview" }).success, true);
});

test("verifyWebhookSignature accepts a correct HMAC and rejects a bad one", () => {
  const secret = "whsec_test";
  const body = Buffer.from(JSON.stringify({ data: { conversation_id: "abc" } }));
  const ts = "1730000000";
  const good = crypto.createHmac("sha256", secret).update(`${ts}.${body.toString("utf8")}`).digest("hex");
  assert.equal(verifyWebhookSignature(body, `t=${ts},v0=${good}`, secret), true);
  assert.equal(verifyWebhookSignature(body, `t=${ts},v0=${"0".repeat(good.length)}`, secret), false);
  assert.equal(verifyWebhookSignature(body, undefined, secret), false);
});

test("mapAnswers maps verbatim, and flags no-answer / declined / not-connected", () => {
  const qs = selectQuestions(["tenancy_dates", "rent_on_time", "money_owing"]);
  const transcript = [
    { role: "agent", message: "What were the start and end dates of the tenancy, or is it still ongoing?" },
    { role: "user", message: "About two years, 2022 to 2024." },
    { role: "agent", message: "Thank you." },
    { role: "agent", message: "Was rent usually paid on or before the due date?" },
    { role: "user", message: "I'd rather not answer that." },
    { role: "agent", message: "Thank you." },
    { role: "agent", message: "Is any rent or other money still owing from this tenancy?" },
    { role: "agent", message: "Thank you." },
  ];
  const { answers, connected, declinedCall } = mapAnswers(qs, transcript);
  assert.equal(connected, true);
  assert.equal(declinedCall, false);
  assert.deepEqual(
    answers.map((a) => [a.id, a.status]),
    [["tenancy_dates", "answered"], ["rent_on_time", "declined_to_answer"], ["money_owing", "no_answer"]],
  );
  assert.equal(answers[0].answer, "About two years, 2022 to 2024.");

  // Voicemail / nobody picked up: no user turns at all.
  const empty = mapAnswers(qs, [{ role: "agent", message: "What were the start and end dates of the tenancy, or is it still ongoing?" }]);
  assert.equal(empty.connected, false);
});

// The token endpoint is public, so an unconfigured agent id must never reach the provider.
test("getConversationToken rejects an agent id that is not configured", async () => {
  const saved = { ...process.env };
  process.env.ELEVENLABS_API_KEY = "test-key";
  process.env.ELEVENLABS_VOICE_AGENT_ID = "agent_allowed";
  delete process.env.ELEVENLABS_REFERENCE_AGENT_ID;
  delete process.env.ELEVENLABS_INTERVIEW_AGENT_ID;
  try {
    await assert.rejects(() => getConversationToken("agent_attacker"), /Unknown agent/);

    // No agent configured at all: 503, still without calling out.
    delete process.env.ELEVENLABS_VOICE_AGENT_ID;
    await assert.rejects(() => getConversationToken(), /no agent id set/);
  } finally {
    process.env = saved;
  }
});

test("verifyWebhookSignature survives a padded base64 signature", () => {
  const secret = "s3cret";
  const body = Buffer.from('{"ok":true}');
  const ts = "1730000000";
  const hex = crypto.createHmac("sha256", secret).update(`${ts}.${body.toString("utf8")}`).digest("hex");
  // Correct hex still verifies after the first-"=" split change.
  assert.equal(verifyWebhookSignature(body, `t=${ts},v0=${hex}`, secret), true);
  // A value containing "=" is not truncated into a false match.
  assert.equal(verifyWebhookSignature(body, `t=${ts},v0=YWJj==`, secret), false);
});

// ── Custom questions ──
// The security property: a custom question only reaches the agent when the route passed it in as
// approved. An unapproved id is indistinguishable from a bogus one, so it throws.
test("selectQuestions takes approved customs after the bank and rejects unapproved ids", () => {
  const bankIds = REFERENCE_QUESTIONS.slice(0, 7).map((q) => q.id);
  const approved = [
    { id: "11111111-1111-1111-1111-111111111111", text: "Was the parking spot used only by the tenant?" },
    { id: "22222222-2222-2222-2222-222222222222", text: "Did the tenant maintain the yard as agreed?" },
  ];

  // Customs play after the whole bank, in pick order, even when listed first.
  const picked = selectQuestions([approved[1].id, ...bankIds, approved[0].id], approved);
  assert.deepEqual(picked.slice(0, 7).map((q) => q.id), bankIds);
  assert.deepEqual(picked.slice(7).map((q) => q.id), [approved[1].id, approved[0].id]);
  assert.equal(picked.length, 9);
  assert.equal(picked[7].counsel, true, "customs are flagged for legal intake");

  // Not passed in as approved → not found → throws, so an unapproved question can never be called.
  assert.throws(() => selectQuestions([...bankIds, approved[0].id]), /Unknown reference question id/);
  assert.throws(() => selectQuestions([...bankIds, approved[0].id], [approved[1]]), /Unknown reference question id/);

  // Its text still reaches the agent as a qN variable.
  const vars = buildCallVars(picked, "Maya Thompson");
  assert.equal(vars.question_count, "9");
  assert.equal(vars.q8, approved[1].text);
  assert.equal(vars.q9, approved[0].text);
  assert.equal(vars.q10, "");
});

// The no-DB memory fallback must enforce the SAME gate as the database query, or the UI could be
// exercised against a store that happily resolves an unapproved question.
test("memory fallback resolves only approved questions owned by the caller", async () => {
  const { mem, memApprovedCustomQuestions, memCreateCustomQuestion, memCustomQuestionByToken, memDecideCustomQuestion } =
    await import("../lib/memoryStore");
  mem.customQuestions.length = 0;

  const mine = memCreateCustomQuestion("owner-1", "Was the parking spot used only by the tenant?", "tok-1");
  const theirs = memCreateCustomQuestion("owner-2", "Did the tenant maintain the yard?", "tok-2");
  const ids = [mine.id, theirs.id];

  // Pending: nothing resolves, so a question cannot be called before review.
  assert.deepEqual(memApprovedCustomQuestions(ids, "owner-1"), []);

  memDecideCustomQuestion(mine.id, true);
  memDecideCustomQuestion(theirs.id, true);
  assert.deepEqual(memApprovedCustomQuestions(ids, "owner-1").map((q) => q.id), [mine.id], "no cross-owner leak");

  // Rejected stays unusable.
  const rejected = memCreateCustomQuestion("owner-1", "Something the reviewer refused outright?", "tok-3");
  memDecideCustomQuestion(rejected.id, false);
  assert.deepEqual(memApprovedCustomQuestions([rejected.id], "owner-1"), []);

  // First decision wins: a second click on the emailed link cannot flip a rejection into approval.
  memDecideCustomQuestion(rejected.id, true);
  assert.equal(memCustomQuestionByToken("tok-3")!.approved, false);
  assert.equal(memCustomQuestionByToken("nope"), null);
});
