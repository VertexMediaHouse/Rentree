import { Router } from "express";
import { db } from "../lib/db";
import { requireAuth } from "../middleware/http";

const router = Router();

const view = (n: {
  id: string; kind: string; title: string; body: string;
  href: string | null; readAt: Date | null; createdAt: Date;
}) => ({
  id: n.id,
  kind: n.kind.toLowerCase(),
  title: n.title,
  body: n.body,
  href: n.href ?? undefined,
  read: n.readAt !== null,
  createdAt: n.createdAt.toISOString(),
});

/** The bell. Capped rather than paginated: nobody scrolls past 50 notifications. */
router.get("/", requireAuth(), async (req, res) => {
  const [rows, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: req.auth!.sub },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.notification.count({ where: { userId: req.auth!.sub, readAt: null } }),
  ]);
  res.json({ success: true, data: { notifications: rows.map(view), unread } });
});

/**
 * Marks one notification read, or all of them when no id is given.
 *
 * Scoped to the caller's own rows via updateMany, so a guessed id belonging to someone else
 * matches nothing rather than 404-ing and confirming it exists.
 */
router.post("/read", requireAuth(), async (req, res) => {
  const id = typeof req.body?.id === "string" ? req.body.id : null;
  const { count } = await db.notification.updateMany({
    where: { userId: req.auth!.sub, readAt: null, ...(id ? { id } : {}) },
    data: { readAt: new Date() },
  });
  res.json({ success: true, data: { marked: count } });
});

export default router;
