import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRentRollCsv } from "../../src/app/components/rentRollCsv";

test("parses a rent roll and flags vacancies", () => {
  const { rows, skipped } = parseRentRollCsv(
    'unit,bedrooms,rent,vacant,available_from,lease_end\n101,1,"2,100",yes,2026-12-01,\n102,2,$2750,no,,2027-03-31\n',
  );
  assert.equal(skipped.length, 0);
  assert.deepEqual(rows[0], { unit: "101", bedrooms: 1, rent: 2100, vacant: true, availableFrom: "2026-12-01", leaseEnd: undefined });
  assert.deepEqual(rows[1], { unit: "102", bedrooms: 2, rent: 2750, vacant: false, availableFrom: undefined, leaseEnd: "2027-03-31" });
});

test("skips bad rows and duplicate units instead of throwing", () => {
  const { rows, skipped } = parseRentRollCsv("unit,beds,rent\n101,1,2000\n,2,2000\n102,x,2000\n103,1,0\n101,1,2500\n");
  assert.deepEqual(rows.map((r) => r.unit), ["101"]);
  assert.equal(skipped.length, 4);
});

test("rejects a file without the required columns", () => {
  assert.deepEqual(parseRentRollCsv("address,rent\n1 Main St,2000\n").rows, []);
  assert.deepEqual(parseRentRollCsv("unit,bedrooms,rent\n").rows, []);
});

test("bachelor units (0 bedrooms) are valid", () => {
  assert.equal(parseRentRollCsv("unit,bedrooms,rent\n1A,0,1800\n").rows[0]!.bedrooms, 0);
});
