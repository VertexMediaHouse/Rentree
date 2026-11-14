import assert from "node:assert/strict";
import { test } from "node:test";

import {
  parseCoTenants, pointInPolygon, tenancySummary, upsertRow, usableCoTenants,
  type LatLng,
} from "../../src/app/areaFilter";

// A concave "C" shape. A bounding-box or convex-hull test would wrongly report the notch as
// inside, which is the whole reason the filter uses ray casting.
const C_SHAPE: LatLng[] = [
  [0, 0],
  [0, 10],
  [10, 10],
  [10, 8],
  [2, 8],
  [2, 2],
  [10, 2],
  [10, 0],
];

test("pointInPolygon: inside, outside and the concave notch", () => {
  assert.equal(pointInPolygon([1, 5], C_SHAPE), true, "inside the spine");
  assert.equal(pointInPolygon([5, 9], C_SHAPE), true, "inside the top arm");
  assert.equal(pointInPolygon([5, 5], C_SHAPE), false, "the notch is outside");
  assert.equal(pointInPolygon([-1, 5], C_SHAPE), false, "below the shape");
  assert.equal(pointInPolygon([20, 20], C_SHAPE), false, "far away");
});

test("pointInPolygon: real Toronto coordinates against a drawn downtown box", () => {
  // Roughly King West through the Distillery District.
  const downtown: LatLng[] = [
    [43.630, -79.410],
    [43.660, -79.410],
    [43.660, -79.350],
    [43.630, -79.350],
  ];
  assert.equal(pointInPolygon([43.6453, -79.3971], downtown), true, "480 King St W");
  assert.equal(pointInPolygon([43.6983, -79.4284], downtown), false, "Forest Hill is north-west");
  assert.equal(pointInPolygon([49.2748, -123.1211], downtown), false, "Vancouver");
});

test("pointInPolygon: a degenerate ring never reports a hit", () => {
  assert.equal(pointInPolygon([1, 1], []), false);
  assert.equal(pointInPolygon([1, 1], [[0, 0], [0, 2]]), false);
});

test("parseCoTenants: round-trips, and survives junk", () => {
  const rows = [{ name: "Ada", email: "ada@example.com", relationship: "Partner" }];
  assert.deepEqual(parseCoTenants(JSON.stringify(rows)), rows);

  assert.deepEqual(parseCoTenants(undefined), [], "nothing stored yet");
  assert.deepEqual(parseCoTenants(""), [], "empty string");
  assert.deepEqual(parseCoTenants("not json"), [], "unparseable");
  assert.deepEqual(parseCoTenants('{"name":"Ada"}'), [], "an object, not an array");
  assert.deepEqual(parseCoTenants("[null,3]"), [], "non-objects are dropped");
  assert.deepEqual(
    parseCoTenants('[{"name":"Ada"}]'),
    [{ name: "Ada", email: "", relationship: "" }],
    "missing keys become empty strings, never undefined",
  );
  assert.deepEqual(parseCoTenants('[{"name":"","email":"","relationship":""}]'), [], "blank rows dropped");
});

test("upsertRow: edits in place, and grows into an empty list", () => {
  assert.deepEqual(
    upsertRow([], 0, { name: "Ada" }),
    [{ name: "Ada", email: "", relationship: "" }],
    "typing into the rendered blank row creates it",
  );

  const two = upsertRow(upsertRow([], 0, { name: "Ada" }), 1, { name: "Grace" });
  assert.equal(two.length, 2);
  assert.equal(two[1].name, "Grace");

  const edited = upsertRow(two, 0, { email: "ada@example.com" });
  assert.equal(edited[0].name, "Ada", "patching one field keeps the others");
  assert.equal(edited[0].email, "ada@example.com");
  assert.equal(edited[1].name, "Grace", "other rows untouched");
});

test("usableCoTenants: drops blanks and caps a co-signer at one", () => {
  const rows = [
    { name: "Ada", email: "", relationship: "Partner" },
    { name: "", email: "", relationship: "" },
    { name: "", email: "grace@example.com", relationship: "" },
  ];
  assert.deepEqual(
    usableCoTenants(rows, "co_tenants").map(r => r.name || r.email),
    ["Ada", "grace@example.com"],
    "an email alone is enough to keep a row",
  );
  assert.equal(usableCoTenants(rows, "co_signed").length, 1, "one co-signer only");
  assert.deepEqual(usableCoTenants([{ name: "  ", email: " ", relationship: "x" }], "co_tenants"), [],
    "whitespace is not a name");
});

test("tenancySummary: done only when the answer is actually usable", () => {
  assert.equal(tenancySummary("", []).done, false, "nothing chosen yet");
  assert.equal(tenancySummary("individual", []).done, true, "'just me' needs nobody else");
  assert.equal(tenancySummary("co_signed", []).done, false, "an unnamed co-signer is not an answer");
  assert.match(tenancySummary("co_signed", []).detail, /add their details/);

  const named = tenancySummary("co_tenants", [{ name: "Ada", email: "", relationship: "Partner" }]);
  assert.equal(named.done, true);
  assert.match(named.detail, /Ada/);
  assert.match(tenancySummary("co_tenants", [{ name: "", email: "x@y.co", relationship: "" }]).detail, /Unnamed/);
});
