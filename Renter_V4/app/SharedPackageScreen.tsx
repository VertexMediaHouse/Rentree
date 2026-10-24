import { useState, useRef } from "react"
import {
  CheckCircle, Shield, FileText, Phone, Upload,
  Lock, ChevronRight, ArrowRight, Building, X,
  BadgeCheck, AlertCircle, Plus, ChevronDown, Mail,
  KeyRound, Mic, PenLine, BarChart3, Percent, Trash2,
  CalendarCheck, Eye,
} from "lucide-react"
import { DISPLAY, BODY, MONO } from "./App"
import rentreLogoMark from "@/imports/rentre_pine_clean.png"

// ─── Mock data (injected via link in production) ──────────────────────────────

const PACKAGE_META = {
  tenantInitials: "JP",
  tenantNamePartial: "Justin P.",
  budgetMin: 2200,
  budgetMax: 2600,
  moveIn: "November 1, 2026",
  leaseTerm: "12 months",
  coApplicants: false,
  occupation: "Software Engineer",
  buildingAddress: "480 King St W, Toronto, ON M5V 1L3",
}

const PROFILE = {
  name: "Justin Peters",
  currentAddress: "123 St, Toronto, Ontario M5V 0N7",
  phone: "(416) 555-0142",
  occupation: "Software Engineer",
  budgetMin: 2200,
  budgetMax: 2600,
  moveIn: "November 1, 2026",
  leaseTerm: "12 months",
  coApplicants: false,
  // Identity
  idVerified: true,
  idOptIn: true,
  idMethod: "Government ID + liveness check",
  idVerifiedOn: "September 21, 2026",
  idFile: "government_id_justin_peters.jpeg",
  // Income
  verifiedIncome: 86000,
  incomeSource: "Notice of Assessment",
  employer: "TechCorp Inc.",
  employerDuration: "3 years, 2 months",
  incomeVerifiedOn: "September 20, 2026",
  // Reference
  priorLandlord: "Maple Ridge Property Management",
  priorProperty: "45 King St W, Toronto",
  priorRelationship: "Property Manager",
  priorContact: "(416) 555-0199",
  confirmedTenancy: true,
  confirmedOnTime: true,
  // Screening
  optInStatus: "Confirmed — tenant consented to third-party verification",
  reportPulled: "September 21, 2026",
  paymentHistory: "No delinquencies reported",
  ltbRecord: "No records found (source: CanLII)",
  // Consent
  pipedaConsent: "Confirmed — September 21, 2026",
  profileUpdated: "September 21, 2026",
}

const ADDON_OPTIONS = [
  { id: "paystubs",    label: "Recent paystubs",      desc: "Last 3 months of pay stubs",        provided: true,  fileName: "paystubs_aug2026.pdf" },
  { id: "bankstmt",   label: "Bank statements",       desc: "90-day bank statement",             provided: false, fileName: null },
  { id: "employment", label: "Employment letter",     desc: "Employer confirmation letter",      provided: true,  fileName: "techcorp_employment_letter.pdf" },
  { id: "noa",        label: "Notice of Assessment",  desc: "CRA NOA — most recent tax year",    provided: true,  fileName: "NOA_2025_justin_peters.pdf" },
  { id: "reference",  label: "Reference letter",      desc: "Personal or professional reference",provided: false, fileName: null },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function DocRow({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-4 py-2.5 border-b border-border/60 last:border-0 items-start">
      <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground pt-0.5 leading-tight" style={{ fontFamily: MONO }}>{label}</span>
      <div>
        <span className="text-sm text-foreground leading-snug">{value}</span>
        {note && <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed italic">{note}</p>}
      </div>
    </div>
  )
}

function DocSection({ number, title, children, footNote }: {
  number: string; title: string; children: React.ReactNode; footNote?: string
}) {
  return (
    <div className="mb-0">
      <div className="flex items-baseline gap-2 mb-2 mt-6 first:mt-0">
        <span className="text-[10px] font-black text-primary" style={{ fontFamily: MONO }}>{number}</span>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground" style={{ fontFamily: MONO }}>{title}</h3>
      </div>
      <div className="rounded-xl border border-border bg-card px-4 py-1 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {children}
      </div>
      {footNote && (
        <p className="text-[10px] text-muted-foreground mt-1.5 px-1 leading-relaxed italic">{footNote}</p>
      )}
    </div>
  )
}

// ─── Upload button ────────────────────────────────────────────────────────────

function UploadSlot({
  label, hint, icon, file, onFile, inputRef,
}: {
  label: string; hint: string; icon: React.ReactNode
  file: string | null; onFile: (name: string | null) => void
  inputRef: React.RefObject<HTMLInputElement | null>
}) {
  return (
    <div>
      <input
        ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
        onChange={e => onFile(e.target.files?.[0]?.name || null)}
      />
      {file ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <CheckCircle size={14} className="text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-0.5" style={{ fontFamily: MONO }}>{label}</p>
            <p className="text-xs text-primary truncate">{file}</p>
          </div>
          <button onClick={() => onFile(null)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
            <X size={13} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center gap-3 rounded-xl border-2 border-dashed border-border bg-secondary/30 px-4 py-3.5 text-left hover:border-primary/40 hover:bg-secondary/60 transition-all group">
          <span className="text-muted-foreground group-hover:text-primary transition-colors">{icon}</span>
          <div>
            <p className="text-xs font-semibold text-foreground">{label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>
          </div>
          <Upload size={13} className="ml-auto text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </button>
      )}
    </div>
  )
}

// ─── Step 1: Landlord ownership verification ──────────────────────────────────

function OwnershipVerifyStep({ onVerified }: { onVerified: (unit: string) => void }) {
  const [unitNumber, setUnitNumber] = useState("")
  const [taxFile, setTaxFile]       = useState<string | null>(null)
  const [utilFile, setUtilFile]     = useState<string | null>(null)
  const taxRef  = useRef<HTMLInputElement>(null)
  const utilRef = useRef<HTMLInputElement>(null)

  const hasProof = !!taxFile || !!utilFile
  const canContinue = unitNumber.trim().length > 0 && hasProof

  const fullUnit = `${PACKAGE_META.buildingAddress}${unitNumber.trim() ? `, ${unitNumber.trim()}` : ""}`

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-background" style={{ fontFamily: BODY }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <img src={rentreLogoMark} alt="Rentre" className="w-8 h-8 object-contain" />
          <span className="text-base font-semibold text-foreground" style={{ fontFamily: DISPLAY }}>
            rentre<span className="text-primary font-bold">.ca</span>
          </span>
        </div>

        {/* Applicant preview */}
        <div className="mb-5 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="h-1 bg-primary w-full" />
          <div className="px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3" style={{ fontFamily: MONO }}>Package shared with you</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-black text-primary" style={{ fontFamily: MONO }}>{PACKAGE_META.tenantInitials}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{PACKAGE_META.tenantNamePartial}</p>
                <p className="text-xs text-muted-foreground">{PACKAGE_META.occupation}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Budget", value: `$${PACKAGE_META.budgetMin.toLocaleString()}–${PACKAGE_META.budgetMax.toLocaleString()}` },
                { label: "Move-in", value: PACKAGE_META.moveIn.split(" ").slice(0, 2).join(" ") },
                { label: "Term",    value: PACKAGE_META.leaseTerm },
              ].map(item => (
                <div key={item.label} className="rounded-lg bg-secondary border border-border px-2.5 py-2 text-center">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5" style={{ fontFamily: MONO }}>{item.label}</p>
                  <p className="text-xs font-bold text-foreground leading-tight" style={{ fontFamily: MONO }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Verification form */}
        <div className="rounded-2xl border border-border bg-card shadow-sm p-5 flex flex-col gap-5">
          <div>
            <p className="text-base font-bold text-foreground mb-0.5" style={{ fontFamily: DISPLAY }}>Confirm your unit</p>
            <p className="text-xs text-muted-foreground leading-relaxed">Verify you are the landlord or authorized agent for the unit this applicant is interested in.</p>
          </div>

          {/* Building — pre-filled, read-only */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5" style={{ fontFamily: MONO }}>Building</label>
            <div className="flex items-center gap-2.5 rounded-xl border border-border bg-secondary/50 px-4 py-2.5">
              <Building size={13} className="text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground font-medium">{PACKAGE_META.buildingAddress}</span>
            </div>
          </div>

          {/* Unit number — landlord enters this */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5" style={{ fontFamily: MONO }}>Unit number</label>
            <input
              autoFocus
              value={unitNumber}
              onChange={e => setUnitNumber(e.target.value)}
              placeholder="e.g. 612, Loft 4B, Suite 201"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary transition-colors"
            />
          </div>

          {/* Proof of ownership */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1" style={{ fontFamily: MONO }}>Confirm ownership</label>
            <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
              Upload one of the following showing your name and this unit. Either document is accepted.
            </p>
            <div className="flex flex-col gap-2">
              <UploadSlot
                label="Property tax bill"
                hint="Must show unit address and owner name"
                icon={<FileText size={16} />}
                file={taxFile}
                onFile={setTaxFile}
                inputRef={taxRef}
              />
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <UploadSlot
                label="Utility bill"
                hint="Gas, hydro, or water — current period"
                icon={<Shield size={16} />}
                file={utilFile}
                onFile={setUtilFile}
                inputRef={utilRef}
              />
            </div>
          </div>

          {/* CTA */}
          <button
            disabled={!canContinue}
            onClick={() => onVerified(fullUnit)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3.5 text-sm font-bold hover:bg-primary/90 disabled:opacity-35 disabled:cursor-not-allowed transition-all">
            View applicant profile <ArrowRight size={15} />
          </button>
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-5 leading-relaxed max-w-xs mx-auto">
          By continuing you confirm you are an authorized agent or owner for this unit. Rentre logs all access for compliance.
        </p>
      </div>
    </div>
  )
}

// ─── Step 2: Summary profile document ────────────────────────────────────────

function ProfileDocument({ unit, onRequestAddons }: { unit: string; onRequestAddons: () => void }) {
  const p = PROFILE
  const [addonsOpen, setAddonsOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: BODY }}>

      {/* Sticky nav */}
      <nav className="sticky top-0 z-20 flex items-center justify-between px-4 md:px-6 py-3 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <img src={rentreLogoMark} alt="Rentre" className="w-7 h-7 object-contain" />
          <span className="text-sm font-semibold text-foreground" style={{ fontFamily: DISPLAY }}>
            rentre<span className="text-primary font-bold">.ca</span>
          </span>
        </div>
        <button
          onClick={onRequestAddons}
          className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3.5 py-2 text-xs font-bold hover:bg-primary/90 transition-colors">
          <Plus size={12} />Request backup docs
        </button>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Document header */}
        <div className="mb-6 pb-5 border-b-2 border-foreground/10">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1" style={{ fontFamily: MONO }}>Rentre · Verified Applicant Profile</p>
          <h1 className="text-3xl font-bold text-foreground leading-tight mb-2" style={{ fontFamily: DISPLAY }}>
            {p.name}
          </h1>
          <p className="text-sm text-muted-foreground italic">Facts, not judgments. Every field below is sourced and timestamped.</p>

          {/* Unit context chip */}
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5">
            <Building size={11} className="text-primary" />
            <span className="text-[11px] font-semibold text-primary">{unit}</span>
          </div>
        </div>

        {/* ── 1 Applicant Summary ── */}
        <DocSection number="1" title="Applicant Summary">
          <DocRow label="Name" value={<strong>{p.name}</strong>} />
          <DocRow label="Current address" value={p.currentAddress} />
          <DocRow label="Phone" value={p.phone} />
          <DocRow label="Occupation" value={p.occupation} />
          <DocRow label="Budget" value={<span style={{ fontFamily: MONO }}>${p.budgetMin.toLocaleString()} – ${p.budgetMax.toLocaleString()} / month</span>} />
          <DocRow label="Move-in date" value={`${p.moveIn} · Lease Length: ${p.leaseTerm}`} />
          <DocRow label="Co-applicants" value={p.coApplicants ? "Yes" : "No"} />
        </DocSection>

        {/* ── 2 Identity Verification ── */}
        <DocSection
          number="2"
          title="Identity Verification"
          footNote="ID image content and document numbers are not shown to landlords. File type and opt-in status only.">
          <DocRow label="Government ID verified" value={
            <span className="flex items-center gap-1.5 text-green-700 font-semibold">
              <CheckCircle size={13} />Yes
            </span>
          } />
          <DocRow label="Opted in" value={
            p.idOptIn
              ? <span className="flex items-center gap-1.5 text-green-700 font-semibold"><CheckCircle size={13} />Confirmed — tenant consented to ID sharing</span>
              : <span className="text-muted-foreground">Not opted in</span>
          } />
          <DocRow label="Document provided" value={
            <span className="flex items-center gap-1.5 text-foreground font-semibold">
              <FileText size={13} className="text-primary shrink-0" />
              {p.idFile}
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1 border border-border rounded px-1.5 py-0.5">JPEG</span>
            </span>
          } />
          <DocRow label="Verification method" value={p.idMethod} />
          <DocRow label="Verified on" value={<span style={{ fontFamily: MONO }}>{p.idVerifiedOn}</span>} />
        </DocSection>

        {/* ── 3 Income Verification ── */}
        <DocSection number="3" title="Income Verification">
          <DocRow label="Verified income" value={
            <span className="font-bold" style={{ fontFamily: MONO }}>
              ${p.verifiedIncome.toLocaleString()} / year (${Math.round(p.verifiedIncome / 12).toLocaleString()} / month)
            </span>
          } />
          <DocRow label="Source" value={p.incomeSource} />
          <DocRow label="Employer" value={`${p.employer} · ${p.employerDuration}`} />
          <DocRow label="Verified on" value={<span style={{ fontFamily: MONO }}>{p.incomeVerifiedOn}</span>} />
        </DocSection>

        {/* ── 4 Landlord / PM Reference ── */}
        <DocSection number="4" title="Landlord / Property Manager Reference">
          <DocRow label="Prior landlord / PM" value={p.priorLandlord} />
          <DocRow label="Property" value={p.priorProperty} />
          <DocRow label="Relationship" value={p.priorRelationship} />
          <DocRow label="Contact" value={<span style={{ fontFamily: MONO }}>{p.priorContact}</span>} />
          <DocRow label="Confirmed prior tenancy" value={
            <span className="flex items-center gap-1.5 text-green-700 font-semibold"><CheckCircle size={13} />Yes</span>
          } />
          <DocRow label="Confirmed rent paid on time" value={
            <span className="flex items-center gap-1.5 text-green-700 font-semibold"><CheckCircle size={13} />Yes</span>
          } />
        </DocSection>

        {/* ── 5 Screening Report ── */}
        <DocSection
          number="5"
          title="Screening Report (SingleKey, pass-through)"
          footNote="Credit score is relayed from Equifax / SingleKey — not calculated or interpreted by Rentre.">
          <DocRow label="Tenant opt-in status" value={p.optInStatus} />
          <DocRow label="Report pulled" value={<span style={{ fontFamily: MONO }}>{p.reportPulled}</span>} />
          <DocRow label="Credit score" value={
            <a href="#" className="flex items-center gap-1.5 text-primary font-semibold text-sm underline underline-offset-2">
              <Lock size={12} />Available via secure link (third-party data)
            </a>
          } />
          <DocRow label="Payment history" value={
            <span className="flex items-center gap-1.5 text-green-700 font-semibold"><CheckCircle size={13} />{p.paymentHistory}</span>
          } />
          <DocRow label="LTB / eviction record" value={
            <span className="flex items-center gap-1.5 text-green-700 font-semibold"><CheckCircle size={13} />{p.ltbRecord}</span>
          } />
        </DocSection>

        {/* ── 6 Consent & Data Provenance ── */}
        <DocSection number="6" title="Consent & Data Provenance">
          <DocRow label="PIPEDA consent" value={p.pipedaConsent} />
          <DocRow label="Profile last updated" value={<span style={{ fontFamily: MONO }}>{p.profileUpdated}</span>} />
          <div className="py-2.5">
            <p className="text-[11px] text-muted-foreground leading-relaxed">Every fact above carries an individual source and verification timestamp, available on request.</p>
          </div>
        </DocSection>

        {/* Disclaimer */}
        <div className="mt-6 flex gap-3 rounded-xl border border-border bg-secondary/50 px-4 py-4">
          <AlertCircle size={14} className="text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Rentre assembles and presents this profile on behalf of the applicant. We do not independently verify the accuracy of applicant-provided documents — we relay third-party verification statuses only. Landlords are responsible for their own due diligence.
          </p>
        </div>

        {/* Backup documents panel */}
        <div className="mt-5 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <button
            onClick={() => setAddonsOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-secondary/30 transition-colors">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-bold text-foreground" style={{ fontFamily: DISPLAY }}>Backup documents</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-700" style={{ fontFamily: MONO }}>
                  {ADDON_OPTIONS.filter(o => o.provided).length}/{ADDON_OPTIONS.length} provided
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Request missing documents — the applicant will be notified to upload.</p>
            </div>
            <ChevronDown size={16} className={`text-muted-foreground shrink-0 transition-transform ml-3 ${addonsOpen ? "rotate-180" : ""}`} />
          </button>

          {addonsOpen && (
            <div className="border-t border-border divide-y divide-border">
              {ADDON_OPTIONS.map(opt => (
                <div key={opt.id} className="flex items-center gap-3 px-5 py-3.5">
                  {/* Status icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${opt.provided ? "bg-green-500/10 border border-green-500/20" : "bg-secondary border border-border"}`}>
                    {opt.provided
                      ? <CheckCircle size={14} className="text-green-600" />
                      : <FileText size={14} className="text-muted-foreground/50" />}
                  </div>

                  {/* Label + file */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                      {opt.provided
                        ? <span className="text-[10px] font-bold uppercase tracking-widest text-green-700 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded" style={{ fontFamily: MONO }}>Provided</span>
                        : <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-secondary border border-border px-1.5 py-0.5 rounded" style={{ fontFamily: MONO }}>Missing</span>}
                    </div>
                    {opt.provided && opt.fileName
                      ? <p className="text-[11px] text-primary mt-0.5 truncate font-medium">{opt.fileName}</p>
                      : <p className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>}
                  </div>

                  {/* Request button for missing */}
                  {!opt.provided && (
                    <button
                      onClick={onRequestAddons}
                      className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-primary border border-primary/25 rounded-lg px-2.5 py-1.5 hover:bg-primary/5 transition-colors">
                      <Plus size={11} />Request
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground mt-8 pb-4 leading-relaxed">
          SAMPLE — FICTIONAL APPLICANT, FOR DESIGN REFERENCE ONLY<br />
          Rentre · rentre.ca · Canadian Rental Marketplace
        </p>
      </div>
    </div>
  )
}


// ─── Service add-on definitions ───────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  "How long was the tenancy?",
  "Was rent paid on time each month?",
  "Were there any property damage concerns?",
  "Would you rent to this applicant again?",
  "Did the applicant give proper notice before vacating?",
  "Were there noise or neighbour complaints?",
]

const SERVICE_ADDONS = [
  {
    id: "reference_call",
    icon: <Mic size={16} />,
    label: "Reference call",
    desc: "Rentre conducts a structured call with the applicant's reference and provides a full transcript.",
    price: "$50",
    priceNote: "per call · transcript included",
    accentColor: "primary" as const,
    hasQuestions: true,
  },
  {
    id: "lockbox",
    icon: <KeyRound size={16} />,
    label: "Lockbox — self-guided viewings",
    desc: "A smart lockbox shipped to your unit. Rentre manages access codes for scheduled viewings. Yours to keep.",
    price: "$375",
    priceNote: "one-time · you keep the hardware",
    accentColor: "primary" as const,
    hasQuestions: false,
  },
  {
    id: "lease_signing",
    icon: <PenLine size={16} />,
    label: "Lease signing",
    desc: "Manage and e-sign your lease directly through Rentre. Required to activate the 10% rent-back opt-in.",
    price: "$8.99",
    priceNote: "/ month while active",
    accentColor: "primary" as const,
    hasQuestions: false,
  },
  {
    id: "rent_back",
    icon: <Percent size={16} />,
    label: "Rentre unit status opt-in",
    desc: "Offer the tenant 10% of their first month's rent back when they accept through Rentre. Lease signing required.",
    price: "10%",
    priceNote: "of first month rent · you set the offer",
    accentColor: "accent" as const,
    hasQuestions: false,
  },
  {
    id: "third_party",
    icon: <BarChart3 size={16} />,
    label: "3rd party screening report",
    desc: "Full SingleKey or Equifax report pulled with tenant consent. Includes credit, criminal, and eviction checks.",
    price: "$25",
    priceNote: "pass-through · not computed by Rentre",
    accentColor: "primary" as const,
    hasQuestions: false,
  },
]

// ─── Service add-on card ──────────────────────────────────────────────────────

function ServiceCard({
  addon, selected, onToggle, questions, onQuestionsChange,
}: {
  addon: typeof SERVICE_ADDONS[0]
  selected: boolean
  onToggle: () => void
  questions?: string[]
  onQuestionsChange?: (q: string[]) => void
}) {
  const [customQ, setCustomQ] = useState("")
  const isAccent = addon.accentColor === "accent"

  const toggleQ = (q: string) => {
    if (!questions || !onQuestionsChange) return
    onQuestionsChange(questions.includes(q) ? questions.filter(x => x !== q) : [...questions, q])
  }
  const addCustom = () => {
    if (!customQ.trim() || !onQuestionsChange || !questions) return
    onQuestionsChange([...questions, customQ.trim()])
    setCustomQ("")
  }

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all ${selected ? isAccent ? "border-accent/40 bg-accent/3" : "border-primary/30 bg-primary/3" : "border-border bg-card hover:border-foreground/15"}`}>
      <button onClick={onToggle} className="w-full flex items-start gap-3.5 px-4 py-4 text-left">
        {/* Checkbox */}
        <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${selected ? isAccent ? "bg-accent border-accent" : "bg-primary border-primary" : "border-border"}`}>
          {selected && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </div>
        {/* Icon */}
        <span className={`shrink-0 mt-0.5 ${selected ? isAccent ? "text-accent" : "text-primary" : "text-muted-foreground"} transition-colors`}>{addon.icon}</span>
        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-bold text-foreground leading-snug">{addon.label}</p>
            <div className="text-right shrink-0">
              <p className={`text-sm font-black leading-none ${isAccent ? "text-accent" : "text-primary"}`} style={{ fontFamily: MONO }}>{addon.price}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight max-w-[90px] text-right">{addon.priceNote}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed pr-2">{addon.desc}</p>
        </div>
      </button>

      {/* Reference questions expander */}
      {selected && addon.hasQuestions && questions && onQuestionsChange && (
        <div className="border-t border-border/60 px-4 pb-4 pt-3 bg-secondary/30">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5" style={{ fontFamily: MONO }}>Questions for the reference call</p>
          <div className="flex flex-col gap-1.5 mb-3">
            {SUGGESTED_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => toggleQ(q)}
                className={`flex items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-all ${questions.includes(q) ? "bg-primary/8 border border-primary/20" : "border border-border hover:border-primary/20 bg-card"}`}>
                <div className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${questions.includes(q) ? "bg-primary border-primary" : "border-border"}`}>
                  {questions.includes(q) && <svg width="7" height="5" viewBox="0 0 7 5" fill="none"><path d="M1 2.5L2.5 4L6 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
                <span className="text-xs text-foreground leading-snug">{q}</span>
              </button>
            ))}
          </div>

          {/* Custom questions */}
          {questions.filter(q => !SUGGESTED_QUESTIONS.includes(q)).map((q, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 mb-1.5">
              <span className="flex-1 text-xs text-foreground">{q}</span>
              <button onClick={() => onQuestionsChange(questions.filter(x => x !== q))} className="text-muted-foreground hover:text-foreground shrink-0">
                <Trash2 size={11} />
              </button>
            </div>
          ))}

          <div className="flex gap-2 mt-2">
            <input
              value={customQ}
              onChange={e => setCustomQ(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCustom()}
              placeholder="Add your own question…"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary transition-colors"
            />
            <button
              onClick={addCustom}
              disabled={!customQ.trim()}
              className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-35 hover:bg-primary/90 transition-all">
              <Plus size={13} />
            </button>
          </div>
          {questions.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-2">{questions.length} question{questions.length !== 1 ? "s" : ""} selected</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Viewing invite slots ─────────────────────────────────────────────────────

const VIEWING_SLOTS = [
  { id: "s1", day: "Mon", date: "Sep 22", times: ["10:00 AM", "2:00 PM", "4:30 PM"] },
  { id: "s2", day: "Tue", date: "Sep 23", times: ["11:00 AM", "1:00 PM", "3:00 PM"] },
  { id: "s3", day: "Wed", date: "Sep 24", times: ["10:30 AM", "2:30 PM"] },
  { id: "s4", day: "Thu", date: "Sep 25", times: ["9:00 AM", "12:00 PM", "5:00 PM"] },
]

// ─── Accordion panel wrapper ──────────────────────────────────────────────────

function NextStepPanel({
  icon, title, subtitle, badge, open, onToggle, children,
}: {
  icon: React.ReactNode; title: string; subtitle: string; badge?: React.ReactNode
  open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all ${open ? "border-primary/25 shadow-sm" : "border-border hover:border-foreground/15"}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left bg-card hover:bg-secondary/30 transition-colors">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${open ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground border border-border"}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-foreground">{title}</p>
            {badge}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <ChevronDown size={16} className={`text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border bg-background/50">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Step 3: Next Steps screen ────────────────────────────────────────────────

function AddonsRequestedScreen({ unit, onBack }: { unit: string; onBack: () => void }) {
  const [openPanel, setOpenPanel] = useState<"services" | "docs" | "viewing" | null>(null)
  const toggle = (p: typeof openPanel) => setOpenPanel(o => o === p ? null : p)

  // Services state
  const [svcSelected, setSvcSelected] = useState<Record<string, boolean>>({})
  const [refQuestions, setRefQuestions] = useState<string[]>([])
  const toggleSvc = (id: string) => setSvcSelected(s => ({ ...s, [id]: !s[id] }))
  const rentBackBlocked = svcSelected["rent_back"] && !svcSelected["lease_signing"]
  const totalServices = SERVICE_ADDONS.filter(s => svcSelected[s.id])
  const hasPaidService = totalServices.some(s => s.id !== "rent_back")

  // Docs state
  const [docSelected, setDocSelected] = useState<Record<string, boolean>>({})
  const toggleDoc = (id: string) => setDocSelected(s => ({ ...s, [id]: !s[id] }))
  const missingDocs = ADDON_OPTIONS.filter(o => !o.provided)
  const anyDocSelected = missingDocs.some(o => docSelected[o.id])

  // Viewing state
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; date: string; time: string } | null>(null)
  const [viewingNote, setViewingNote] = useState("")

  // Sent states
  const [svcSent, setSvcSent] = useState(false)
  const [docSent, setDocSent] = useState(false)
  const [viewingSent, setViewingSent] = useState(false)

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: BODY }}>
      <nav className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <img src={rentreLogoMark} alt="Rentre" className="w-7 h-7 object-contain" />
          <span className="text-sm font-semibold text-foreground" style={{ fontFamily: DISPLAY }}>
            rentre<span className="text-primary font-bold">.ca</span>
          </span>
        </div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-full px-3 py-1.5 transition-colors">
          <X size={12} />Close
        </button>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-8 pb-24 flex flex-col gap-4">

        {/* Header */}
        <div className="mb-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-1" style={{ fontFamily: MONO }}>
            {PACKAGE_META.tenantNamePartial} · {unit}
          </p>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: DISPLAY }}>Next steps</h2>
        </div>

        {/* ── 1 · Rentre Services ── */}
        <NextStepPanel
          icon={<BarChart3 size={17} />}
          title="Rentre services"
          subtitle="Reference calls, lockbox, lease signing, and more"
          badge={
            Object.values(svcSelected).filter(Boolean).length > 0
              ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20" style={{ fontFamily: MONO }}>
                  {Object.values(svcSelected).filter(Boolean).length} selected
                </span>
              : undefined
          }
          open={openPanel === "services"}
          onToggle={() => toggle("services")}>

          <div className="px-4 py-4 flex flex-col gap-3">
            {SERVICE_ADDONS.map(addon => (
              <ServiceCard
                key={addon.id}
                addon={addon}
                selected={!!svcSelected[addon.id]}
                onToggle={() => toggleSvc(addon.id)}
                questions={addon.hasQuestions ? refQuestions : undefined}
                onQuestionsChange={addon.hasQuestions ? setRefQuestions : undefined}
              />
            ))}

            {rentBackBlocked && (
              <div className="flex items-start gap-2.5 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
                <AlertCircle size={14} className="text-accent shrink-0 mt-0.5" />
                <p className="text-xs text-accent leading-relaxed">
                  <strong>Lease signing required</strong> to activate the 10% rent-back opt-in.
                </p>
              </div>
            )}

            {svcSent ? (
              <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3">
                <CheckCircle size={14} className="text-green-600 shrink-0" />
                <p className="text-sm font-semibold text-green-700">Services activated</p>
              </div>
            ) : (
              <button
                disabled={!Object.values(svcSelected).some(Boolean) || rentBackBlocked}
                onClick={() => setSvcSent(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 text-sm font-bold hover:bg-primary/90 disabled:opacity-35 disabled:cursor-not-allowed transition-all">
                <CheckCircle size={14} />Activate selected services
              </button>
            )}
            {hasPaidService && !svcSent && (
              <p className="text-center text-[10px] text-muted-foreground -mt-1">Paid services are billed to your Rentre account.</p>
            )}
          </div>
        </NextStepPanel>

        {/* ── 2 · Request Backup Documents ── */}
        <NextStepPanel
          icon={<FileText size={17} />}
          title="Request backup documents"
          subtitle={`${missingDocs.length} missing · ${ADDON_OPTIONS.filter(o => o.provided).length} already provided`}
          badge={
            anyDocSelected
              ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20" style={{ fontFamily: MONO }}>
                  {missingDocs.filter(o => docSelected[o.id]).length} to request
                </span>
              : undefined
          }
          open={openPanel === "docs"}
          onToggle={() => toggle("docs")}>

          <div className="px-4 py-4 flex flex-col gap-3">
            {/* Provided */}
            {ADDON_OPTIONS.filter(o => o.provided).map(opt => (
              <div key={opt.id} className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-2.5">
                <CheckCircle size={13} className="text-green-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                  {opt.fileName && <span className="text-[11px] text-primary ml-2">{opt.fileName}</span>}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-green-700 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded" style={{ fontFamily: MONO }}>Provided</span>
              </div>
            ))}

            {/* Missing */}
            {missingDocs.map(opt => (
              <button
                key={opt.id}
                onClick={() => toggleDoc(opt.id)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${docSelected[opt.id] ? "border-primary bg-primary/5" : "border-border hover:border-primary/25"}`}>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${docSelected[opt.id] ? "bg-primary border-primary" : "border-border"}`}>
                  {docSelected[opt.id] && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-secondary border border-border px-1.5 py-0.5 rounded shrink-0" style={{ fontFamily: MONO }}>Missing</span>
              </button>
            ))}

            {docSent ? (
              <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3">
                <CheckCircle size={14} className="text-green-600 shrink-0" />
                <p className="text-sm font-semibold text-green-700">Request sent — applicant notified</p>
              </div>
            ) : (
              <button
                disabled={!anyDocSelected}
                onClick={() => setDocSent(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 text-sm font-bold hover:bg-primary/90 disabled:opacity-35 disabled:cursor-not-allowed transition-all">
                <Mail size={14} />Send document request
              </button>
            )}
          </div>
        </NextStepPanel>

        {/* ── 3 · Invite to View ── */}
        <NextStepPanel
          icon={<Eye size={17} />}
          title="Invite to view"
          subtitle="Propose viewing times — applicant picks and confirms"
          badge={
            selectedSlot
              ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20" style={{ fontFamily: MONO }}>
                  {selectedSlot.day} {selectedSlot.date} · {selectedSlot.time}
                </span>
              : undefined
          }
          open={openPanel === "viewing"}
          onToggle={() => toggle("viewing")}>

          <div className="px-4 py-4 flex flex-col gap-4">
            {/* Date/time picker */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5" style={{ fontFamily: MONO }}>Select a time</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {VIEWING_SLOTS.map(slot => (
                  <div key={slot.id} className="flex flex-col gap-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-center text-muted-foreground" style={{ fontFamily: MONO }}>{slot.day} {slot.date}</p>
                    {slot.times.map(time => {
                      const active = selectedSlot?.day === slot.day && selectedSlot?.time === time
                      return (
                        <button
                          key={time}
                          onClick={() => setSelectedSlot({ day: slot.day, date: slot.date, time })}
                          className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition-all ${active ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:border-primary/40 hover:bg-primary/5"}`}>
                          {time}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5" style={{ fontFamily: MONO }}>
                Note to applicant <span className="normal-case font-normal text-muted-foreground/60">optional</span>
              </label>
              <textarea
                value={viewingNote}
                onChange={e => setViewingNote(e.target.value)}
                placeholder="e.g. Please use the main entrance on King St. Parking available on-site."
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary transition-colors resize-none"
              />
            </div>

            {viewingSent ? (
              <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3">
                <CalendarCheck size={14} className="text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-700">Invite sent</p>
                  {selectedSlot && <p className="text-xs text-muted-foreground mt-0.5">{selectedSlot.day}, {selectedSlot.date} at {selectedSlot.time}</p>}
                </div>
              </div>
            ) : (
              <button
                disabled={!selectedSlot}
                onClick={() => setViewingSent(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 text-sm font-bold hover:bg-primary/90 disabled:opacity-35 disabled:cursor-not-allowed transition-all">
                <CalendarCheck size={14} />Send viewing invite
              </button>
            )}
          </div>
        </NextStepPanel>

      </div>
    </div>
  )
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export function SharedPackagePage() {
  const [step, setStep] = useState<"verify" | "profile" | "addons">("verify")
  const [unit, setUnit] = useState("")

  if (step === "verify") return <OwnershipVerifyStep onVerified={u => { setUnit(u); setStep("profile") }} />
  if (step === "addons") return <AddonsRequestedScreen unit={unit} onBack={() => setStep("profile")} />
  return <ProfileDocument unit={unit} onRequestAddons={() => setStep("addons")} />
}
