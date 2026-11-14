import { test } from "node:test";
import assert from "node:assert/strict";
import {
  missingRequired,
  passportId,
  readField,
  writeField,
  type PassportData,
} from "../../src/app/passportFields";

// The passport splits its fields between the profile's own columns and the `extra` bag. Getting
// that routing wrong silently drops whatever the renter typed, so it is worth one check.
test("profile keys are written in place, everything else lands in extra", () => {
  let d: PassportData = {};
  d = writeField(d, "email", "daniel@example.com");
  d = writeField(d, "creditScore", "742");

  assert.equal((d as Record<string, unknown>).email, "daniel@example.com", "a profile key keeps its own column");
  assert.equal(d.extra?.creditScore, "742", "an optional key goes in the bag");
  assert.equal(readField(d, "email"), "daniel@example.com");
  assert.equal(readField(d, "creditScore"), "742");
  assert.equal(readField(d, "vehicle"), "", "an unset field reads empty, never undefined");
});

test("neighbourhoods round-trip between the list and the comma string", () => {
  const d = writeField({}, "neighbourhoods", "King West, Liberty Village , ");
  assert.deepEqual(d.neighbourhoods, ["King West", "Liberty Village"]);
  assert.equal(readField(d, "neighbourhoods"), "King West, Liberty Village");
});

test("only the sign-in fields are required", () => {
  assert.deepEqual(missingRequired({}), ["name", "email", "phone", "city", "budgetMax", "neighbourhoods"]);

  let full: PassportData = {};
  for (const [k, v] of Object.entries({
    name: "Daniel Okafor", email: "d@example.com", phone: "(416) 555-0148",
    city: "Toronto", budgetMax: "2600", neighbourhoods: "King West",
  })) full = writeField(full, k, v);

  assert.deepEqual(missingRequired(full), [], "a sign-in-complete profile can be shared");
  assert.deepEqual(missingRequired(writeField(full, "phone", "  ")), ["phone"], "blank is not filled in");
});

test("the passport ID is stable per renter and differs between renters", () => {
  assert.equal(passportId("d@example.com"), passportId("d@example.com"));
  assert.notEqual(passportId("d@example.com"), passportId("a@example.com"));
  assert.match(passportId("d@example.com"), /^RNT-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
});
