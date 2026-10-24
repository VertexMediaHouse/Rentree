import { HttpError } from "../lib/errors";

export interface NoticeParams {
  noticeType: "N1" | "N2" | "N4" | "N12";
  servedDate: string; // YYYY-MM-DD
  serviceMethod?: "hand" | "mail" | "email";
  rentPeriod?: "monthly" | "weekly";
  rentDueDay?: number; // day of month rent is due (1-31), default 1
  leaseEndDate?: string; // end of fixed term, if any
  lastIncreaseDate?: string; // date of last rent increase (or move-in)
  firstOccupancyDate?: string; // first residential occupancy of the unit
  yearBuilt?: number;
}

// Ontario annual rent increase guideline by calendar year. Add new years as they are announced.
const GUIDELINE_PCT: Record<number, number> = { 2022: 1.2, 2023: 2.5, 2024: 2.5, 2025: 2.5, 2026: 2.1 };

const RENT_CONTROL_CUTOFF = Date.UTC(2018, 10, 15); // Nov 15, 2018

const parseDate = (s: string, field: string): Date => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  const d = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : new Date(NaN);
  if (isNaN(d.getTime())) throw new HttpError(400, `Invalid ${field}; expected YYYY-MM-DD`);
  return d;
};
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
const addMonths = (d: Date, n: number) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate()));
const iso = (d: Date) => d.toISOString().split("T")[0];
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

/** First date on/after `d` on which a rental period begins (rent due day). */
function nextPeriodStart(d: Date, dueDay: number): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const thisMonth = new Date(Date.UTC(y, m, Math.min(dueDay, daysInMonth(y, m))));
  if (thisMonth >= d) return thisMonth;
  const ny = m === 11 ? y + 1 : y;
  const nm = (m + 1) % 12;
  return new Date(Date.UTC(ny, nm, Math.min(dueDay, daysInMonth(ny, nm))));
}

/**
 * Rent control applies unless the unit was first occupied on/after Nov 15, 2018.
 * Returns null when it cannot be determined (built in 2018 without an occupancy date).
 */
export function isRentControlled(yearBuilt?: number, firstOccupancyDate?: string): boolean | null {
  if (firstOccupancyDate) return parseDate(firstOccupancyDate, "firstOccupancyDate").getTime() < RENT_CONTROL_CUTOFF;
  if (yearBuilt === undefined) return true; // conservative default
  if (yearBuilt < 2018) return true;
  if (yearBuilt > 2018) return false;
  return null;
}

export function calculateRTANoticeDates(params: NoticeParams) {
  const served = parseDate(params.servedDate, "servedDate");
  const dueDay = params.rentDueDay ?? 1;
  const notes: string[] = [];

  // Deemed service: mail adds 5 days, email adds 1 day (LTB Rules of Procedure)
  const serviceDelay = params.serviceMethod === "mail" ? 5 : params.serviceMethod === "email" ? 1 : 0;
  const deemedServed = addDays(served, serviceDelay);
  if (serviceDelay) notes.push(`Deemed served ${iso(deemedServed)} (+${serviceDelay} day(s) for ${params.serviceMethod}).`);

  const rentControlled = isRentControlled(params.yearBuilt, params.firstOccupancyDate);
  let minDays: number;
  let effective: Date;
  let guidelinePct: number | null = null;

  switch (params.noticeType) {
    case "N1":
    case "N2": {
      minDays = 90;
      effective = nextPeriodStart(addDays(deemedServed, minDays), dueDay);
      if (params.lastIncreaseDate) {
        const earliest = addMonths(parseDate(params.lastIncreaseDate, "lastIncreaseDate"), 12);
        if (effective < earliest) {
          effective = nextPeriodStart(earliest, dueDay);
          notes.push("Delayed: rent can only increase once every 12 months.");
        }
      } else {
        notes.push("Provide lastIncreaseDate to verify the 12-month rule.");
      }
      if (rentControlled !== false) {
        guidelinePct = GUIDELINE_PCT[effective.getUTCFullYear()] ?? null;
        if (guidelinePct === null) notes.push(`Guideline for ${effective.getUTCFullYear()} is not loaded yet.`);
      }
      break;
    }
    case "N4":
      minDays = params.rentPeriod === "weekly" ? 7 : 14;
      effective = addDays(deemedServed, minDays);
      notes.push("Tenant may void the notice by paying all arrears before the termination date.");
      break;
    case "N12": {
      minDays = 60;
      const earliest = addDays(deemedServed, minDays);
      // Termination must fall on the last day of a rental period, and not before a fixed term ends
      effective = addDays(nextPeriodStart(addDays(earliest, 1), dueDay), -1);
      if (params.leaseEndDate) {
        const end = parseDate(params.leaseEndDate, "leaseEndDate");
        if (effective < end) {
          effective = end;
          notes.push("Moved to the end of the fixed term.");
        }
      }
      notes.push("Landlord must pay one month's rent (or offer another unit) as compensation by the termination date.");
      break;
    }
  }

  if (rentControlled === null) {
    notes.push("Built in 2018: supply firstOccupancyDate to determine rent control (cutoff Nov 15, 2018).");
  } else if (rentControlled === false && (params.noticeType === "N1" || params.noticeType === "N2")) {
    notes.push("Exempt from the guideline (first occupied on/after Nov 15, 2018).");
  }

  return {
    noticeType: params.noticeType,
    servedDate: params.servedDate,
    minimumDaysNotice: minDays,
    earliestEffectiveDate: iso(effective),
    isRentControlled: rentControlled,
    guidelineIncreaseLimitPct: guidelinePct,
    notes,
  };
}
