export interface ListingScores {
  price: number;
  location: number;
  transit: number;
  walkability: number;
  amenities: number;
  space: number;
}

export interface TenantPrefs {
  priorities: string[];
  budgetMax?: number;
}

export interface AddOn {
  label: string;
  price: number | "included";
  mandatory?: boolean; // mandatory fees are always part of net rent
}

const clamp10 = (n: number) => Math.min(10, Math.max(0, n));

export function calculateMatchScore(scores: ListingScores, prefs: TenantPrefs): number {
  const has = (p: string) => prefs.priorities.includes(p);
  const w = {
    price: has("price") ? 0.3 : 0.18,
    transit: has("transit") ? 0.22 : 0.14,
    walkability: has("walkability") ? 0.2 : 0.13,
    amenities: has("amenities") ? 0.18 : 0.12,
    location: has("location") ? 0.22 : 0.15,
    space: has("space") ? 0.2 : 0.12,
  };
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  const score = (Object.keys(w) as Array<keyof typeof w>).reduce(
    (sum, k) => sum + clamp10(scores[k]) * (w[k] / total),
    0
  );
  return +score.toFixed(1);
}

export function calculateNetRent(basePrice: number, addOns: AddOn[], selectedAddOns: string[] = []) {
  let mandatoryTotal = 0;
  let selectedTotal = 0;

  for (const addon of addOns) {
    if (typeof addon.price !== "number") continue; // "included" costs nothing extra
    if (addon.mandatory) mandatoryTotal += addon.price;
    else if (selectedAddOns.includes(addon.label)) selectedTotal += addon.price;
  }

  return {
    netRent: basePrice + mandatoryTotal + selectedTotal,
    mandatoryAddOnsTotal: mandatoryTotal,
    selectedAddOnsTotal: selectedTotal,
  };
}
