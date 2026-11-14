// Map a reference-call transcript onto the questions that were asked. No LLM, no summary/score —
// the spec stores each answer verbatim under its question and nothing else.
//
// ponytail: naive turn-pairing heuristic — the agent reads each question verbatim and says
// "Thank you." after each, so we anchor on the agent turn that matches a question and collect the
// user turns before the next one. Upgrade to the agent's structured data collection if pairing drifts.

export type AnswerStatus = "answered" | "no_answer" | "declined_to_answer";

export interface MappedAnswer {
  id: string;
  text: string;
  answer: string;
  status: AnswerStatus;
}

export interface TranscriptTurn {
  role: string;
  message: string | null;
}

const REFUSAL = /\b(decline|declined|rather not|prefer not|no comment|won'?t answer|not comfortable|pass on that)\b/i;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, "").replace(/\s+/g, " ").trim();

/** True when the two strings share enough normalized content to be the same question. */
function matchesQuestion(agentMsg: string, questionText: string): boolean {
  const a = norm(agentMsg);
  const q = norm(questionText);
  if (!a || !q) return false;
  return a.includes(q) || q.includes(a);
}

export interface MapResult {
  answers: MappedAnswer[];
  connected: boolean; // the reference spoke at least once
  declinedCall: boolean; // the reference refused up front, before answering anything
}

export function mapAnswers(questions: { id: string; text: string }[], transcript: TranscriptTurn[]): MapResult {
  const turns = transcript.filter((t) => typeof t.message === "string" && t.message!.trim().length > 0) as {
    role: string;
    message: string;
  }[];
  const connected = turns.some((t) => t.role !== "agent");

  // Index of the agent turn that asks each question, in transcript order.
  const anchors = questions.map((q) => {
    const idx = turns.findIndex((t, i) => t.role === "agent" && matchesQuestion(t.message, q.text) && i >= 0);
    return { q, idx };
  });

  const answers: MappedAnswer[] = anchors.map(({ q, idx }, k) => {
    if (idx === -1) return { id: q.id, text: q.text, answer: "", status: "no_answer" as AnswerStatus };
    // User turns between this question's anchor and the next question's anchor.
    const nextIdx = anchors.slice(k + 1).map((a) => a.idx).filter((i) => i > idx).sort((a, b) => a - b)[0] ?? turns.length;
    const reply = turns
      .slice(idx + 1, nextIdx)
      .filter((t) => t.role !== "agent")
      .map((t) => t.message.trim())
      .join(" ")
      .trim();
    if (!reply) return { id: q.id, text: q.text, answer: "", status: "no_answer" };
    if (REFUSAL.test(reply)) return { id: q.id, text: q.text, answer: reply, status: "declined_to_answer" };
    return { id: q.id, text: q.text, answer: reply, status: "answered" };
  });

  const firstUser = turns.find((t) => t.role !== "agent");
  const declinedCall =
    connected && !!firstUser && REFUSAL.test(firstUser.message) && answers.every((a) => a.status !== "answered");

  return { answers, connected, declinedCall };
}
