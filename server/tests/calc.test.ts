/**
 * Pure calculator tests — no database, no HTTP. These run anywhere:
 *   npm run test:unit
 * The database-backed endpoint tests live in api.test.ts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { monthlyPayment } from "../lib/finance";
import { calculateRTANoticeDates } from "../services/rtaCalculator";
import { calculateNetRent } from "../services/matchCalculator";
import { ontarioLTT, quebecWelcomeTax } from "../services/mortgageCalculator";

test("Canadian semi-annual compounding payment", () => {
  // $500k, 5%, 25y -> ~$2,908.02/mo with semi-annual compounding (US-style would be ~$2,922.95)
  assert.ok(Math.abs(monthlyPayment(500_000, 5, 25) - 2908.02) < 0.5);
  assert.equal(Math.round(monthlyPayment(120_000, 0, 10)), 1000);
});

test("land transfer tax brackets", () => {
  assert.equal(ontarioLTT(750_000), 11_475);
  assert.equal(quebecWelcomeTax(300_000), 2651.5 + 5400 * 0.015);
});

test("RTA: N12 lands on last day of rental period; mail adds 5 days", () => {
  const r = calculateRTANoticeDates({ noticeType: "N12", servedDate: "2026-03-10" });
  assert.equal(r.earliestEffectiveDate, "2026-05-31");
  const m = calculateRTANoticeDates({ noticeType: "N4", servedDate: "2026-03-10", serviceMethod: "mail" });
  assert.equal(m.earliestEffectiveDate, "2026-03-29");
});

test("RTA: N1 enforces 12 months since last increase", () => {
  const r = calculateRTANoticeDates({
    noticeType: "N1",
    servedDate: "2026-01-01",
    lastIncreaseDate: "2025-10-01",
  });
  assert.equal(r.earliestEffectiveDate, "2026-10-01");
});

test("net rent includes mandatory add-ons", () => {
  const r = calculateNetRent(2000, [{ label: "Fee", price: 50, mandatory: true }, { label: "Parking", price: 100 }], []);
  assert.equal(r.netRent, 2050);
});
