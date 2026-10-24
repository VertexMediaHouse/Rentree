import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { db } from "../lib/db";
import { dbIntent } from "../lib/enums";
import { leadSchema } from "../lib/schemas";
import { validate } from "../middleware/http";

const router = Router();

// Public endpoint: throttle harder than the global limiter to blunt list-stuffing.
router.post("/", rateLimit({ windowMs: 60 * 60_000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false }), validate(leadSchema), async (req, res) => {
  const email = req.body.email.trim().toLowerCase();
  const intents = req.body.intents.map(dbIntent);
  const existing = await db.lead.findUnique({ where: { email }, select: { intents: true } });

  // Idempotent: merge intents rather than creating duplicates or revealing prior signup
  await db.lead.upsert({
    where: { email },
    update: {
      intents: [...new Set([...(existing?.intents ?? []), ...intents])],
      ...(req.body.city ? { city: req.body.city } : {}),
      ...(req.body.reportSnapshot ? { reportSnapshot: req.body.reportSnapshot } : {}),
    },
    create: {
      email,
      intents,
      city: req.body.city ?? null,
      reportSnapshot: req.body.reportSnapshot ?? null,
    },
  });
  res.status(202).json({ success: true });
});

export default router;
