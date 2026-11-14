import assert from "node:assert/strict";
import test from "node:test";
import { readDocument, readDocuments } from "../lib/ocr";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
const realFetch = globalThis.fetch;

function stubFetch(body: unknown, status = 200) {
  globalThis.fetch = (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;
}

test("validates before calling the provider", async () => {
  process.env.OCR_API_KEY = "test-key";
  globalThis.fetch = (async () => {
    throw new Error("provider must not be called");
  }) as typeof fetch;

  await assert.rejects(readDocument(new Uint8Array(), "a.png", "image/png"), /empty/i);
  await assert.rejects(readDocument(new Uint8Array(2 * 1024 * 1024), "a.png", "image/png"), /too large/i);
  await assert.rejects(readDocument(png, "a.exe", "application/x-msdownload"), /Cannot read/i);
  globalThis.fetch = realFetch;
});

test("missing key is a 503, not a provider call", async () => {
  delete process.env.OCR_API_KEY;
  await assert.rejects(readDocument(png, "a.png", "image/png"), /not configured/i);
});

test("joins pages and strips carriage returns", async () => {
  process.env.OCR_API_KEY = "test-key";
  stubFetch({ ParsedResults: [{ ParsedText: "page one\r\n" }, { ParsedText: " page two " }] });
  const r = await readDocument(png, "a.png", "image/png; charset=binary");
  assert.deepEqual(r.pages, ["page one", "page two"]);
  assert.equal(r.text, "page one\n\npage two");
  globalThis.fetch = realFetch;
});

test("provider error and blank text both surface as unreadable", async () => {
  process.env.OCR_API_KEY = "test-key";
  stubFetch({ IsErroredOnProcessing: true, ErrorMessage: ["bad file"] });
  await assert.rejects(readDocument(png, "a.png", "image/png"), /could not be read/i);

  stubFetch({ ParsedResults: [{ ParsedText: "   " }] });
  await assert.rejects(readDocument(png, "a.png", "image/png"), /No text found/i);
  globalThis.fetch = realFetch;
});

test("batch keeps going past a failure", async () => {
  process.env.OCR_API_KEY = "test-key";
  stubFetch({ ParsedResults: [{ ParsedText: "ok" }] });
  const out = await readDocuments([
    { bytes: png, filename: "good.png", mimeType: "image/png" },
    { bytes: png, filename: "bad.exe", mimeType: "application/x-msdownload" },
  ]);
  assert.equal(out[0].text, "ok");
  assert.match(out[1].error!, /Cannot read/i);
  globalThis.fetch = realFetch;
});
