import { CMHC_SOURCE, UnitKey, cmhcAverage } from "../data/cmhc";
import { HttpError } from "../lib/errors";
import { calculateMatchScore, ListingScores } from "./matchCalculator";

const clamp10 = (n: number) => Math.min(10, Math.max(0, n));
const r1 = (n: number) => +n.toFixed(1);

export interface ScoreInput {
  city: string;
  unitType: UnitKey;
  rent: number;
  sqft?: number;
  locationScore?: number;
  transitScore?: number;
  walkabilityScore?: number;
  amenitiesScore?: number;
  priorities?: string[];
}

function benchmark(input: ScoreInput) {
  const avg = cmhcAverage(input.city, input.unitType);
  if (avg === undefined) throw new HttpError(400, `No CMHC benchmark for "${input.city}"`);
  // Better-located units command a premium: +/-3% of the CMHC average per point away from a neutral 5.
  const market = Math.round(avg * (1 + ((input.locationScore ?? 5) - 5) * 0.03));
  const low = Math.round(market * 0.92);
  const high = Math.round(market * 1.08);
  const diff = input.rent - market;
  const diffPct = r1((diff / market) * 100);
  const priceScore = r1(clamp10(7 - (diff / market) * 20));
  return { avg, market, low, high, diff, diffPct, priceScore };
}

function categoryScores(input: ScoreInput, priceScore: number): ListingScores {
  return {
    price: priceScore,
    location: clamp10(input.locationScore ?? 5),
    transit: clamp10(input.transitScore ?? 5),
    walkability: clamp10(input.walkabilityScore ?? 5),
    amenities: clamp10(input.amenitiesScore ?? 5),
    space: 5,
  };
}

const marketBlock = (b: ReturnType<typeof benchmark>) => ({
  cmhcAverageRent: b.avg,
  estimatedMarketRent: b.market,
  marketRange: { low: b.low, high: b.high },
  differenceAmount: b.diff,
  differencePct: b.diffPct,
  source: CMHC_SOURCE,
});

export function rentFairnessScore(input: ScoreInput) {
  const b = benchmark(input);
  const cats = categoryScores(input, b.priceScore);
  const overall = r1(calculateMatchScore(cats, { priorities: ["price"] }));
  const label =
    b.diffPct <= -5 ? "Excellent deal" : b.diffPct <= 5 ? "Fair deal" : b.diffPct <= 15 ? "Slightly above market" : "Overpriced";
  const recommendation =
    b.diffPct < 0
      ? `Your current rent appears ${Math.abs(b.diffPct)}% below local market. Renewing at this rate looks strong.`
      : b.diffPct <= 5
        ? "Your rent is in line with the local market."
        : `This rent is ${b.diffPct}% above nearby comparables — consider negotiating at renewal.`;
  return {
    score: overall,
    label,
    ...marketBlock(b),
    breakdown: { location: cats.location, price: cats.price, transit: cats.transit, walkability: cats.walkability, amenities: cats.amenities },
    recommendation,
  };
}

export function dealScore(input: ScoreInput & { hasParking?: boolean; hasInSuiteLaundry?: boolean }) {
  const b = benchmark(input);
  const cats = categoryScores(input, b.priceScore);
  if (input.sqft) {
    const typical = { bachelor: 450, one: 650, two: 900, three: 1200 }[input.unitType];
    cats.space = r1(clamp10(5 + ((input.sqft - typical) / typical) * 10));
  }
  const overall = r1(calculateMatchScore(cats, { priorities: input.priorities ?? [] }));
  const label = overall >= 7.5 ? "Great deal" : overall >= 6 ? "Reasonable" : overall >= 4.5 ? "Premium but fair" : "Overpriced";
  const gets: string[] = [];
  const watch: string[] = [];
  if (cats.transit >= 8) gets.push("Excellent transit access");
  if (cats.walkability >= 8) gets.push("Highly walkable neighbourhood");
  if (input.hasParking) gets.push("Parking included");
  if (input.hasInSuiteLaundry) gets.push("In-suite laundry");
  if (b.diffPct > 5) watch.push(`Asking rent is ${b.diffPct}% above the expected market rent`);
  if (cats.amenities < 5) watch.push("Limited building amenities");
  if (cats.transit < 5) watch.push("Weak transit access");
  const negotiation =
    b.diffPct > 5
      ? "This unit is priced above similar nearby rentals — ask for a lower rent or added inclusions."
      : b.diffPct < -5
        ? "Priced below market; expect competition, so apply quickly."
        : "Strong location premium, but rent is still within fair range.";
  return {
    score: overall,
    label,
    ...marketBlock(b),
    aboveMarket: b.diff > 0,
    categories: cats,
    whatYouGet: gets,
    whatToWatch: watch,
    negotiationInsight: negotiation,
  };
}
