import { Router } from "express";
import { redactSchema } from "../lib/schemas";
import { validate } from "../middleware/http";

const router = Router();

// Order matters: SIN before phone so 9-digit IDs are not half-consumed.
const RULES: Array<[string, RegExp]> = [
  ["email", /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g],
  ["sin", /(?<!\d)\d{3}[\s-]\d{3}[\s-]\d{3}(?!\d)/g],
  ["phone", /(?<!\d)(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/g],
  ["postal_code", /\b[A-Za-z]\d[A-Za-z][\s-]?\d[A-Za-z]\d\b/g],
  ["signature", /^.*\b(?:signed|signature|witness)\b.*$/gim],
  ["name", /\b(?:landlord|tenant|lessor|lessee)s?\s*(?:name)?\s*[:\-]\s*[^\n,;]+/gi],
];

router.post("/redact", validate(redactSchema), (req, res) => {
  let text: string = req.body.text;
  const counts: Record<string, number> = {};
  for (const [key, re] of RULES) {
    text = text.replace(re, () => {
      counts[key] = (counts[key] ?? 0) + 1;
      return `[REDACTED ${key.toUpperCase()}]`;
    });
  }
  res.json({ success: true, data: { redactedText: text, redactions: counts } });
});

export default router;
