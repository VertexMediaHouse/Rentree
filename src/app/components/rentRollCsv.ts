import type { RentRollEntry } from "../../services/api"

/**
 * Parses a rent-roll CSV. Header row required; columns matched by name, case-insensitive:
 * unit, bedrooms, rent, vacant (yes/no/true/1), available_from, lease_end. Extra columns ignored.
 * Values may be quoted, and rent may carry $ and thousands separators.
 *
 * Never throws: a bad line is reported in `skipped` so the landlord sees exactly what failed
 * instead of losing the whole upload to one typo.
 */
export function parseRentRollCsv(text: string): { rows: RentRollEntry[]; skipped: string[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { rows: [], skipped: ["File needs a header row and at least one unit."] }

  const split = (l: string) =>
    (l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) ?? [])
      .filter(c => c !== "")
      .map(c => c.replace(/,$/, "").trim().replace(/^"|"$/g, "").replace(/""/g, '"'))

  const header = split(lines[0]!).map(h => h.toLowerCase().replace(/[\s-]+/g, "_"))
  const col = (...names: string[]) => header.findIndex(h => names.includes(h))
  const iUnit = col("unit", "unit_number", "suite")
  const iBeds = col("bedrooms", "beds", "bed")
  const iRent = col("rent", "monthly_rent", "price")
  const iVacant = col("vacant", "is_vacant", "status")
  const iFrom = col("available_from", "available", "move_in")
  const iEnd = col("lease_end", "lease_ends", "end_date")
  if (iUnit < 0 || iBeds < 0 || iRent < 0) return { rows: [], skipped: ["Header must include unit, bedrooms and rent."] }

  const rows: RentRollEntry[] = []
  const skipped: string[] = []
  const seen = new Set<string>()
  const date = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined)

  for (const line of lines.slice(1)) {
    const c = split(line)
    const unit = c[iUnit]?.trim()
    const bedrooms = Number(c[iBeds])
    const rent = Number(String(c[iRent] ?? "").replace(/[$,]/g, ""))
    if (!unit || !Number.isInteger(bedrooms) || bedrooms < 0 || !(rent > 0)) { skipped.push(line); continue }
    if (seen.has(unit)) { skipped.push(`${line} (duplicate unit)`); continue }
    seen.add(unit)
    const v = (c[iVacant] ?? "").toLowerCase()
    rows.push({
      unit,
      bedrooms,
      rent,
      vacant: ["yes", "y", "true", "1", "vacant"].includes(v),
      availableFrom: date(c[iFrom]),
      leaseEnd: date(c[iEnd]),
    })
  }
  return { rows, skipped }
}

export const RENT_ROLL_SAMPLE_CSV =
  "unit,bedrooms,rent,vacant,available_from,lease_end\n101,1,2100,yes,2026-12-01,\n102,2,2750,no,,2027-03-31\n"
