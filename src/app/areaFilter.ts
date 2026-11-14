/**
 * The map area filter's geometry and the co-tenant list's storage, kept free of React so both can
 * be exercised on their own — the same split `passportFields.ts` uses.
 */

export type LatLng = [number, number]

/**
 * Ray-casting point-in-polygon. Counts how many polygon edges a ray cast east from the point
 * crosses: odd means inside. Works for concave and self-touching rings, which a convex-hull or
 * bounding-box test would get wrong — and a hand-drawn area is usually concave.
 */
export function pointInPolygon([lat, lng]: LatLng, ring: LatLng[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [latI, lngI] = ring[i]
    const [latJ, lngJ] = ring[j]
    // Does the edge straddle the point's latitude? Strict on one end, loose on the other, so a
    // vertex exactly at the point's latitude is counted once rather than twice or zero times.
    const straddles = latI > lat !== latJ > lat
    if (!straddles) continue
    const lngAtLat = lngI + ((lat - latI) / (latJ - latI)) * (lngJ - lngI)
    if (lng < lngAtLat) inside = !inside
  }
  return inside
}

// ─── Co-tenants and co-signing ───────────────────────────────────────────────

/** How a renter intends to hold the lease. Drives whether co-tenant rows are collected. */
export type TenancyKind = "individual" | "co_tenants" | "co_signed"

export interface CoTenant { name: string; email: string; relationship: string }

export const TENANCY_KINDS: { value: TenancyKind; label: string; desc: string }[] = [
  { value: "individual", label: "Just me",         desc: "I'll be the only name on the lease." },
  { value: "co_tenants", label: "With co-tenants",  desc: "Roommates or partner, all named on the lease and jointly responsible." },
  { value: "co_signed",  label: "With a co-signer", desc: "Someone guarantees the rent without living here, e.g. a parent." },
]

/** A co-signer is one person by definition; co-tenants can be several. */
export const maxCoTenants = (kind: TenancyKind) => (kind === "co_signed" ? 1 : 4)

export const coTenantLabel = (kind: TenancyKind) => (kind === "co_signed" ? "Co-signer" : "Co-tenant")

export const tenancyLabel = (kind: string) =>
  TENANCY_KINDS.find(k => k.value === kind)?.label ?? kind

const blank = (): CoTenant => ({ name: "", email: "", relationship: "" })

/**
 * The passport's `extra` bag stores strings, so the co-tenant list round-trips as JSON. A bag
 * written by an older build, or edited by hand, can hold anything — so parsing never throws and
 * never returns a half-built row.
 */
export function parseCoTenants(raw: string | undefined): CoTenant[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
      .map(r => ({
        name: String(r.name ?? ""),
        email: String(r.email ?? ""),
        relationship: String(r.relationship ?? ""),
      }))
      .filter(r => r.name || r.email || r.relationship)
  } catch {
    return []
  }
}

/**
 * Updates row `i` of a co-tenant list, growing the list if the row does not exist yet. The UI
 * renders one blank row when the list is empty, so typing into that row has to create it.
 */
export function upsertRow(rows: CoTenant[], i: number, patch: Partial<CoTenant>): CoTenant[] {
  const next = rows.length ? [...rows] : [blank()]
  while (next.length <= i) next.push(blank())
  next[i] = { ...next[i], ...patch }
  return next
}

/** Rows worth saving: a blank row is the normal end state of an "add another" list. */
export const usableCoTenants = (rows: CoTenant[], kind: TenancyKind) =>
  rows.slice(0, maxCoTenants(kind)).filter(r => r.name.trim() || r.email.trim())

/**
 * The accordion row's state. "Just me" is a complete answer on its own; the other two are only
 * complete once at least one person is named, since an unnamed co-signer tells a landlord nothing.
 */
export function tenancySummary(kind: string, rows: CoTenant[]): { done: boolean; detail: string } {
  if (!kind) return { done: false, detail: "Individual, co-tenants or co-signer" }
  if (kind === "individual") return { done: true, detail: "Just me — individual lease" }
  if (!rows.length) return { done: false, detail: `${tenancyLabel(kind)} — add their details` }
  return { done: true, detail: `${tenancyLabel(kind)} · ${rows.map(r => r.name || "Unnamed").join(", ")}` }
}
