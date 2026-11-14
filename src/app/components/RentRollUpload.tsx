import { useEffect, useRef, useState } from "react"
import { FileSpreadsheet, Upload } from "lucide-react"
import { fetchMyListings, fetchRentRoll, uploadRentRoll } from "../../services/api"
import type { RentRollEntry, RentRollSummary } from "../../services/api"
import { RENT_ROLL_SAMPLE_CSV, parseRentRollCsv } from "./rentRollCsv"

export function RentRollUpload() {
  const [listings, setListings] = useState<{ id: string; address: string }[]>([])
  const [listingId, setListingId] = useState("")
  const [roll, setRoll] = useState<{ entries: RentRollEntry[]; summary: RentRollSummary } | null>(null)
  const [preview, setPreview] = useState<{ rows: RentRollEntry[]; skipped: string[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchMyListings().then((r: any) => {
      const mine = (r.data ?? []).map((l: any) => ({ id: l.id, address: l.unit ? `${l.address} · ${l.unit}` : l.address }))
      setListings(mine); if (mine[0]) setListingId(mine[0].id)
    }).catch(() => setError("Could not load your listings. Sign in as a landlord and try again."))
  }, [])

  useEffect(() => {
    if (!listingId) return
    setRoll(null); setPreview(null); setMsg("")
    fetchRentRoll(listingId).then(r => setRoll(r.data)).catch(() => {})
  }, [listingId])

  const onFile = async (f: File | undefined) => {
    if (!f) return
    setError(""); setMsg("")
    setPreview(parseRentRollCsv(await f.text()))
  }

  const upload = async () => {
    if (!preview?.rows.length || !listingId) return
    setBusy(true); setError("")
    try {
      const r = await uploadRentRoll(listingId, preview.rows)
      setRoll({ entries: r.data.entries, summary: r.data.summary }); setPreview(null)
      if (fileRef.current) fileRef.current.value = ""
      setMsg(`Saved ${r.data.entries.length} units. ${r.data.notified} renter${r.data.notified === 1 ? "" : "s"} alerted to new vacancies.`)
    } catch (err: any) { setError(err?.details?.[0]?.message || err?.message || "Upload failed.") }
    finally { setBusy(false) }
  }

  const downloadSample = () => {
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([RENT_ROLL_SAMPLE_CSV], { type: "text/csv" })); a.download = "rent-roll-sample.csv"; a.click()
    URL.revokeObjectURL(a.href)
  }

  const table = (rows: RentRollEntry[]) => (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-xs">
        <thead className="bg-secondary text-muted-foreground"><tr>{["Unit", "Beds", "Rent", "Status", "Available", "Lease ends"].map(h => <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>)}</tr></thead>
        <tbody>{rows.map(r => (
          <tr key={r.unit} className="border-t border-border">
            <td className="px-3 py-2 font-medium text-foreground">{r.unit}</td><td className="px-3 py-2">{r.bedrooms === 0 ? "Bachelor" : r.bedrooms}</td>
            <td className="px-3 py-2">${r.rent.toLocaleString()}</td>
            <td className="px-3 py-2">{r.vacant ? <span className="text-red-700 font-semibold">Vacant</span> : <span className="text-green-700">Occupied</span>}</td>
            <td className="px-3 py-2 text-muted-foreground">{r.availableFrom ?? "—"}</td><td className="px-3 py-2 text-muted-foreground">{r.leaseEnd ?? "—"}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )

  return (
    <div className="mt-6 text-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-foreground">Rent roll</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Upload a CSV of your building. Vacant units alert renters who saved it; unit numbers stay private.</p>
        </div>
        <button onClick={downloadSample} className="text-xs text-primary font-semibold flex items-center gap-1"><FileSpreadsheet size={13} />Sample CSV</button>
      </div>

      {listings.length === 0 && !error && <p className="text-muted-foreground">List a unit first, then upload its building's rent roll here.</p>}
      {listings.length > 0 && (
        <label className="block mb-3"><span className="block text-xs text-muted-foreground mb-1">Building / listing</span>
          <select value={listingId} onChange={e => setListingId(e.target.value)} className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground">
            {listings.map(l => <option key={l.id} value={l.id}>{l.address}</option>)}
          </select></label>
      )}

      {listingId && (
        <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card px-4 py-6 cursor-pointer hover:border-primary/40 transition">
          <Upload size={16} className="text-muted-foreground" /><span className="text-foreground font-medium">Choose rent-roll CSV</span>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
        </label>
      )}

      {preview && (
        <div className="mt-4">
          <p className="font-semibold text-foreground mb-2">Preview · {preview.rows.length} units{preview.skipped.length ? ` · ${preview.skipped.length} skipped` : ""}</p>
          {preview.rows.length > 0 && table(preview.rows)}
          {preview.skipped.length > 0 && <details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">Skipped lines</summary><pre className="mt-1 whitespace-pre-wrap">{preview.skipped.join("\n")}</pre></details>}
          <p className="mt-2 text-xs text-muted-foreground">This replaces the current roll for this building. Units not in the file are removed.</p>
          <button onClick={upload} disabled={busy || preview.rows.length === 0} className="mt-3 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{busy ? "Uploading…" : "Upload rent roll"}</button>
        </div>
      )}
      {msg && <p className="mt-3 text-xs text-green-700">{msg}</p>}
      {error && <p className="mt-3 text-xs text-red-700">{error}</p>}

      {roll && !preview && (
        <div className="mt-5">
          <p className="font-semibold text-foreground mb-2">Current roll · {roll.summary.units} units · {roll.summary.vacant} vacant{roll.summary.priceFrom != null ? ` · $${roll.summary.priceFrom.toLocaleString()}–$${roll.summary.priceTo!.toLocaleString()}` : ""}</p>
          {roll.entries.length ? table(roll.entries) : <p className="text-muted-foreground text-xs">No rent roll uploaded for this building yet.</p>}
        </div>
      )}
    </div>
  )
}
