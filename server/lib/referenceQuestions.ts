// Fixed reference-call question bank. Single source of truth: the server owns the 15 questions,
// the client fetches them via GET /api/applications/reference-questions. The landlord picks 7–10;
// selected questions always play in this bank order.
//
// The 15-question bank from the Rentre AI Reference Call Workflow (11_Labs spec, Oct 30 2026). Each
// asks for a fact the reference witnessed. NEVER add a question touching children or household size,
// age, source of income / public assistance, health or disability, pets (service animals are a
// disability issue), relationship status, religion or origin, or any open "anything else?" question.
// counsel=true = flagged for legal intake (Q6 notices can relate to rights disputes; Q8 complaints
// can proxy disability/family status; Q15 is the one evaluative question).

export interface ReferenceQuestion {
  id: string;
  text: string;
  order: number;
  counsel: boolean;
}

export const REFERENCE_QUESTIONS: ReferenceQuestion[] = [
  // Tenancy facts
  { id: "tenancy_dates", text: "What were the start and end dates of the tenancy, or is it still ongoing?", order: 1, counsel: false },
  { id: "monthly_rent", text: "What was the monthly rent at the end of the tenancy?", order: 2, counsel: false },
  // Payment
  { id: "rent_on_time", text: "Was rent usually paid on or before the due date?", order: 3, counsel: false },
  { id: "money_owing", text: "Is any rent or other money still owing from this tenancy?", order: 4, counsel: false },
  { id: "utilities_current", text: "Were the utilities the tenant was responsible for kept paid and current?", order: 5, counsel: false },
  // Conduct during the tenancy
  { id: "notice_served", text: "Did you serve any formal notice to end the tenancy, for non-payment or any other reason?", order: 6, counsel: true },
  { id: "entry_access", text: "When you gave proper notice to enter, did the tenant allow access?", order: 7, counsel: false },
  { id: "written_complaints", text: "Did you receive any written complaints about the tenant from neighbours or building management?", order: 8, counsel: true },
  { id: "rules_followed", text: "To your knowledge, did the tenant follow the building or condo rules?", order: 9, counsel: false },
  { id: "sublet_without_consent", text: "Did the tenant sublet or assign the unit without your consent?", order: 10, counsel: false },
  { id: "insurance_maintained", text: "If the lease required tenant insurance, did the tenant keep it in place?", order: 11, counsel: false },
  // Move-out
  { id: "proper_moveout_notice", text: "Did the tenant give proper written notice before moving out?", order: 12, counsel: false },
  { id: "damage_beyond_wear", text: "Was there any damage beyond normal wear and tear when the tenancy ended?", order: 13, counsel: false },
  { id: "keys_returned", text: "Were all keys and fobs returned?", order: 14, counsel: false },
  // Overall
  { id: "rent_again", text: "Would you rent to this tenant again?", order: 15, counsel: true },
];

const BY_ID = new Map(REFERENCE_QUESTIONS.map((q) => [q.id, q]));

/**
 * Validate picked ids and return the matching questions in bank order. Throws on unknown ids.
 *
 * `custom` holds approved CustomQuestion rows the caller already verified (owned by this landlord
 * AND approved) — the lib never trusts an id it cannot find. Customs play after the whole bank, in
 * the order the landlord picked them, so the vetted script runs first.
 */
export function selectQuestions(ids: string[], custom: { id: string; text: string }[] = []): ReferenceQuestion[] {
  const customById = new Map(custom.map((c) => [c.id, c]));
  const unique = [...new Set(ids)];
  let customSeen = 0;
  const picked = unique.map((id) => {
    const q = BY_ID.get(id);
    if (q) return q;
    const c = customById.get(id);
    if (!c) throw new Error(`Unknown reference question id: ${id}`);
    return { id: c.id, text: c.text, order: 100 + customSeen++, counsel: true };
  });
  return picked.sort((a, b) => a.order - b.order);
}

/**
 * Dynamic variables for the ElevenLabs agent. The agent reads q1…q{question_count} verbatim;
 * unused slots (up to q10) are empty strings. Opener/closer and the callback number live in the
 * agent config, not here.
 */
export function buildCallVars(questions: ReferenceQuestion[], tenantName: string): Record<string, string> {
  const vars: Record<string, string> = {
    tenant_first_name: (tenantName.trim().split(/\s+/)[0] || "the applicant"),
    question_count: String(questions.length),
  };
  for (let i = 0; i < 10; i++) vars[`q${i + 1}`] = questions[i]?.text ?? "";
  return vars;
}
