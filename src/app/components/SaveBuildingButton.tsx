import { useEffect, useState } from "react"
import { BellRing, Bookmark, BookmarkCheck } from "lucide-react"
import { fetchSavedBuildings, saveBuilding, unsaveBuilding } from "../../services/api"

/**
 * "Save this building" with an optional move-in window. Saving subscribes the renter to vacancy
 * alerts for this listing; the window keeps alerts to units available when they actually want to move.
 */
export function SaveBuildingButton({ listingId, isSignedIn, onSignIn }: { listingId: string; isSignedIn: boolean; onSignIn: () => void }) {
  const [saved, setSaved] = useState(false)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!isSignedIn) return
    fetchSavedBuildings().then(r => {
      const mine = r.data.find(s => s.listingId === listingId)
      if (mine) { setSaved(true); setFrom(mine.moveInFrom ?? ""); setTo(mine.moveInTo ?? "") }
    }).catch(() => {})
  }, [listingId, isSignedIn])

  const save = async () => {
    setBusy(true); setError("")
    try {
      await saveBuilding({ listingId, moveInFrom: from || undefined, moveInTo: to || undefined })
      setSaved(true); setEditing(false)
    } catch (err: any) { setError(err?.message || "Could not save this building.") }
    finally { setBusy(false) }
  }

  const unsave = async () => {
    setBusy(true); setError("")
    try { await unsaveBuilding(listingId); setSaved(false); setFrom(""); setTo(""); setEditing(false) }
    catch (err: any) { setError(err?.message || "Could not remove this building.") }
    finally { setBusy(false) }
  }

  if (!isSignedIn) return (
    <button onClick={onSignIn} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition">
      <Bookmark size={13} />Save building
    </button>
  )

  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          {saved ? <BookmarkCheck size={15} className="text-primary" /> : <Bookmark size={15} />}
          {saved ? "Saved · watching for vacancies" : "Save this building"}
        </div>
        {saved
          ? <button onClick={unsave} disabled={busy} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">Remove</button>
          : <button onClick={() => setEditing(e => !e)} className="text-xs text-primary font-semibold">{editing ? "Cancel" : "Set move-in window"}</button>}
      </div>
      {saved && (from || to) && !editing && (
        <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1.5"><BellRing size={12} />Alerts for units available {from || "any time"} → {to || "any time"} · <button onClick={() => setEditing(true)} className="underline">change</button></p>
      )}
      {saved && !from && !to && !editing && (
        <p className="mt-1.5 text-xs text-muted-foreground">You will hear about every unit that opens here. <button onClick={() => setEditing(true)} className="underline">Narrow to a move-in window</button></p>
      )}
      {(editing || !saved) && (
        <div className="mt-3 grid gap-2">
          {editing && (
            <div className="grid grid-cols-2 gap-2">
              <label className="block"><span className="block text-[11px] text-muted-foreground mb-1">Move in from</span><input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-xs" /></label>
              <label className="block"><span className="block text-[11px] text-muted-foreground mb-1">Move in by</span><input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-xs" /></label>
            </div>
          )}
          <button onClick={save} disabled={busy} className="w-full rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {busy ? "Saving…" : saved ? "Update window" : "Save & get vacancy alerts"}
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  )
}
