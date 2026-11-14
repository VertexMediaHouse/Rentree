/**
 * The passport's field storage, kept free of React so it can be exercised on its own.
 *
 * A passport is a UserProfile plus an `extra` bag: the keys the profile already has a column for
 * are read and written in place, everything else lands in the bag.
 */

// Keys that live on UserProfile itself; every other key goes in the `extra` bag.
export const PROFILE_KEYS = [
  "name", "email", "phone", "city", "unitType", "budgetMax", "moveIn",
  "employment", "income", "jobTitle", "employer",
  "currentAddress", "timeAtAddress", "currentLandlord", "landlordPhone",
] as const

/**
 * Structural on purpose: a UserProfile satisfies it, but this module stays free of the app shell
 * so it can be typechecked and tested on its own. PassportDocument asserts the two still line up.
 */
export type PassportData = {
  /** The one non-string field; everything else is read and written through the helpers below. */
  neighbourhoods?: string[]
  extra?: Record<string, string>
}

const isProfileKey = (k: string) => (PROFILE_KEYS as readonly string[]).includes(k)

export const readField = (d: PassportData, k: string): string => {
  if (k === "neighbourhoods") return (d.neighbourhoods ?? []).join(", ")
  if (isProfileKey(k)) return String((d as Record<string, unknown>)[k] ?? "")
  return d.extra?.[k] ?? ""
}

export const writeField = (d: PassportData, k: string, v: string): PassportData => {
  if (k === "neighbourhoods") return { ...d, neighbourhoods: v.split(",").map(s => s.trim()).filter(Boolean) }
  if (isProfileKey(k)) return { ...d, [k]: v }
  return { ...d, extra: { ...d.extra, [k]: v } }
}

/** Stable per renter, so the same passport always carries the same ID without storing one. */
export function passportId(seed: string) {
  let h = 0
  for (const ch of seed || "rentre") h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const block = (n: number) => n.toString(36).toUpperCase().padStart(4, "0").slice(-4)
  return `RNT-${block(h)}-${block(h >>> 7 ^ 0x5bf03)}`
}

export const money = (v: string) => {
  const n = Number(String(v).replace(/[^\d.]/g, ""))
  return Number.isFinite(n) && n > 0 ? n : null
}


export const NOT_SHARED = "Not shared"

/** The sign-in form's fields. These are the ones the passport insists on. */
export const REQUIRED_KEYS = ["name", "email", "phone", "city", "budgetMax", "neighbourhoods"]

export const missingRequired = (d: PassportData) => REQUIRED_KEYS.filter(k => !readField(d, k).trim())
