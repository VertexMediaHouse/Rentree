import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle, Clock, MessageSquare, PenLine, X } from "lucide-react"
import { DISPLAY, BODY, MONO } from "./App"
import rentreLogoMark from "@/imports/rentre_pine_clean.png"
import { countersignLease, decideLeaseRevision, fetchLease, proposeLeaseRevision, signLease } from "../services/api"
import type { LeaseRevision } from "../services/api"

type Signature = { name: string; at: string }
type Lease = {
  address: string; tenantName: string; tenantEmail: string; startDate: string; endDate?: string
  monthlyRent: number; deposit?: number; terms: string; hash: string
  landlordSignature: Signature; tenantSignature?: Signature
  revisions?: LeaseRevision[]
  /** Server-computed: a change is on the table, so nobody may sign yet. */
  awaitingRevision?: boolean
  /** An accepted revision cleared the landlord's signature; they re-sign before the tenant can. */
  awaitingLandlordSignature?: boolean
  /** Which side of the lease the current viewer is. */
  viewer?: "landlord" | "tenant"
}

type Draft = { startDate: string; endDate: string; monthlyRent: string; deposit: string; terms: string; note: string }

const money = (n: number) => "$" + n.toLocaleString("en-CA", { maximumFractionDigits: 2 })
const when = (iso: string) => new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })
const field = "w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
const primaryBtn = "w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"

export function LeaseSignPage() {
  const token = new URLSearchParams(window.location.search).get("t")
  const [lease, setLease] = useState<Lease | null>(null)
  const [error, setError] = useState(token ? "" : "This lease link is missing its code.")
  const [name, setName] = useState("")
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [signError, setSignError] = useState("")
  const [proposing, setProposing] = useState(false)
  const [draft, setDraft] = useState<Draft>({ startDate: "", endDate: "", monthlyRent: "", deposit: "", terms: "", note: "" })
  const [revError, setRevError] = useState("")

  const reload = () => fetchLease(token!).then(res => setLease(res.data))
  const errMsg = (err: any, fallback: string) => err?.details?.[0]?.message || err?.message || fallback

  useEffect(() => {
    if (!token) return
    reload().catch(err => setError(err.message || "This lease could not be opened."))
  }, [token])

  const sign = async () => {
    setBusy(true); setSignError("")
    try { setLease((await signLease(token!, name.trim())).data) }
    catch (err) { setSignError(errMsg(err, "Could not sign. Try again.")) }
    finally { setBusy(false) }
  }

  const countersign = async () => {
    setBusy(true); setSignError("")
    try { await countersignLease(token!, name.trim()); setName(""); setAgree(false); await reload() }
    catch (err) { setSignError(errMsg(err, "Could not sign. Try again.")) }
    finally { setBusy(false) }
  }

  const openProposal = () => {
    if (!lease) return
    setDraft({
      startDate: lease.startDate, endDate: lease.endDate ?? "", monthlyRent: String(lease.monthlyRent),
      deposit: lease.deposit ? String(lease.deposit) : "", terms: lease.terms, note: "",
    })
    setRevError(""); setProposing(true)
  }

  const propose = async () => {
    setBusy(true); setRevError("")
    try {
      await proposeLeaseRevision(token!, {
        startDate: draft.startDate,
        endDate: draft.endDate || undefined,
        monthlyRent: Number(draft.monthlyRent),
        deposit: draft.deposit ? Number(draft.deposit) : undefined,
        terms: draft.terms,
        note: draft.note.trim() || undefined,
      })
      setProposing(false); await reload()
    } catch (err) { setRevError(errMsg(err, "Could not send your changes.")) }
    finally { setBusy(false) }
  }

  const decide = async (id: string, action: "accept" | "reject" | "withdraw") => {
    setBusy(true); setRevError("")
    try { await decideLeaseRevision(token!, id, action); await reload() }
    catch (err) { setRevError(errMsg(err, "Could not update the proposal.")) }
    finally { setBusy(false) }
  }

  if (error || !lease) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-background" style={{ fontFamily: BODY }}>
      <img src={rentreLogoMark} alt="Rentre" className="w-8 h-8 object-contain mb-6" />
      {error
        ? <><AlertCircle size={22} className="text-muted-foreground mb-3" /><p className="text-base font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>{error}</p><p className="text-sm text-muted-foreground">Ask your landlord to resend the lease.</p></>
        : <p className="text-sm text-muted-foreground">Loading lease…</p>}
    </div>
  )

  const me = lease.viewer ?? "tenant"
  const pending = lease.revisions?.find(r => r.status === "proposed")
  const history = (lease.revisions ?? []).filter(r => r.status !== "proposed")
  const signed = Boolean(lease.tenantSignature)

  const rows: [string, string][] = [
    ["Property", lease.address],
    ["Tenant", `${lease.tenantName} · ${lease.tenantEmail}`],
    ["Start", lease.startDate],
    ...(lease.endDate ? [["End", lease.endDate] as [string, string]] : []),
    ["Monthly rent", money(lease.monthlyRent)],
    ...(lease.deposit ? [["Deposit", money(lease.deposit)] as [string, string]] : []),
  ]

  const signForm = (label: string, cta: string, onClick: () => void) => (
    <section className="rounded-2xl border border-border bg-card p-5">
      <label htmlFor="sig" className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>
      <input id="sig" value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder={me === "tenant" ? lease.tenantName : ""}
        className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ fontFamily: DISPLAY }} />
      <label className="mt-4 flex items-start gap-2 text-sm text-foreground">
        <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-1" />
        <span>I have read this lease and agree that my typed name is my electronic signature.</span>
      </label>
      {signError && <p className="mt-3 text-sm text-red-700">{signError}</p>}
      <button onClick={onClick} disabled={!name.trim() || !agree || busy} className={`mt-5 ${primaryBtn}`}>
        <PenLine size={16} />{busy ? "Signing…" : cta}
      </button>
    </section>
  )

  return (
    <div className="min-h-screen bg-background px-4 py-10" style={{ fontFamily: BODY }}>
      <div className="mx-auto max-w-2xl">
        <img src={rentreLogoMark} alt="Rentre" className="w-8 h-8 object-contain mb-6" />
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-accent mb-2">Residential lease</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-6" style={{ fontFamily: DISPLAY }}>{lease.address}</h1>

        <section className="rounded-2xl border border-border bg-card p-5 mb-4">
          <dl className="grid gap-2 text-sm">
            {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium text-foreground">{v}</dd></div>)}
          </dl>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 mb-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Terms</h2>
          <div className="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-foreground">{lease.terms}</div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 mb-4 text-sm">
          <h2 className="font-semibold text-foreground mb-3">Signatures</h2>
          {lease.landlordSignature?.name
            ? <p className="flex items-center gap-2 text-foreground"><CheckCircle size={15} className="text-primary" />Landlord: <strong>{lease.landlordSignature.name}</strong><span className="text-muted-foreground">· {when(lease.landlordSignature.at)}</span></p>
            : <p className="flex items-center gap-2 text-muted-foreground"><Clock size={15} />Landlord: re-signing after accepted changes</p>}
          {lease.tenantSignature
            ? <p className="mt-2 flex items-center gap-2 text-foreground"><CheckCircle size={15} className="text-primary" />Tenant: <strong>{lease.tenantSignature.name}</strong><span className="text-muted-foreground">· {when(lease.tenantSignature.at)}</span></p>
            : <p className="mt-2 text-muted-foreground">Tenant: {me === "landlord" ? "awaiting tenant signature" : "awaiting your signature"}</p>}
          <p className="mt-4 text-[11px] text-muted-foreground break-all" style={{ fontFamily: MONO }}>Fingerprint (SHA-256): {lease.hash}</p>
        </section>

        {pending && (
          <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 mb-4 text-sm">
            <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2"><MessageSquare size={15} />Proposed changes (v{pending.version}) from {pending.proposedBy === me ? "you" : `the ${pending.proposedBy}`}</h2>
            {pending.note && <p className="text-muted-foreground mb-3">“{pending.note}”</p>}
            <dl className="grid gap-1.5 mb-3">
              {([
                ["Start", lease.startDate, pending.startDate],
                ["End", lease.endDate ?? "—", pending.endDate ?? "—"],
                ["Monthly rent", money(lease.monthlyRent), money(pending.monthlyRent)],
                ["Deposit", lease.deposit ? money(lease.deposit) : "—", pending.deposit ? money(pending.deposit) : "—"],
              ] as [string, string, string][]).filter(([, a, b]) => a !== b).map(([k, a, b]) => (
                <div key={k} className="flex justify-between gap-4"><dt className="text-muted-foreground">{k}</dt><dd className="text-right"><span className="line-through text-muted-foreground mr-2">{a}</span><strong className="text-foreground">{b}</strong></dd></div>
              ))}
            </dl>
            {pending.terms !== lease.terms && (
              <details className="mb-3"><summary className="cursor-pointer text-foreground font-medium">Terms changed — view proposed terms</summary>
                <div className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap leading-6 text-foreground">{pending.terms}</div></details>
            )}
            <div className="flex gap-2">
              {pending.proposedBy === me
                ? <button onClick={() => decide(pending.id, "withdraw")} disabled={busy} className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 font-semibold text-foreground disabled:opacity-50">Withdraw</button>
                : <>
                  <button onClick={() => decide(pending.id, "accept")} disabled={busy} className="flex-1 rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-50">Accept</button>
                  <button onClick={() => decide(pending.id, "reject")} disabled={busy} className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 font-semibold text-foreground disabled:opacity-50">Reject</button>
                </>}
            </div>
          </section>
        )}
        {revError && <p className="mb-4 text-sm text-red-700">{revError}</p>}

        {!signed && !pending && !proposing && (
          <button onClick={openProposal} className="mb-4 w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted">
            <MessageSquare size={16} />Propose changes
          </button>
        )}

        {proposing && (
          <section className="rounded-2xl border border-border bg-card p-5 mb-4 text-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground">Propose changes</h2>
              <button onClick={() => setProposing(false)} aria-label="Cancel"><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([["startDate", "Start", "date"], ["endDate", "End (optional)", "date"], ["monthlyRent", "Monthly rent", "number"], ["deposit", "Deposit (optional)", "number"]] as [keyof Draft, string, string][]).map(([k, label, type]) => (
                <label key={k} className="block"><span className="block text-xs text-muted-foreground mb-1">{label}</span>
                  <input type={type} value={draft[k]} onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))} className={field} /></label>
              ))}
            </div>
            <label className="block mt-3"><span className="block text-xs text-muted-foreground mb-1">Terms</span>
              <textarea value={draft.terms} onChange={e => setDraft(d => ({ ...d, terms: e.target.value }))} rows={8} className={field} /></label>
            <label className="block mt-3"><span className="block text-xs text-muted-foreground mb-1">Note to the other party (optional)</span>
              <input value={draft.note} onChange={e => setDraft(d => ({ ...d, note: e.target.value }))} className={field} /></label>
            <button onClick={propose} disabled={busy || !draft.startDate || !draft.monthlyRent || !draft.terms.trim()} className={`mt-4 ${primaryBtn}`}>
              {busy ? "Sending…" : "Send proposal"}
            </button>
          </section>
        )}

        {history.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-5 mb-4 text-sm">
            <h2 className="font-semibold text-foreground mb-3">Change history</h2>
            <ul className="grid gap-2">{history.map(r => (
              <li key={r.id} className="flex justify-between gap-3">
                <span className="text-foreground">v{r.version} · proposed by {r.proposedBy}{r.note ? ` — “${r.note}”` : ""}</span>
                <span className="text-muted-foreground capitalize whitespace-nowrap">{r.status}{r.decidedAt ? ` · ${when(r.decidedAt)}` : ""}</span>
              </li>
            ))}</ul>
          </section>
        )}

        {signed ? (
          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5 text-sm text-primary flex items-start gap-2">
            <CheckCircle size={16} className="mt-0.5 shrink-0" /><span><strong>Signed by both parties.</strong> A confirmation was emailed to you and your landlord.</span>
          </div>
        ) : pending ? (
          <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground flex items-start gap-2">
            <Clock size={16} className="mt-0.5 shrink-0" />Signing is paused until the proposed changes are accepted, rejected or withdrawn.
          </div>
        ) : me === "landlord" ? (
          lease.awaitingLandlordSignature
            ? signForm("Type your full legal name to re-sign the updated lease", "Re-sign lease", countersign)
            : <p className="text-sm text-muted-foreground">Waiting for the tenant to sign.</p>
        ) : lease.awaitingLandlordSignature ? (
          <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground flex items-start gap-2">
            <Clock size={16} className="mt-0.5 shrink-0" />Your landlord is re-signing the updated lease. You can sign once they have.
          </div>
        ) : signForm("Type your full legal name to sign", "Sign lease", sign)}
      </div>
    </div>
  )
}
