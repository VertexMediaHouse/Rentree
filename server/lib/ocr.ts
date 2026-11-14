import { BlobPart } from "buffer";
import { HttpError } from "./errors";

const ENDPOINT = "https://api.ocr.space/parse/image";
const MAX_BYTES = 1024 * 1024;

const ACCEPTED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/tiff",
  "image/bmp",
  "image/webp",
]);

export interface OcrResult {
  text: string;
  pages: string[];
}

interface OcrSpaceResponse {
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
  OCRExitCode?: number;
  ParsedResults?: { ParsedText?: string; ErrorMessage?: string }[];
}

/*
 * Reads text out of one document.
 */

export async function readDocument(
  bytes: Uint8Array | ArrayBuffer,
  filename: string,
  mimeType: string,
): Promise<OcrResult> {
  const key = process.env.OCR_API_KEY;
  if (!key) throw new HttpError(503, "Document reading is not configured (OCR_API_KEY missing)");

  const data = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  if (data.byteLength === 0) throw new HttpError(400, "Document is empty");
  if (data.byteLength > MAX_BYTES) {
    throw new HttpError(413, `Document is too large to read (max ${MAX_BYTES / 1024}KB)`);
  }
  const type = mimeType.split(";")[0].trim().toLowerCase();
  if (!ACCEPTED.has(type)) throw new HttpError(415, `Cannot read ${type || "this file type"}`);

  const form = new FormData();
  form.set("file", new Blob([data as BlobPart], { type }), filename || "document");
  form.set("language", "eng");
  form.set("isOverlayRequired", "false");
  form.set("scale", "true"); // upscales low-res scans; markedly better on phone photos of IDs
  form.set("OCREngine", "2"); // engine 2 handles rotated and noisy scans better than the default
  form.set("isTable", "false");

  const res = await fetch(ENDPOINT, { method: "POST", headers: { apikey: key }, body: form }).catch((err) => {
    console.error("OCR provider unreachable:", err.cause?.code ?? err.message);
    throw new HttpError(502, "Document reader could not be reached. Try again.");
  });

  if (!res.ok) {
    console.error("OCR provider error", res.status, (await res.text()).slice(0, 300));
    throw new HttpError(res.status === 403 ? 503 : 502, "Document reader request failed");
  }

  const body = (await res.json()) as OcrSpaceResponse;
  if (body.IsErroredOnProcessing || !body.ParsedResults?.length) {
    const msg = Array.isArray(body.ErrorMessage) ? body.ErrorMessage.join("; ") : body.ErrorMessage;
    console.error("OCR provider rejected document:", msg ?? "no parsed results");
    throw new HttpError(422, "Document could not be read. Try a clearer scan.");
  }

  const pages = body.ParsedResults.map((p) => (p.ParsedText ?? "").replace(/\r\n/g, "\n").trim());
  const text = pages.filter(Boolean).join("\n\n").trim();
  if (!text) throw new HttpError(422, "No text found in document. Try a clearer scan.");
  return { text, pages };
}

/**
 * Reads several documents, keeping one failure from sinking the rest — the caller decides what
 * a partial read means. Sequential on purpose: the free tier rate-limits concurrent calls.
 */
export async function readDocuments(
  files: { bytes: Uint8Array | ArrayBuffer; filename: string; mimeType: string }[],
): Promise<{ filename: string; text?: string; pages?: string[]; error?: string }[]> {
  const out: { filename: string; text?: string; pages?: string[]; error?: string }[] = [];
  for (const f of files) {
    try {
      const r = await readDocument(f.bytes, f.filename, f.mimeType);
      out.push({ filename: f.filename, text: r.text, pages: r.pages });
    } catch (err) {
      out.push({ filename: f.filename, error: err instanceof HttpError ? err.message : "Document could not be read" });
    }
  }
  return out;
}
