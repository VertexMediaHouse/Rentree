import { Router } from "express";
import { db } from "../lib/db";
import { HttpError } from "../lib/errors";
import { saveBuildingSchema, uploadRentRollSchema } from "../lib/schemas";
import { notifyAll } from "../services/notifications";
import { requireAuth, validate } from "../middleware/http";

const router = Router();

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const day = (s?: string) => (s ? new Date(`${s}T00:00:00Z`) : null);

const entryView = (e: {
  id: string; unit: string; bedrooms: number; rent: unknown; vacant: boolean;
  availableFrom: Date | null; leaseEnd: Date | null;
}) => ({
  id: e.id,
  unit: e.unit,
  bedrooms: e.bedrooms,
  rent: Number(e.rent),
  vacant: e.vacant,
  availableFrom: e.availableFrom ? isoDay(e.availableFrom) : undefined,
  leaseEnd: e.leaseEnd ? isoDay(e.leaseEnd) : undefined,
});

/** The landlord owns this listing, or the request does not proceed. */
async function ownedListing(listingId: string, ownerId: string) {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { id: true, ownerId: true, address: true, unit: true, neighbourhood: true, city: true, deletedAt: true },
  });
  if (!listing || listing.deletedAt) throw new HttpError(404, "Listing not found");
  if (listing.ownerId !== ownerId) throw new HttpError(403, "Not your listing");
  return listing;
}

/**
 * Replaces the rent roll for one listing.
 *
 * Rows are matched on unit number, so re-uploading a corrected roll updates in place rather than
 * duplicating the building. Units absent from the new upload are deleted: a rent roll is a
 * snapshot of the whole building, and silently keeping a unit the landlord removed would leave
 * stale vacancies firing notifications.
 */
router.post("/", requireAuth("landlord"), validate(uploadRentRollSchema), async (req, res) => {
  const listing = await ownedListing(req.body.listingId, req.auth!.sub);
  const entries: Array<{ unit: string; bedrooms: number; rent: number; vacant?: boolean; availableFrom?: string; leaseEnd?: string }> = req.body.entries;

  // Which units were already known to be vacant, so an upload that re-states the same vacancy
  // does not notify the same renters again.
  const before = await db.rentRollEntry.findMany({
    where: { listingId: listing.id },
    select: { unit: true, vacant: true },
  });
  const wasVacant = new Set(before.filter((e) => e.vacant).map((e) => e.unit));
  const keep = entries.map((e) => e.unit);

  await db.$transaction([
    db.rentRollEntry.deleteMany({ where: { listingId: listing.id, unit: { notIn: keep } } }),
    ...entries.map((e) =>
      db.rentRollEntry.upsert({
        where: { listingId_unit: { listingId: listing.id, unit: e.unit } },
        update: {
          bedrooms: e.bedrooms,
          rent: e.rent,
          vacant: e.vacant ?? false,
          availableFrom: day(e.availableFrom),
          leaseEnd: day(e.leaseEnd),
        },
        create: {
          listingId: listing.id,
          uploadedById: req.auth!.sub,
          unit: e.unit,
          bedrooms: e.bedrooms,
          rent: e.rent,
          vacant: e.vacant ?? false,
          availableFrom: day(e.availableFrom),
          leaseEnd: day(e.leaseEnd),
        },
      }),
    ),
  ]);

  const newlyVacant = entries.filter((e) => e.vacant && !wasVacant.has(e.unit));
  const notified = newlyVacant.length ? await notifyVacancies(listing, newlyVacant) : 0;

  const saved = await db.rentRollEntry.findMany({ where: { listingId: listing.id }, orderBy: { unit: "asc" } });
  res.status(201).json({
    success: true,
    data: { entries: saved.map(entryView), summary: summarise(saved), notified },
  });
});

/**
 * Tells watchers about units that just became vacant.
 *
 * A renter hears about a vacancy only when its availability falls inside their move-in window —
 * an unbounded window matches everything, which is the default for someone who just saved the
 * building. One notification per renter even when several units open at once: three emails for
 * one building in one upload is how a useful alert becomes an unsubscribe.
 */
async function notifyVacancies(
  listing: { id: string; address: string; unit: string | null; neighbourhood: string; city: string },
  vacancies: Array<{ unit: string; bedrooms: number; rent: number; availableFrom?: string }>,
) {
  const watchers = await db.savedBuilding.findMany({
    where: { listingId: listing.id },
    select: { userId: true, moveInFrom: true, moveInTo: true },
  });
  if (!watchers.length) return 0;

  const inWindow = (w: { moveInFrom: Date | null; moveInTo: Date | null }, availableFrom?: string) => {
    // No date on the vacancy, or no window on the watch: nothing to contradict, so it matches.
    if (!availableFrom) return true;
    if (w.moveInFrom && availableFrom < isoDay(w.moveInFrom)) return false;
    if (w.moveInTo && availableFrom > isoDay(w.moveInTo)) return false;
    return true;
  };

  const label = `${listing.address}${listing.unit ? "" : ""} · ${listing.neighbourhood}, ${listing.city}`;
  const inputs = watchers
    .map((w) => ({ w, matches: vacancies.filter((v) => inWindow(w, v.availableFrom)) }))
    .filter(({ matches }) => matches.length > 0)
    .map(({ w, matches }) => {
      const cheapest = Math.min(...matches.map((m) => m.rent));
      const beds = [...new Set(matches.map((m) => m.bedrooms))].sort((a, b) => a - b);
      return {
        userId: w.userId,
        kind: "VACANCY_MATCH" as const,
        title: `${matches.length} unit${matches.length === 1 ? "" : "s"} just opened at ${listing.address}`,
        body: `${label}. ${beds.map((b) => (b === 0 ? "Bachelor" : `${b} bed`)).join(", ")} from $${cheapest.toLocaleString()}/mo. You saved this building, so we let you know first.`,
        href: `/listings/${listing.id}`,
      };
    });

  return inputs.length ? notifyAll(inputs) : 0;
}

/**
 * Building-level figures only. Unit numbers stay out of this deliberately: the platform shows a
 * building name and a price range publicly, never which unit is empty.
 */
function summarise(entries: Array<{ bedrooms: number; rent: unknown; vacant: boolean }>) {
  if (!entries.length) return { units: 0, vacant: 0, priceFrom: null, priceTo: null, bedrooms: [] as number[] };
  const rents = entries.map((e) => Number(e.rent));
  return {
    units: entries.length,
    vacant: entries.filter((e) => e.vacant).length,
    priceFrom: Math.min(...rents),
    priceTo: Math.max(...rents),
    bedrooms: [...new Set(entries.map((e) => e.bedrooms))].sort((a, b) => a - b),
  };
}

/** The landlord's own roll, unit numbers included — they own the building. */
router.get("/listing/:id", requireAuth("landlord"), async (req, res) => {
  const listing = await ownedListing(req.params.id as string, req.auth!.sub);
  const entries = await db.rentRollEntry.findMany({ where: { listingId: listing.id }, orderBy: { unit: "asc" } });
  res.json({ success: true, data: { entries: entries.map(entryView), summary: summarise(entries) } });
});

/** The public view: counts and a price range, no unit numbers. */
router.get("/listing/:id/summary", async (req, res) => {
  const entries = await db.rentRollEntry.findMany({
    where: { listingId: req.params.id as string },
    select: { bedrooms: true, rent: true, vacant: true },
  });
  res.json({ success: true, data: summarise(entries) });
});

// ─── Saved buildings (the vacancy watch) ─────────────────────────────────────

router.get("/saved", requireAuth(), async (req, res) => {
  const saved = await db.savedBuilding.findMany({
    where: { userId: req.auth!.sub },
    orderBy: { createdAt: "desc" },
    include: { listing: { select: { id: true, address: true, neighbourhood: true, city: true, image: true, price: true, deletedAt: true } } },
  });
  res.json({
    success: true,
    data: saved
      .filter((s) => s.listing && !s.listing.deletedAt)
      .map((s) => ({
        id: s.id,
        listingId: s.listingId,
        moveInFrom: s.moveInFrom ? isoDay(s.moveInFrom) : undefined,
        moveInTo: s.moveInTo ? isoDay(s.moveInTo) : undefined,
        listing: {
          id: s.listing!.id,
          address: s.listing!.address,
          neighbourhood: s.listing!.neighbourhood,
          city: s.listing!.city,
          image: s.listing!.image,
          price: Number(s.listing!.price),
        },
      })),
  });
});

/** Idempotent: saving an already-saved building updates the move-in window instead of failing. */
router.post("/saved", requireAuth(), validate(saveBuildingSchema), async (req, res) => {
  const listing = await db.listing.findUnique({
    where: { id: req.body.listingId },
    select: { id: true, deletedAt: true },
  });
  if (!listing || listing.deletedAt) throw new HttpError(404, "Listing not found");

  const window = { moveInFrom: day(req.body.moveInFrom), moveInTo: day(req.body.moveInTo) };
  const saved = await db.savedBuilding.upsert({
    where: { userId_listingId: { userId: req.auth!.sub, listingId: listing.id } },
    update: window,
    create: { userId: req.auth!.sub, listingId: listing.id, ...window },
  });
  res.status(201).json({
    success: true,
    data: {
      id: saved.id,
      listingId: saved.listingId,
      moveInFrom: saved.moveInFrom ? isoDay(saved.moveInFrom) : undefined,
      moveInTo: saved.moveInTo ? isoDay(saved.moveInTo) : undefined,
    },
  });
});

router.delete("/saved/:listingId", requireAuth(), async (req, res) => {
  // deleteMany, not delete: un-saving something already un-saved is a success, not a 404.
  await db.savedBuilding.deleteMany({
    where: { userId: req.auth!.sub, listingId: req.params.listingId as string },
  });
  res.status(204).end();
});

export default router;
