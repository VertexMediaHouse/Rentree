import { useMemo, useState } from "react"
import { CheckCircle, Lock, Mail, Printer, RotateCcw, X } from "lucide-react"
import { BODY, DISPLAY, MONO } from "./fonts"
import { missingRequired, money, NOT_SHARED, passportId, PROFILE_KEYS, readField, REQUIRED_KEYS, writeField, type PassportData } from "./passportFields"
import { sharePassport } from "../services/api"
import type { UserProfile } from "./App"

// A renter profile is a passport; if a field ever stops lining up, this fails the build.
const _profileIsPassport: PassportData = {} as UserProfile

/**
 * The renter passport, as one document.
 *
 * The same markup serves the renter (editable) and the landlord (read-only), and the same schema
 * drives both the overview and the full view — so a field added below shows up everywhere at once.
 *
 * Required fields are exactly the ones the sign-in form collects; everything else is optional and
 * reads "Not shared" until the renter fills it in.
 */

// ─── Schema ───────────────────────────────────────────────────────────────────

type FieldType = "text" | "number" | "date" | "check"
interface Field { key: string; label: string; required?: true; type?: FieldType; wide?: true; placeholder?: string }
interface Section { no: string; title: string; sub: string; fields: Field[]; overview?: true; /** Spans both document columns. */ wide?: true }

const SECTIONS: Section[] = [
  {
    no: "01", title: "The Search", sub: "Preferred area, unit and timing.", overview: true,
    fields: [
      { key: "neighbourhoods", label: "Neighbourhoods", required: true, wide: true, placeholder: "King West, Liberty Village" },
      { key: "unitType", label: "Unit type", placeholder: "1 bedroom" },
      { key: "moveIn", label: "Move in", type: "date" },
      { key: "budgetMax", label: "Max budget", required: true, type: "number", placeholder: "2600" },
      { key: "leaseTerm", label: "Lease term", placeholder: "12 months" },
    ],
  },
  {
    no: "02", title: "Household", sub: "Occupants, pets, vehicle and coverage.", overview: true,
    fields: [
      // Labels only — the keys stay as they are, or stored passports lose these fields.
      { key: "occupants", label: "Roommate", type: "number" },
      { key: "roommates", label: "Roommate ID", type: "number" },
      { key: "pets", label: "Pets", type: "number" },
      { key: "smoking", label: "Smoking", placeholder: "No" },
      { key: "insurance", label: "Insurance", placeholder: "Will obtain" },
      { key: "vehicle", label: "Vehicle", placeholder: "2021 Honda Civic" },
      { key: "hasGuarantor", label: "Guarantor", placeholder: "None" },
      { key: "emergencyName", label: "Emergency contact name" },
      { key: "emergencyPhone", label: "Emergency contact number" },
    ],
  },
  {
    no: "03", title: "Income & Work", sub: "Employment, earnings and credit.",
    fields: [
      { key: "employer", label: "Employer", wide: true },
      { key: "income", label: "Annual income", type: "number", placeholder: "92000" },
      { key: "employment", label: "Employment", placeholder: "Full-time / Permanent" },
      { key: "jobTitle", label: "Job title" },
      { key: "workAddress", label: "Work address", wide: true },
      { key: "timeAtAddress", label: "Tenure", placeholder: "2 yrs 4 mos" },
      { key: "creditScore", label: "Credit score", type: "number", placeholder: "742" },
      { key: "creditReportDate", label: "Report date", type: "date" },
      { key: "obligations", label: "Obligations", wide: true, placeholder: "Car loan" },
    ],
  },
  {
    no: "04", title: "Rental History", sub: "Past addresses and landlords.",
    fields: [
      { key: "currentAddress", label: "Current address" },
      { key: "currentLandlord", label: "Landlord" },
      { key: "livedSince", label: "From", type: "date" },
      { key: "monthlyRent", label: "Monthly rent", type: "number", placeholder: "2150" },
      { key: "reasonForMoving", label: "Reason for moving", wide: true },
      { key: "previousAddress", label: "Previous address" },
      { key: "previousLandlord", label: "Previous landlord" },
      { key: "evictions", label: "Evictions / LTB", placeholder: "None" },
      { key: "bankruptcy", label: "Bankruptcy", placeholder: "None" },
    ],
  },
  {
    no: "05", title: "Guarantor", sub: "Lease guarantor details and finances.", wide: true,
    fields: [
      { key: "gName", label: "Name", wide: true },
      { key: "gEmail", label: "Email" },
      { key: "gPhone", label: "Phone" },
      { key: "gAddress", label: "Address" },
      { key: "gInOntario", label: "Lives in Ontario", placeholder: "Yes" },
      { key: "gEmployer", label: "Employer name" },
      { key: "gIncome", label: "Annual income", type: "number" },
      { key: "gCredit", label: "Credit score", type: "number" },
    ],
  },
  {
    no: "06", title: "Authorizations", sub: "Permissions signed by the renter.",
    fields: [
      { key: "consentCredit", label: "Credit check", type: "check" },
      { key: "consentReferences", label: "References", type: "check" },
      { key: "consentGuarantor", label: "Guarantor data", type: "check" },
    ],
  },
  {
    no: "07", title: "References", sub: "Phone numbers stay private until a reference call is booked.",
    fields: [
      { key: "refSupervisor", label: "Supervisor" },
      { key: "refPersonal", label: "Personal" },
      { key: "refSupervisorSigned", label: "Signed date", type: "date" },
      { key: "refPersonalSigned", label: "Signed date", type: "date" },
    ],
  },
  {
    no: "08", title: "Documents Provided", sub: "Files uploaded by the renter as proof.", wide: true,
    fields: [
      { key: "docLicence", label: "Driver's licence, front & back", type: "check" },
      { key: "docCredit", label: "Credit report", type: "check" },
      { key: "docEmployment", label: "Employment letter", type: "check" },
      { key: "docPaystubs", label: "Pay stubs", type: "check" },
      { key: "docCreditConsent", label: "Credit consent form", type: "check" },
      { key: "docRefConsent", label: "Reference consent form", type: "check" },
      { key: "docGuarantorIncome", label: "Guarantor income letter", type: "check" },
      { key: "docGuarantorAgreement", label: "Guarantor agreement & consent", type: "check" },
    ],
  },
]

// ─── Derived bits ─────────────────────────────────────────────────────────────

const shortDate = (iso?: string) => {
  const d = iso ? new Date(iso) : null
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("en-CA", { day: "numeric", month: "short", year: "numeric" }) : iso ?? ""
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.14em] text-primary/70" style={{ fontFamily: MONO }}>
      {children}
    </span>
  )
}

function FieldBox({ field, value, onChange }: { field: Field; value: string; onChange?: (v: string) => void }) {
  const readOnly = !onChange

  if (field.type === "check") {
    const on = value === "yes"
    return (
      <label className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 ${on ? "border-primary/30 bg-primary/5" : "border-border bg-card"} ${readOnly ? "" : "cursor-pointer"}`}>
        <input
          type="checkbox" checked={on} disabled={readOnly}
          onChange={e => onChange?.(e.target.checked ? "yes" : "")}
          className="size-4 shrink-0 accent-[var(--primary)]"
        />
        <span className="text-xs font-semibold text-foreground">{field.label}</span>
      </label>
    )
  }

  const shown = readOnly ? (field.type === "date" && value ? shortDate(value) : value) || NOT_SHARED : value
  return (
    <div className={field.wide ? "sm:col-span-2" : ""}>
      <Label>
        {field.label}
        {/* The asterisk prompts the renter; a reader has nothing to fill in. */}
        {field.required && !readOnly && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {readOnly ? (
        <p className={`rounded-lg border border-border bg-card px-3 py-2.5 text-sm ${value ? "text-foreground" : "italic text-muted-foreground/60"}`}>
          {shown}
        </p>
      ) : (
        <input
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          value={value}
          placeholder={field.placeholder ?? ""}
          onChange={e => onChange(e.target.value)}
          aria-invalid={field.required && !value ? true : undefined}
          className={`w-full rounded-lg border bg-input-background px-3 py-2.5 text-sm text-foreground transition-all placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring ${
            field.required && !value ? "border-destructive/50" : "border-border"
          }`}
        />
      )}
    </div>
  )
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <p className="text-2xl font-bold leading-none text-foreground" style={{ fontFamily: DISPLAY }}>{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>
    </div>
  )
}

// ─── Share by email ───────────────────────────────────────────────────────────

function ShareModal({ data, onClose }: { data: PassportData; onClose: () => void }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [unit, setUnit] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [sentTo, setSentTo] = useState("")

  const send = async () => {
    setBusy(true); setError("")
    try {
      // Only the keys the API's snapshot schema accepts, plus the optional extras bag.
      const passport: Record<string, unknown> = { extra: data.extra ?? {} }
      for (const k of PROFILE_KEYS) {
        const v = readField(data, k)
        if (v) passport[k] = v
      }
      if (data.neighbourhoods?.length) passport.neighbourhoods = data.neighbourhoods
      await sharePassport({ recipientName: name.trim(), recipientEmail: email.trim(), recipientUnit: unit.trim() || undefined, passport })
      setSentTo(email.trim())
    } catch (e: any) {
      setError(e.details?.[0]?.message || e.message || "Could not send it. Try again.")
    } finally {
      setBusy(false)
    }
  }

  const canSend = name.trim().length > 0 && email.includes("@") && !busy

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-4 backdrop-blur-sm sm:items-center sm:pb-0">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary" style={{ fontFamily: MONO }}>Share passport</p>
            <h3 className="mt-0.5 text-base font-bold text-foreground" style={{ fontFamily: DISPLAY }}>
              {sentTo ? "Sent" : "Email it to the landlord"}
            </h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground transition-colors hover:text-foreground"><X size={18} /></button>
        </div>

        {sentTo ? (
          <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10"><CheckCircle size={26} className="text-primary" /></div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your passport link is on its way to <strong className="text-foreground">{sentTo}</strong>. It expires in 14 days and you can revoke it at any time.
            </p>
            <button onClick={onClose} className="mt-2 w-full rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90">Done</button>
          </div>
        ) : (
          <form className="flex flex-col gap-4 px-6 py-5" onSubmit={e => { e.preventDefault(); if (canSend) send() }}>
            <div>
              <Label>Landlord name <span className="text-destructive">*</span></Label>
              <input value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="Maria Chen"
                className="w-full rounded-lg border border-border bg-input-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <Label>Landlord email <span className="text-destructive">*</span></Label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="landlord@example.com"
                className="w-full rounded-lg border border-border bg-input-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <Label>Unit / property <span className="font-normal normal-case opacity-60">optional</span></Label>
              <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="Unit 4B – 120 Spadina Ave"
                className="w-full rounded-lg border border-border bg-input-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
            <div className="flex items-start gap-2.5 rounded-xl border border-border bg-secondary/50 px-3.5 py-3">
              <Lock size={12} className="mt-0.5 shrink-0 text-muted-foreground/60" />
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                They get an overview by email and must confirm they manage the unit before the full passport opens. Link expires in 14 days.
              </p>
            </div>
            <button type="submit" disabled={!canSend}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40">
              {busy ? "Sending…" : <><Mail size={15} />Send passport</>}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── The document ─────────────────────────────────────────────────────────────

export function PassportDocument({
  data, onChange, mode = "full", meta, onExpand, children,
}: {
  data: PassportData
  /** Omit to render read-only — that is the landlord's view. */
  onChange?: (next: PassportData) => void
  mode?: "full" | "overview"
  meta?: { sharedBy?: string; sharedOn?: string; expiresAt?: string; unit?: string }
  /** Overview only: the landlord's way into the detailed passport. */
  onExpand?: () => void
  children?: React.ReactNode
}) {
  const [shareOpen, setShareOpen] = useState(false)
  const editable = !!onChange
  const overview = mode === "overview"

  const f = (k: string) => readField(data, k)
  const upd = (k: string, v: string) => onChange?.(writeField(data, k, v))

  const sections = overview ? SECTIONS.filter(s => s.overview) : SECTIONS
  const id = useMemo(() => passportId(f("email") || f("name")), [readField(data, "email"), readField(data, "name")])
  const missing = missingRequired(data)

  const income = money(f("income"))
  const budget = money(f("budgetMax"))
  const credit = f("creditScore")

  const reset = () => {
    if (!onChange) return
    // Clears the optional half only — the sign-in fields are what make the passport valid.
    const kept = Object.fromEntries(REQUIRED_KEYS.map(k => [k, f(k)]))
    let next: PassportData = { ...data, extra: {} }
    for (const s of SECTIONS) for (const fl of s.fields) if (!REQUIRED_KEYS.includes(fl.key)) next = writeField(next, fl.key, "")
    for (const [k, v] of Object.entries(kept)) next = writeField(next, k, v)
    onChange(next)
  }

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: BODY }}>
      {shareOpen && <ShareModal data={data} onClose={() => setShareOpen(false)} />}

      {/* Header bar */}
      <header className="bg-primary px-4 py-3.5 text-primary-foreground md:px-8 print:bg-white print:text-foreground">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold leading-tight" style={{ fontFamily: DISPLAY }}>
              Standard Renter Passport{f("gName") ? " · With Guarantor" : ""}
            </h1>
            <p className="mt-0.5 text-[11px] opacity-75">
              {meta?.sharedBy
                ? <>Shared by {meta.sharedBy}{meta.sharedOn ? ` on ${shortDate(meta.sharedOn)}` : ""}{meta.expiresAt ? ` · link expires ${shortDate(meta.expiresAt)}` : ""}</>
                : <>No scores. No ratings. Every fact is tagged with source and date.</>}
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            {editable && (
              <>
                <button onClick={reset}
                  className="flex items-center gap-1.5 rounded-lg bg-primary-foreground/10 px-3 py-2 text-xs font-bold transition-colors hover:bg-primary-foreground/20">
                  <RotateCcw size={12} />Reset
                </button>
                <button onClick={() => setShareOpen(true)} disabled={missing.length > 0}
                  className="flex items-center gap-1.5 rounded-lg bg-primary-foreground px-3.5 py-2 text-xs font-bold text-primary transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
                  <Mail size={12} />Share with landlord
                </button>
              </>
            )}
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg bg-primary-foreground/10 px-3 py-2 text-xs font-bold transition-colors hover:bg-primary-foreground/20">
              <Printer size={12} />Print / Save PDF
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-7 md:px-8">
        {editable && missing.length > 0 && (
          <p role="alert" className="mb-5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive">
            Your passport cannot be shared until the sign-in details are complete: {missing.join(", ")}.
          </p>
        )}

        {/* Renter block */}
        <section className="mb-7">
          <Label>Renter</Label>
          <p className="mb-3 text-[11px] text-muted-foreground">18+ as per ID provided</p>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { key: "name", label: "Full name", required: true as const },
                { key: "email", label: "Email", required: true as const },
                { key: "phone", label: "Phone", required: true as const },
                { key: "city", label: "City", required: true as const },
              ].map(fl => (
                <FieldBox key={fl.key} field={fl} value={f(fl.key)} onChange={editable ? v => upd(fl.key, v) : undefined} />
              ))}
            </div>
            <dl className="shrink-0 text-right text-[11px] sm:min-w-44">
              <dt className="text-[9px] font-bold uppercase tracking-[0.14em] text-primary/70" style={{ fontFamily: MONO }}>Passport ID</dt>
              <dd className="mb-2 font-semibold text-foreground" style={{ fontFamily: MONO }}>{id}</dd>
              <dt className="text-[9px] font-bold uppercase tracking-[0.14em] text-primary/70" style={{ fontFamily: MONO }}>Updated on</dt>
              <dd className="text-foreground">{shortDate(meta?.sharedOn) || shortDate(new Date().toISOString())}</dd>
            </dl>
          </div>
        </section>

        {/* At a glance */}
        <section className="mb-8 grid gap-6 border-y border-border py-6 md:grid-cols-[1.2fr_1fr]">
          <div>
            <Label>At a glance</Label>
            {editable ? (
              <textarea
                rows={4} value={f("summary")} onChange={e => upd("summary", e.target.value)}
                placeholder="A line or two about who you are, where you rent now and what you're looking for."
                className="w-full rounded-lg border border-border bg-input-background px-3 py-2.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            ) : (
              <p className="text-sm leading-relaxed text-foreground">{f("summary") || <span className="italic text-muted-foreground/60">{NOT_SHARED}</span>}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 self-start sm:grid-cols-4 md:grid-cols-2">
            <Stat label="Income" value={income ? `$${Math.round(income / 1000)}K` : "—"} note="per year" />
            <Stat label="Credit" value={credit || "—"} note={credit ? "Equifax" : "Not shared"} />
            <Stat label="Budget" value={budget ? `$${budget.toLocaleString("en-CA")}` : "—"} note="per month" />
            <Stat label="Lease" value={f("leaseTerm") || "—"} note={f("moveIn") ? `Starting ${shortDate(f("moveIn"))}` : "Move-in not set"} />
          </div>
        </section>

        {/* Sections */}
        <div className="grid gap-8 md:grid-cols-2">
          {sections.map(s => (
            <section key={s.no} className={s.wide ? "md:col-span-2" : ""}>
              <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: DISPLAY }}>
                <span className="mr-1.5 text-primary">{s.no}</span>{s.title}
              </h2>
              <p className="mb-3 text-xs italic text-muted-foreground">{s.sub}</p>
              <div className={`grid gap-3 ${s.wide && s.fields.every(fl => fl.type === "check") ? "sm:grid-cols-2 md:grid-cols-4" : "sm:grid-cols-2"}`}>
                {s.fields.map(fl => (
                  <FieldBox key={fl.key} field={fl} value={f(fl.key)} onChange={editable ? v => upd(fl.key, v) : undefined} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {overview && onExpand && (
          <button onClick={onExpand}
            className="mt-8 w-full rounded-xl bg-primary px-5 py-4 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 print:hidden">
            View the detailed passport
          </button>
        )}

        {children}

        <footer className="mt-10 border-t border-border pt-5 text-[11px] leading-relaxed text-muted-foreground">
          <p>{f("name") || "The renter"} attested that the information in this passport is true and complete.</p>
          <p className="mt-1">No scores. No ratings. Every fact is tagged with source and date. Renters never pay · rentre.ca</p>
        </footer>
      </div>
    </div>
  )
}
