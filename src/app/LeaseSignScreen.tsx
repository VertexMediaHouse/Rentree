import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle, PenLine } from "lucide-react"
import { DISPLAY, BODY, MONO } from "./App"
import rentreLogoMark from "@/imports/rentre_pine_clean.png"
import { fetchLease, signLease } from "../services/api"

type Signature = { name: string; at: string }
type Lease = {
  address: string; tenantName: string; tenantEmail: string; startDate: string; endDate?: string
  monthlyRent: number; deposit?: number; terms: string; hash: string
  landlordSignature: Signature; tenantSignature?: Signature
}

const money = (n: number) => "$" + n.toLocaleString("en-CA", { maximumFractionDigits: 2 })
const when = (iso: string) => new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })

export function LeaseSignPage() {
  const token = new URLSearchParams(window.location.search).get("t")
  const [lease, setLease] = useState<Lease | null>(null)
  const [error, setError] = useState(token ? "" : "This lease link is missing its code.")
  const [name, setName] = useState("")
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [signError, setSignError] = useState("")

  useEffect(() => {
    if (!token) return
    fetchLease(token).then(res => setLease(res.data)).catch(err => setError(err.message || "This lease could not be opened."))
  }, [token])

  const sign = async () => {
    setBusy(true); setSignError("")
    try { setLease((await signLease(token!, name.trim())).data) }
    catch (err: any) { setSignError(err.details?.[0]?.message || err.message || "Could not sign. Try again.") }
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

  const rows: [string, string][] = [
    ["Property", lease.address],
    ["Tenant", `${lease.tenantName} · ${lease.tenantEmail}`],
    ["Start", lease.startDate],
    ...(lease.endDate ? [["End", lease.endDate] as [string, string]] : []),
    ["Monthly rent", money(lease.monthlyRent)],
    ...(lease.deposit ? [["Deposit", money(lease.deposit)] as [string, string]] : []),
  ]

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
          <p className="flex items-center gap-2 text-foreground"><CheckCircle size={15} className="text-primary" />Landlord: <strong>{lease.landlordSignature.name}</strong><span className="text-muted-foreground">· {when(lease.landlordSignature.at)}</span></p>
          {lease.tenantSignature
            ? <p className="mt-2 flex items-center gap-2 text-foreground"><CheckCircle size={15} className="text-primary" />Tenant: <strong>{lease.tenantSignature.name}</strong><span className="text-muted-foreground">· {when(lease.tenantSignature.at)}</span></p>
            : <p className="mt-2 text-muted-foreground">Tenant: awaiting your signature</p>}
          <p className="mt-4 text-[11px] text-muted-foreground break-all" style={{ fontFamily: MONO }}>Fingerprint (SHA-256): {lease.hash}</p>
        </section>

        {lease.tenantSignature ? (
          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5 text-sm text-primary flex items-start gap-2">
            <CheckCircle size={16} className="mt-0.5 shrink-0" /><span><strong>Signed by both parties.</strong> A confirmation was emailed to you and your landlord.</span>
          </div>
        ) : (
          <section className="rounded-2xl border border-border bg-card p-5">
            <label htmlFor="sig" className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Type your full legal name to sign</label>
            <input id="sig" value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder={lease.tenantName}
              className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ fontFamily: DISPLAY }} />
            <label className="mt-4 flex items-start gap-2 text-sm text-foreground">
              <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-1" />
              <span>I have read this lease and agree that my typed name is my electronic signature.</span>
            </label>
            {signError && <p className="mt-3 text-sm text-red-700">{signError}</p>}
            <button onClick={sign} disabled={!name.trim() || !agree || busy}
              className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
              <PenLine size={16} />{busy ? "Signing…" : "Sign lease"}
            </button>
          </section>
        )}
      </div>
    </div>
  )
}
