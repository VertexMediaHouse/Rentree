import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";

process.env.AUTH_SECRET = "test-secret";

// These tests write to the database named by DATABASE_URL and truncate every table first, so
// point it at a throwaway database — never a development one you care about.
//   createdb rentre_test
//   DATABASE_URL=postgresql://…/rentre_test DIRECT_URL=postgresql://…/rentre_test \
//     npx prisma migrate deploy && npm test
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. These tests need a throwaway Postgres database.");
  process.exit(1);
}

const { createApp } = await import("../app");
const { db } = await import("../lib/db");

// One statement so foreign keys never block the order, and identities restart for stable output.
await db.$executeRawUnsafe(`
  TRUNCATE TABLE
    "addon_requests", "passport_accesses", "shared_passports", "leases",
    "screening_checks", "screening_opt_ins", "applications", "listings",
    "documents", "tenant_profiles", "otp_codes", "leads", "users"
  RESTART IDENTITY CASCADE
`);

const server = createApp().listen(0);
const base = `http://localhost:${(server.address() as AddressInfo).port}`;
test.after(async () => {
  server.close();
  await db.$disconnect();
});

const call = async (method: string, url: string, body?: unknown, token?: string) => {
  const res = await fetch(base + url, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: res.status === 204 ? null : await res.json() };
};

test("mortgage endpoint validates input and rejects insufficient down payment", async () => {
  const bad = await call("POST", "/api/calculate/mortgage", { price: -5 });
  assert.equal(bad.status, 400);
  const low = await call("POST", "/api/calculate/mortgage", {
    price: 750_000, down: 10_000, province: "ON", amortization: 25, rate: 5, grossIncome: 150_000,
  });
  assert.equal(low.status, 400);
  const ok = await call("POST", "/api/calculate/mortgage", {
    price: 750_000, down: 100_000, province: "ON", amortization: 25, rate: 5.29, grossIncome: 150_000,
    isFirstTimeBuyer: true, inToronto: true,
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.data.insured, true);
});

test("auth, listing ownership and private applications", async () => {
  const pw = "correct-horse-battery";
  const ll = await call("POST", "/api/auth/register", { email: "l@x.ca", password: pw, name: "Lee", role: "landlord" });
  const tn = await call("POST", "/api/auth/register", { email: "t@x.ca", password: pw, name: "Tam", role: "tenant" });
  assert.equal(ll.status, 201);
  const [lt, tt] = [ll.json.data.token, tn.json.data.token];

  assert.equal((await call("POST", "/api/auth/login", { email: "t@x.ca", password: "wrong-password" })).status, 401);
  assert.equal((await call("GET", "/api/applications")).status, 401);
  assert.equal((await call("POST", "/api/listings", {}, tt)).status, 403);

  const listing = await call("POST", "/api/listings", {
    address: "1 Main", neighbourhood: "Core", city: "Toronto", price: 2000, unitType: "1br", bedrooms: 1,
    bathrooms: 1, sqft: 600, yearBuilt: 2020, rentControlled: false, moveIn: "Now", leaseTerm: "12 months",
    image: "https://example.com/a.jpg", id: "hijack", ownerId: "hijack",
  }, lt);
  assert.equal(listing.status, 201);
  assert.notEqual(listing.json.data.id, "hijack");

  const app1 = await call("POST", "/api/applications", { listingId: listing.json.data.id }, tt);
  assert.equal(app1.status, 201);
  assert.equal((await call("POST", "/api/applications", { listingId: listing.json.data.id }, tt)).status, 409);
  assert.equal((await call("GET", "/api/applications", undefined, tt)).json.count, 1);
  assert.equal((await call("GET", "/api/applications", undefined, lt)).json.count, 1);
  assert.equal((await call("PATCH", `/api/applications/${app1.json.data.id}/status`, { status: "approved" }, tt)).status, 403);
  assert.equal((await call("PATCH", `/api/applications/${app1.json.data.id}/status`, { status: "approved" }, lt)).status, 200);
});

test("unknown routes and bad JSON return JSON errors", async () => {
  assert.equal((await call("GET", "/api/nope")).status, 404);
  const res = await fetch(base + "/api/calculate/mortgage", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{bad",
  });
  assert.equal(res.status, 400);
});

test("rent and deal scores", async () => {
  const fair = await call("POST", "/api/calculate/rent-score", { city: "Toronto", unitType: "1br", rent: 1500 });
  assert.equal(fair.status, 200);
  assert.equal(fair.json.data.label, "Excellent deal");
  const over = await call("POST", "/api/calculate/deal-score", { city: "Toronto", unitType: "studio", rent: 2600, sqft: 400 });
  assert.equal(over.json.data.label, "Overpriced");
  assert.equal(over.json.data.aboveMarket, true);
  assert.equal((await call("POST", "/api/calculate/rent-score", { city: "Nowhere", unitType: "1br", rent: 1500 })).status, 400);
  assert.equal((await call("POST", "/api/calculate/rent-score", { city: "Toronto", unitType: "castle", rent: 1500 })).status, 400);
});

test("leads are idempotent; lease redaction strips PII", async () => {
  assert.equal((await call("POST", "/api/leads", { email: "A@x.ca", intents: ["rent_alerts"] })).status, 202);
  assert.equal((await call("POST", "/api/leads", { email: "a@x.ca", intents: ["save_report"] })).status, 202);
  assert.equal((await call("POST", "/api/leads", { email: "bad", intents: [] })).status, 400);
  const r = await call("POST", "/api/lease/redact", { text: "Tenant: Jane Doe\nCall 416-555-0199 or jane@x.ca. SIN 123-456-789. M5V 2T6\nSigned: Jane" });
  const t = r.json.data.redactedText as string;
  for (const leak of ["Jane", "416", "jane@x.ca", "123-456-789", "M5V"]) assert.ok(!t.includes(leak), leak);
});

test("tenant profile autosave merges, and listing PATCH keeps omitted fields", async () => {
  const pw = "correct-horse-battery";
  const tn = await call("POST", "/api/auth/register", { email: "p@x.ca", password: pw, name: "Pat", role: "tenant" });
  const ll = await call("POST", "/api/auth/register", { email: "pl@x.ca", password: pw, name: "Pl", role: "landlord" });
  const [tt, lt] = [tn.json.data.token, ll.json.data.token];
  await call("PUT", "/api/profile", { basics: { fullName: "Pat", email: "p@x.ca" } }, tt);
  const p = await call("PUT", "/api/profile", { basics: { phone: "(416) 555-0100", city: "Toronto" }, credit: { consent: true, status: "verified" } }, tt);
  assert.equal(p.json.data.sections.basics, "complete");
  assert.equal(p.json.data.sections.credit, "pending"); // client cannot self-verify
  assert.equal(p.json.data.tier, "incomplete");
  assert.equal((await call("GET", "/api/profile", undefined, lt)).status, 403);

  const l = await call("POST", "/api/listings", {
    address: "2 Main", neighbourhood: "Core", city: "Toronto", price: 2000, unitType: "1br", bedrooms: 1, bathrooms: 1,
    sqft: 600, yearBuilt: 2020, rentControlled: false, moveIn: "Now", leaseTerm: "12 months",
    image: "https://example.com/a.jpg", photos: ["https://example.com/b.jpg"],
  }, lt);
  const id = l.json.data.id;
  const patched = await call("PATCH", `/api/listings/${id}`, { price: 2100 }, lt);
  assert.equal(patched.json.data.price, 2100);
  assert.equal(patched.json.data.photos.length, 1);
  assert.equal((await call("GET", "/api/listings/mine", undefined, lt)).json.count, 1);
  assert.equal((await call("PATCH", `/api/listings/${id}`, { price: 1 }, tt)).status, 403);
});

test("passport share sends one email and the link resolves to the shared snapshot", async () => {
  process.env.RESEND_API_KEY = "test-key";
  const realFetch = globalThis.fetch;
  const sent: any[] = [];
  globalThis.fetch = (async (url: any, init?: any) => {
    if (String(url).startsWith("https://api.resend.com")) {
      sent.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ id: "em_1" }), { status: 200 });
    }
    return realFetch(url, init);
  }) as typeof fetch;
  try {
    const share = { recipientName: "Maria <b>", recipientEmail: "Maria@Landlord.ca", recipientUnit: "Unit 204",
      passport: { name: "Jay", email: "jay@x.ca", budgetMax: "2400", landlordPhone: "4165550100", ssn: "should-be-stripped" } };
    assert.equal((await call("POST", "/api/passport/share", share)).status, 401, "signed-out users cannot send");
    const tt = (await call("POST", "/api/auth/register", { email: "jay@x.ca", password: "correct-horse-battery", name: "Jay", role: "tenant" })).json.data.token;

    const bad = await call("POST", "/api/passport/share", { recipientName: "M", recipientEmail: "nope", passport: {} }, tt);
    assert.equal(bad.status, 400);

    const r = await call("POST", "/api/passport/share", share, tt);
    assert.equal(r.status, 201);
    assert.equal(sent.length, 1);
    assert.deepEqual(sent[0].to, ["maria@landlord.ca"]);
    assert.equal(sent[0].reply_to, "jay@x.ca");
    assert.ok(sent[0].html.includes(r.json.data.url));
    assert.ok(!sent[0].html.includes("<b>"), "recipient name must be escaped");

    const view = await call("GET", `/api/passport/${r.json.data.token}`);
    assert.equal(view.status, 200);
    assert.equal(view.json.data.passport.name, "Jay");
    assert.equal(view.json.data.passport.ssn, undefined);
    assert.equal(view.json.data.passport.landlordPhone, undefined, "reference phone stays hidden");
    assert.equal((await call("GET", "/api/passport/not-a-token")).status, 404);

    // Provider unreachable (DNS/network) is a clean 502, not a 500
    globalThis.fetch = (async (url: any, init?: any) => {
      if (String(url).startsWith("https://api.resend.com")) throw new TypeError("fetch failed");
      return realFetch(url, init);
    }) as typeof fetch;
    assert.equal((await call("POST", "/api/passport/share", share, tt)).status, 502);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("screening opt-ins gate AI calls; lease is signed by both parties", async () => {
  Object.assign(process.env, {
    RESEND_API_KEY: "test-key", ELEVENLABS_API_KEY: "el-key", ELEVENLABS_PHONE_NUMBER_ID: "ph_1",
    ELEVENLABS_REFERENCE_AGENT_ID: "ag_ref", ELEVENLABS_INTERVIEW_AGENT_ID: "ag_int",
  });
  const realFetch = globalThis.fetch;
  const emails: any[] = [], calls: any[] = [];
  globalThis.fetch = (async (url: any, init?: any) => {
    const u = String(url);
    if (u.startsWith("https://api.resend.com")) { emails.push(JSON.parse(init.body)); return Response.json({ id: "em" }); }
    if (u.endsWith("/convai/twilio/outbound-call")) { calls.push(JSON.parse(init.body)); return Response.json({ success: true, conversation_id: `conv_${calls.length}` }); }
    if (u.includes("/convai/conversations/conv_1")) return Response.json({ status: "done", analysis: { transcript_summary: "Glowing reference", call_successful: "success" }, transcript: [{ role: "agent", message: "Hi" }, { role: "user", message: null }] });
    if (u.includes("/convai/conversations/conv_2")) return Response.json({ status: "in-progress" });
    return realFetch(url, init);
  }) as typeof fetch;
  try {
    const pw = "correct-horse-battery";
    const lt = (await call("POST", "/api/auth/register", { email: "sl@x.ca", password: pw, name: "Sam Landlord", role: "landlord" })).json.data.token;
    const tt = (await call("POST", "/api/auth/register", { email: "st@x.ca", password: pw, name: "Sky Tenant", role: "tenant" })).json.data.token;
    const listing = (await call("POST", "/api/listings", {
      address: "9 Bay St", neighbourhood: "Core", city: "Toronto", price: 2500, unitType: "1br", bedrooms: 1, bathrooms: 1,
      sqft: 600, yearBuilt: 2020, rentControlled: false, moveIn: "Now", leaseTerm: "12 months", image: "https://example.com/a.jpg",
    }, lt)).json.data;
    const id = (await call("POST", "/api/applications", { listingId: listing.id }, tt)).json.data.id;

    assert.equal((await call("POST", `/api/applications/${id}/checks`, { type: "reference" }, lt)).status, 409, "no consent yet");
    assert.equal((await call("PUT", `/api/applications/${id}/opt-in`, { interview: { phone: "123" } }, tt)).status, 400);
    const opt = await call("PUT", `/api/applications/${id}/opt-in`, { reference: { name: "Old LL", phone: "(416) 555-0100", relationship: "Previous landlord" }, report: true }, tt);
    assert.equal(opt.json.data.reference.phone, "+14165550100");
    assert.equal((await call("PUT", `/api/applications/${id}/opt-in`, {}, lt)).status, 403);

    const ref = await call("POST", `/api/applications/${id}/checks`, { type: "reference" }, lt);
    assert.equal(ref.status, 201);
    assert.equal(calls[0].agent_id, "ag_ref");
    assert.equal(calls[0].to_number, "+14165550100");
    assert.equal(calls[0].conversation_initiation_client_data.dynamic_variables.tenant_name, "Sky Tenant");
    assert.equal((await call("POST", `/api/applications/${id}/checks`, { type: "reference" }, lt)).status, 409, "no duplicate calls");
    assert.equal((await call("POST", `/api/applications/${id}/checks`, { type: "interview" }, lt)).status, 409, "interview not opted in");
    assert.equal((await call("POST", `/api/applications/${id}/checks`, { type: "report" }, lt)).status, 501, "provider placeholder");

    const checks = await call("GET", `/api/applications/${id}/checks`, undefined, lt);
    assert.equal(checks.json.data[0].status, "done");
    assert.equal(checks.json.data[0].summary, "Glowing reference");
    assert.equal(checks.json.data[0].transcript.length, 1);
    assert.equal((await call("GET", `/api/applications/${id}/checks`, undefined, tt)).status, 403);

    // Lists never carry call results, and landlords never see reference/interview phone numbers
    const llApp = (await call("GET", "/api/applications", undefined, lt)).json.data.find((a: any) => a.id === id);
    assert.equal(llApp.checks, undefined);
    assert.equal(llApp.optIns.reference.phone, undefined);
    assert.equal(llApp.optIns.reference.name, "Old LL");
    const tnApp = (await call("GET", "/api/applications", undefined, tt)).json.data.find((a: any) => a.id === id);
    assert.equal(tnApp.checks, undefined, "tenant can't read what the reference said");
    assert.equal(tnApp.optIns.reference.phone, "+14165550100");

    // A call with no result after an hour is marked failed so it can be requested again
    await call("PUT", `/api/applications/${id}/opt-in`, { interview: { phone: "416-555-0199" } }, tt);
    assert.equal((await call("POST", `/api/applications/${id}/checks`, { type: "interview" }, lt)).status, 201);
    assert.equal((await call("GET", `/api/applications/${id}/checks`, undefined, lt)).json.data[1].status, "calling");
    const interviewCheck = await db.screeningCheck.findFirstOrThrow({
      where: { applicationId: id, step: "INTERVIEW" },
      orderBy: { createdAt: "desc" },
    });
    await db.screeningCheck.update({
      where: { id: interviewCheck.id },
      data: { createdAt: new Date(Date.now() - 2 * 3600_000) },
    });
    assert.equal((await call("GET", `/api/applications/${id}/checks`, undefined, lt)).json.data[1].status, "failed");
    assert.equal((await call("POST", `/api/applications/${id}/checks`, { type: "interview" }, lt)).status, 201, "retry allowed");

    const terms = { applicationId: id, startDate: "2026-11-01", monthlyRent: 2500, terms: "Standard terms.", signatureName: "Sam Landlord" };
    assert.equal((await call("POST", "/api/leases", { ...terms, endDate: "2026-10-01" }, lt)).status, 400, "end before start");
    assert.equal((await call("POST", "/api/leases", terms, lt)).status, 409, "must approve first");
    await call("PATCH", `/api/applications/${id}/status`, { status: "approved" }, lt);
    const lease = await call("POST", "/api/leases", terms, lt);
    assert.equal(lease.status, 201);
    assert.deepEqual(emails.at(-1).to, ["st@x.ca"]);
    assert.ok(emails.at(-1).html.includes(lease.json.data.url));

    const token = lease.json.data.token;
    const viewed = (await call("GET", `/api/leases/${token}`)).json.data;
    assert.equal(viewed.landlordSignature.ip, undefined);
    assert.equal(viewed.tenantSignature, undefined);
    assert.equal((await call("POST", `/api/leases/${token}/sign`, { signatureName: "Sky Tenant" })).status, 400, "must agree");
    await call("PATCH", `/api/applications/${id}/status`, { status: "declined" }, lt);
    assert.equal((await call("POST", `/api/leases/${token}/sign`, { signatureName: "Sky Tenant", agree: true })).status, 409, "declined application cancels the lease");
    await call("PATCH", `/api/applications/${id}/status`, { status: "approved" }, lt);
    const before = emails.length;
    const signed = await call("POST", `/api/leases/${token}/sign`, { signatureName: "Sky Tenant", agree: true });
    assert.equal(signed.status, 200);
    assert.equal(signed.json.data.tenantSignature.name, "Sky Tenant");
    assert.equal(emails.length - before, 2, "confirmation to both parties");
    assert.equal((await call("POST", `/api/leases/${token}/sign`, { signatureName: "X", agree: true })).status, 409);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("email OTP sign-in: code is emailed, single-use, attempt-limited, and yields a session", async () => {
  process.env.RESEND_API_KEY = "test-key";
  const realFetch = globalThis.fetch;
  const codes: string[] = [];
  globalThis.fetch = (async (url: any, init?: any) => {
    if (String(url).startsWith("https://api.resend.com")) {
      codes.push(JSON.parse(init.body).subject.slice(0, 6));
      return new Response(JSON.stringify({ id: "em_otp" }), { status: 200 });
    }
    return realFetch(url, init);
  }) as typeof fetch;
  try {
    const email = "New.Renter@x.ca";
    assert.equal((await call("POST", "/api/auth/otp/request", { email, name: "Nia" })).status, 202);
    assert.match(codes[0], /^\d{6}$/);
    assert.equal((await call("POST", "/api/auth/otp/request", { email })).status, 429, "resend cooldown");

    const wrong = codes[0] === "000000" ? "111111" : "000000";
    assert.equal((await call("POST", "/api/auth/otp/verify", { email, code: wrong })).status, 400);
    const ok = await call("POST", "/api/auth/otp/verify", { email: "new.renter@x.ca", code: codes[0] });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.data.user.name, "Nia");
    assert.equal(ok.json.data.user.passwordHash, undefined);
    assert.equal((await call("GET", "/api/auth/me", undefined, ok.json.data.token)).status, 200);
    assert.equal((await call("POST", "/api/auth/otp/verify", { email, code: codes[0] })).status, 400, "single use");

    // Brute force: the 6th guess is refused even if correct
    await call("POST", "/api/auth/otp/request", { email: "brute@x.ca" });
    const real = codes[1];
    const miss = real === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) await call("POST", "/api/auth/otp/verify", { email: "brute@x.ca", code: miss });
    assert.equal((await call("POST", "/api/auth/otp/verify", { email: "brute@x.ca", code: real })).status, 429);
  } finally {
    globalThis.fetch = realFetch;
  }
});
