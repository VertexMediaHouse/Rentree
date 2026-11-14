import { Router } from "express";
import type { Listing, Prisma } from "@prisma/client";
import { db, daysSince, notDeleted } from "../lib/db";
import { HttpError } from "../lib/errors";
import { createListingSchema, updateListingSchema } from "../lib/schemas";
import { requireAuth, validate } from "../middleware/http";
import { calculateMatchScore } from "../services/matchCalculator";

const router = Router();

type Scores = { price: number; location: number; transit: number; walkability: number; amenities: number; space: number };

/** Strips internals and restores the shape clients already expect (price as a number, postedDays). */
const present = ({ ownerId, createdAt, updatedAt, deletedAt, price, bathrooms, ...l }: Listing) => ({
  ...l,
  price: Number(price),
  bathrooms: Number(bathrooms),
  postedDays: daysSince(createdAt),
});

const num = (v: unknown): number | undefined => {
  if (typeof v !== "string" || v.trim() === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new HttpError(400, `Invalid numeric query value "${v}"`);
  return n;
};

router.get("/", async (req, res) => {
  const { city, priorities, sort } = req.query;
  const minPrice = num(req.query.minPrice);
  const maxPrice = num(req.query.maxPrice);
  const page = Math.max(1, Math.floor(num(req.query.page) ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(num(req.query.limit) ?? 20)));

  const where: Prisma.ListingWhereInput = {
    ...notDeleted,
    ...(typeof city === "string" && city.toLowerCase() !== "all"
      ? { city: { equals: city, mode: "insensitive" } }
      : {}),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? { price: { ...(minPrice !== undefined && { gte: minPrice }), ...(maxPrice !== undefined && { lte: maxPrice }) } }
      : {}),
  };

  const priorityList = typeof priorities === "string" ? priorities.split(",").map((p) => p.trim()).filter(Boolean) : [];

  // Match score is computed from a JSON column, so it cannot be ordered or paged in SQL. When
  // priorities are supplied and that ordering is what the client wants, rank the matching set in
  // memory; every other ordering is paged by the database.
  if (priorityList.length > 0 && sort !== "newest" && sort !== "price_asc" && sort !== "price_desc") {
    const all = await db.listing.findMany({ where, orderBy: { createdAt: "desc" } });
    const ranked = all
      .map((l) => ({ ...present(l), dynamicMatchScore: calculateMatchScore(l.scores as unknown as Scores, { priorities: priorityList }) }))
      .sort((a, b) => b.dynamicMatchScore - a.dynamicMatchScore);
    return res.json({
      success: true,
      count: ranked.length,
      page,
      limit,
      data: ranked.slice((page - 1) * limit, page * limit),
    });
  }

  const orderBy: Prisma.ListingOrderByWithRelationInput =
    sort === "price_asc" ? { price: "asc" } : sort === "price_desc" ? { price: "desc" } : { createdAt: "desc" };

  const [total, rows] = await Promise.all([
    db.listing.count({ where }),
    db.listing.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
  ]);

  const data = rows.map((l) =>
    priorityList.length > 0
      ? { ...present(l), dynamicMatchScore: calculateMatchScore(l.scores as unknown as Scores, { priorities: priorityList }) }
      : present(l)
  );
  res.json({ success: true, count: total, page, limit, data });
});

// Must precede "/:id" so "mine" is not treated as an id
router.get("/mine", requireAuth("landlord"), async (req, res) => {
  const rows = await db.listing.findMany({
    where: { ownerId: req.auth!.sub, ...notDeleted },
    orderBy: { createdAt: "desc" },
  });
  res.json({ success: true, count: rows.length, data: rows.map(present) });
});

router.get("/:id", async (req, res) => {
  const listing = await db.listing.findFirst({ where: { id: req.params.id as string, ...notDeleted } });
  if (!listing) throw new HttpError(404, "Listing not found");
  res.json({ success: true, data: present(listing) });
});

router.post("/", requireAuth("landlord"), validate(createListingSchema), async (req, res) => {
  const owner = await db.user.findUnique({ where: { id: req.auth!.sub }, select: { name: true } });
  const listing = await db.listing.create({
    data: {
      ...req.body,
      ownerId: req.auth!.sub,
      landlord: owner?.name ?? "Landlord",
      scores: req.body.scores ?? { price: 5, location: 5, transit: 5, walkability: 5, amenities: 5, space: 5 },
    },
  });
  res.status(201).json({ success: true, data: present(listing) });
});

router.patch("/:id", requireAuth("landlord"), validate(updateListingSchema), async (req, res) => {
  const id = req.params.id as string;
  const listing = await db.listing.findFirst({ where: { id, ...notDeleted }, select: { ownerId: true } });
  if (!listing) throw new HttpError(404, "Listing not found");
  if (listing.ownerId !== req.auth!.sub) throw new HttpError(403, "Not your listing");
  const updated = await db.listing.update({ where: { id }, data: req.body });
  res.json({ success: true, data: present(updated) });
});

router.delete("/:id", requireAuth("landlord"), async (req, res) => {
  const id = req.params.id as string;
  const listing = await db.listing.findFirst({ where: { id, ...notDeleted }, select: { ownerId: true } });
  if (!listing) throw new HttpError(404, "Listing not found");
  if (listing.ownerId !== req.auth!.sub) throw new HttpError(403, "Not your listing");
  // Soft delete: existing applications still reference this listing.
  await db.listing.update({ where: { id }, data: { deletedAt: new Date() } });
  res.status(204).end();
});

export default router;
