import { useEffect, useRef, useState } from "react"
import { PhoneCall, Check, Loader2, PhoneOff, ShieldAlert, Mic, HelpCircle } from "lucide-react"
import {
  createCustomQuestion,
  fetchCustomQuestions,
  fetchReferenceQuestions,
  fetchScreeningChecks,
  requestScreeningCheck,
  type CustomQuestion,
  type ReferenceQuestion,
} from "../services/api"

// Price shown in the confirmation gate. No real payment is captured (the app has no billing yet);
// confirming records the landlord's acknowledgement before the paid call is placed.
const CALL_PRICE = "$50"
const MIN = 7
const MAX = 10

type Answer = { id: string; text: string; answer: string; status: "answered" | "no_answer" | "declined_to_answer" }
type Check = {
  id: string
  type: string
  status: "calling" | "completed" | "unreachable" | "declined" | "failed" | "done"
  questions?: string[]
  answers?: Answer[]
  purged?: boolean
}

const ANSWER_LABEL: Record<Answer["status"], string> = {
  answered: "",
  no_answer: "No answer given",
  declined_to_answer: "Declined to answer",
}

/**
 * The landlord picks 7–10 questions from the bank (plus any approved custom ones) and places an
 * outbound phone call to the applicant's reference.
 */
export function ReferenceCallPanel({ applicationId }: { applicationId: string }) {
  const [bank, setBank] = useState<ReferenceQuestion[]>([])
  const [custom, setCustom] = useState<CustomQuestion[]>([])
  const [draft, setDraft] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState("")
  const [check, setCheck] = useState<Check | null>(null)
  const [placing, setPlacing] = useState(false)
  const poll = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    fetchReferenceQuestions()
      .then((r) => setBank(r.data))
      .catch((e) => setError(e.message || "Could not load questions"))
    fetchCustomQuestions()
      .then((r) => setCustom(r.data))
      .catch(() => {})
  }, [])

  // A custom question needs a reviewer's approval by email before it can be selected.
  const addCustom = async () => {
    const text = draft.trim()
    if (text.length < 10) return setError("A custom question needs at least 10 characters")
    setSubmitting(true)
    setError("")
    try {
      const r = await createCustomQuestion(text)
      setCustom((cur) => [...cur, r.data])
      setDraft("")
    } catch (e: any) {
      setError(e.details?.[0]?.message || e.message || "Could not submit the question")
    } finally {
      setSubmitting(false)
    }
  }

  // Load any existing reference check, and poll while a call is in progress (webhook-driven result).
  const refresh = () =>
    fetchScreeningChecks(applicationId)
      .then((r: { data: Check[] }) => setCheck(r.data.find((c) => c.type === "reference") ?? null))
      .catch(() => {})

  useEffect(() => {
    refresh()
    return () => clearInterval(poll.current)
  }, [applicationId])

  useEffect(() => {
    clearInterval(poll.current)
    if (check?.status === "calling") poll.current = setInterval(refresh, 10_000)
    return () => clearInterval(poll.current)
  }, [check?.status])

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX ? cur : [...cur, id]))

  const place = async () => {
    setPlacing(true)
    setError("")
    try {
      const r = await requestScreeningCheck(applicationId, "reference", selected)
      setCheck((r as { data: Check }).data)
      setConfirming(false)
    } catch (e: any) {
      setError(e.details?.[0]?.message || e.message || "Could not place the call")
    } finally {
      setPlacing(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* The reference, not the landlord, is the one being screened — so this panel only places
          outbound calls. Live in-browser voice verification belongs to the tenant's passport flow. */}
      <div className="flex items-center justify-between border-b border-border/80 pb-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <PhoneCall size={13} className="text-primary" />
          Outbound Phone Screen
        </span>
        <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
          <Mic size={11} className="text-primary" />
          ElevenLabs ConvAI Enabled
        </span>
      </div>

      {/* ── Results view ── */}
          {check && check.status !== "failed" ? (
            <div className="px-1">
              <div className="mb-3 flex items-center gap-2">
                {check.status === "calling" && (
                  <>
                    <Loader2 size={15} className="animate-spin text-primary" />
                    <span className="text-sm font-semibold text-foreground">
                      Call in progress — results appear here automatically.
                    </span>
                  </>
                )}
                {check.status === "completed" && (
                  <>
                    <Check size={15} className="text-primary" />
                    <span className="text-sm font-semibold text-foreground">Reference call complete</span>
                  </>
                )}
                {check.status === "unreachable" && (
                  <>
                    <PhoneOff size={15} className="text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">Reference was unreachable after retries.</span>
                  </>
                )}
                {check.status === "declined" && (
                  <>
                    <ShieldAlert size={15} className="text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">The reference declined the call.</span>
                  </>
                )}
              </div>
              {check.purged && (
                <p className="mb-3 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                  These results were deleted 48 hours after you first viewed them, per Rentre's retention policy.
                </p>
              )}
              {!check.purged && check.status === "completed" && (
                <ol className="flex flex-col gap-2.5">
                  {(check.answers?.length
                    ? check.answers
                    : (check.questions ?? []).map((id) => {
                        const byId = new Map([...bank, ...custom].map((q) => [q.id, q.text]))
                        return { id, text: byId.get(id) ?? id, answer: "", status: "no_answer" as const }
                      })
                  ).map((a, i) => (
                    <li key={a.id} className="rounded-xl border border-border bg-card px-4 py-3">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {i + 1}. {a.text}
                      </p>
                      {a.status === "answered" ? (
                        <p className="mt-1 text-sm leading-relaxed text-foreground">{a.answer}</p>
                      ) : (
                        <p className="mt-1 text-sm italic text-muted-foreground">{ANSWER_LABEL[a.status]}</p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ) : (
            /* ── Selection view ── */
            <div className="px-1">
              {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Choose {MIN}–{MAX} questions · they play in this order
              </p>
              <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
                {bank.map((q) => {
                  const on = selected.includes(q.id)
                  const atMax = !on && selected.length >= MAX
                  return (
                    <button
                      key={q.id}
                      type="button"
                      disabled={atMax}
                      onClick={() => toggle(q.id)}
                      className={`flex items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-all ${
                        on
                          ? "border border-primary/25 bg-primary/8"
                          : atMax
                          ? "cursor-not-allowed border border-border opacity-50"
                          : "border border-border bg-card hover:border-primary/25"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border ${
                          on ? "border-primary bg-primary text-primary-foreground" : "border-border"
                        }`}
                      >
                        {on && <Check size={11} />}
                      </span>
                      <span className="text-xs leading-snug text-foreground">{q.text}</span>
                    </button>
                  )
                })}
              </div>

              {/* ── Custom questions: selectable only once a reviewer approves by email ── */}
              <div className="mt-3 rounded-xl border border-border bg-card p-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Your own questions
                </p>
                {custom.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {custom.map((q) => {
                      const on = selected.includes(q.id)
                      const usable = q.status === "approved"
                      const atMax = !on && selected.length >= MAX
                      return (
                        <li key={q.id}>
                          <button
                            type="button"
                            disabled={!usable || atMax}
                            onClick={() => toggle(q.id)}
                            title={usable ? undefined : q.status === "pending" ? "Awaiting approval" : "Rejected by review"}
                            className={`flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-all ${
                              on
                                ? "border border-primary/25 bg-primary/8"
                                : usable && !atMax
                                ? "border border-border bg-card hover:border-primary/25"
                                : "cursor-not-allowed border border-border opacity-55"
                            }`}
                          >
                            <span
                              className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border ${
                                on ? "border-primary bg-primary text-primary-foreground" : "border-border"
                              }`}
                            >
                              {on && <Check size={11} />}
                            </span>
                            <span className="flex-1 text-xs leading-snug text-foreground">{q.text}</span>
                            <span
                              className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase ${
                                q.status === "approved"
                                  ? "bg-primary/12 text-primary"
                                  : q.status === "pending"
                                  ? "bg-secondary text-muted-foreground"
                                  : "bg-red-50 text-red-600"
                              }`}
                            >
                              {q.status}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
                <div className="mt-2 flex items-start gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    maxLength={300}
                    placeholder="Ask something a reference witnessed, e.g. “Was the parking spot used only by the tenant?”"
                    className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs leading-snug text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={submitting || draft.trim().length < 10}
                    onClick={addCustom}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:opacity-40"
                  >
                    {submitting ? <Loader2 size={13} className="animate-spin" /> : "Submit"}
                  </button>
                </div>
                <p className="mt-1.5 flex items-start gap-1 text-[10px] leading-snug text-muted-foreground">
                  <HelpCircle size={11} className="mt-0.5 shrink-0" />
                  Sent for review by email. You can select it in a call only after it is approved.
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className={`text-xs ${selected.length >= MIN && selected.length <= MAX ? "text-primary" : "text-muted-foreground"}`}>
                  {selected.length} of {MIN}–{MAX} selected
                </span>
                <button
                  type="button"
                  disabled={selected.length < MIN || selected.length > MAX}
                  onClick={() => setConfirming(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40"
                >
                  <PhoneCall size={13} />
                  Place reference call — {CALL_PRICE}
                </button>
              </div>

              {confirming && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4"
                  onClick={() => !placing && setConfirming(false)}
                >
                  <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-lg font-semibold text-foreground">Place this reference call?</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      This will charge <strong className="text-foreground">{CALL_PRICE}</strong> to your account and start a call with
                      the applicant's reference, asking your {selected.length} selected questions.
                    </p>
                    {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
                    <div className="mt-5 flex gap-2">
                      <button
                        type="button"
                        disabled={placing}
                        onClick={() => setConfirming(false)}
                        className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-40"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={placing}
                        onClick={place}
                        className="flex flex-[1.4] items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                      >
                        {placing ? <Loader2 size={15} className="animate-spin" /> : <PhoneCall size={15} />}
                        Confirm &amp; call
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
    </div>
  )
}
