/**
 * Canadian mortgages compound semi-annually (Interest Act s.6), not monthly.
 * Monthly rate = (1 + annual/2)^(1/6) - 1.
 */
export function monthlyRateCanadian(annualRatePct: number): number {
  return Math.pow(1 + annualRatePct / 100 / 2, 1 / 6) - 1;
}

export function monthlyPayment(principal: number, annualRatePct: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  const n = years * 12;
  if (annualRatePct <= 0) return principal / n;
  const r = monthlyRateCanadian(annualRatePct);
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
