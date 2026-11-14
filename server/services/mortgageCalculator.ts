import { monthlyPayment, round2 } from "../lib/finance";
import { HttpError } from "../lib/errors";

export const SUPPORTED_PROVINCES = ["ON", "BC", "QC", "AB"] as const;
export type Province = (typeof SUPPORTED_PROVINCES)[number];

export interface MortgageInput {
  price: number;
  down: number;
  province: Province;
  amortization: number;
  rate: number;
  grossIncome: number;
  monthlyDebts: number;
  currentRent?: number;
  propertyTax: number;
  condoFee: number;
  heating?: number; // monthly; lenders include it in GDS/TDS
  isFirstTimeBuyer: boolean;
  inToronto: boolean;
}

export interface LTTItem {
  label: string;
  value: number;
  rebate?: number;
}

/** Minimum down payment: 5% of first $500k + 10% of the remainder (20% at $1.5M+). */
export function minimumDown(price: number): number {
  if (price >= 1_500_000) return price * 0.2;
  if (price <= 500_000) return price * 0.05;
  return 25_000 + (price - 500_000) * 0.1;
}

/** CMHC premium on the base loan. Insurance is unavailable for prices >= $1.5M. */
export function cmhcPremium(price: number, down: number, amortization = 25): number {
  const loan = price - down;
  const pct = down / price;
  if (pct >= 0.2) return 0;
  let rate: number;
  if (pct >= 0.15) rate = 0.028;
  else if (pct >= 0.1) rate = 0.031;
  else rate = 0.04;
  if (amortization > 25) rate += 0.002; // extended-amortization surcharge
  return loan * rate;
}

/** Provincial sales tax on the insurance premium, payable in cash at closing. */
export function premiumTaxRate(province: string): number {
  return province === "ON" ? 0.08 : province === "QC" ? 0.09 : 0;
}

export function stressTestRate(rate: number): number {
  return Math.max(rate + 2, 5.25);
}

/** brackets: [upperBound, marginalRate]; final bound is Infinity. */
function bracketTax(price: number, brackets: Array<[number, number]>): number {
  let tax = 0;
  let lower = 0;
  for (const [upper, r] of brackets) {
    if (price > lower) tax += (Math.min(price, upper) - lower) * r;
    lower = upper;
  }
  return tax;
}

export function ontarioLTT(price: number): number {
  return bracketTax(price, [
    [55_000, 0.005],
    [250_000, 0.01],
    [400_000, 0.015],
    [2_000_000, 0.02],
    [Infinity, 0.025],
  ]);
}

/** Toronto MLTT, including the luxury tiers effective Jan 1, 2024. */
export function torontoMunicipalLTT(price: number): number {
  return bracketTax(price, [
    [55_000, 0.005],
    [250_000, 0.01],
    [400_000, 0.015],
    [2_000_000, 0.02],
    [3_000_000, 0.025],
    [4_000_000, 0.044],
    [5_000_000, 0.055],
    [10_000_000, 0.065],
    [20_000_000, 0.075],
    [Infinity, 0.085],
  ]);
}

export function bcPTT(price: number): number {
  return bracketTax(price, [
    [200_000, 0.01],
    [2_000_000, 0.02],
    [3_000_000, 0.03],
    [Infinity, 0.05],
  ]);
}

/** Québec welcome tax (province-wide brackets; Montréal and some cities add higher tiers). */
export function quebecWelcomeTax(price: number): number {
  return bracketTax(price, [
    [58_900, 0.005],
    [294_600, 0.01],
    [552_300, 0.015],
    [Infinity, 0.02],
  ]);
}

/** Alberta title fee: $50 + $5 per $5,000 (or part). Mortgage registration uses the same schedule. */
export function albertaFee(amount: number): number {
  return 50 + 5 * Math.ceil(amount / 5000);
}

export function provincialLTT(
  price: number,
  province: string,
  inToronto: boolean,
  ftb: boolean,
  loan = 0
): { items: LTTItem[] } {
  const items: LTTItem[] = [];
  if (province === "ON") {
    const ltt = ontarioLTT(price);
    const rebate = ftb ? Math.min(ltt, 4000) : 0;
    items.push({ label: "Ontario land transfer tax", value: ltt, rebate: rebate || undefined });
    if (inToronto) {
      const muni = torontoMunicipalLTT(price);
      const muniRebate = ftb ? Math.min(muni, 4475) : 0;
      items.push({ label: "Toronto municipal LTT", value: muni, rebate: muniRebate || undefined });
    }
  } else if (province === "BC") {
    const ptt = bcPTT(price);
    // FTB exemption (Apr 2024): full up to $835k, phased out to $860k
    let rebate = 0;
    if (ftb) {
      if (price <= 835_000) rebate = ptt;
      else if (price < 860_000) rebate = ptt * ((860_000 - price) / 25_000);
    }
    items.push({ label: "BC property transfer tax", value: ptt, rebate: rebate > 0 ? rebate : undefined });
  } else if (province === "QC") {
    items.push({ label: "Québec welcome tax", value: quebecWelcomeTax(price) });
  } else if (province === "AB") {
    items.push({ label: "Alberta title transfer fee", value: albertaFee(price) });
    if (loan > 0) items.push({ label: "Alberta mortgage registration fee", value: albertaFee(loan) });
  }
  return { items };
}

export function closingCosts(
  price: number,
  province: string,
  inToronto: boolean,
  ftb: boolean,
  premiumPST: number,
  loan = 0
) {
  const { items: lttItems } = provincialLTT(price, province, inToronto, ftb, loan);
  const legalFees = Math.min(3500, Math.max(1800, Math.round((price * 0.0015) / 100) * 100));
  const titleInsurance = price <= 500_000 ? 300 : price <= 1_000_000 ? 400 : 550;
  const homeInspection = 550;
  const movingCosts = 1800;
  const lttNet = lttItems.reduce((s, i) => s + i.value - (i.rebate || 0), 0);
  return { lttItems, legalFees, titleInsurance, homeInspection, movingCosts, premiumPST, lttNet };
}

export function calculateMortgageAffordability(data: MortgageInput) {
  if (!SUPPORTED_PROVINCES.includes(data.province)) {
    throw new HttpError(400, `Unsupported province "${data.province}". Supported: ${SUPPORTED_PROVINCES.join(", ")}`);
  }
  if (data.down >= data.price) throw new HttpError(400, "Down payment must be less than the purchase price");
  if (data.amortization > 30) throw new HttpError(400, "Amortization cannot exceed 30 years");

  const warnings: string[] = [];
  const loan = data.price - data.down;
  const downPct = data.down / data.price;
  const insured = downPct < 0.2;

  if (insured) {
    if (data.price >= 1_500_000) {
      throw new HttpError(400, "Homes priced at $1.5M or more require a minimum 20% down payment");
    }
    const minDown = minimumDown(data.price);
    if (data.down < minDown) {
      throw new HttpError(400, `Minimum down payment for this price is $${Math.ceil(minDown).toLocaleString("en-CA")}`);
    }
    if (data.amortization > 25 && !data.isFirstTimeBuyer) {
      warnings.push("Insured amortization above 25 years is limited to first-time buyers or new builds.");
    }
  }

  const insurance = insured ? cmhcPremium(data.price, data.down, data.amortization) : 0;
  const premiumPST = insurance * premiumTaxRate(data.province);
  const insuredLoan = loan + insurance;
  const payment = monthlyPayment(insuredLoan, data.rate, data.amortization);
  const sRate = stressTestRate(data.rate);
  const sPayment = monthlyPayment(insuredLoan, sRate, data.amortization);

  const heating = data.heating ?? 100;
  const carrying = data.propertyTax / 12 + heating + data.condoFee * 0.5; // 50% of condo fee counts
  const housing = payment + carrying;
  const stressHousing = sPayment + carrying;

  const income = data.grossIncome / 12;
  const pct = (n: number) => +((n / income) * 100).toFixed(1);
  const gdsRatio = pct(housing);
  const tdsRatio = pct(housing + data.monthlyDebts);
  const stressGdsRatio = pct(stressHousing);
  const stressTdsRatio = pct(stressHousing + data.monthlyDebts);

  const gdsQualifies = gdsRatio <= 39;
  const tdsQualifies = tdsRatio <= 44;
  const stressQualifies = stressGdsRatio <= 39 && stressTdsRatio <= 44;

  const cc = closingCosts(data.price, data.province, data.inToronto, data.isFirstTimeBuyer, premiumPST, loan);
  const totalClosingCosts =
    cc.lttNet + cc.legalFees + cc.titleInsurance + cc.homeInspection + cc.movingCosts + cc.premiumPST;
  const totalCashNeeded = data.down + totalClosingCosts;

  if (data.province === "QC") {
    warnings.push("Québec welcome tax uses province-wide brackets; Montréal and some municipalities charge more.");
  }
  if (data.inToronto && data.province !== "ON") warnings.push("inToronto ignored: Toronto LTT only applies in Ontario.");

  return {
    loanAmount: round2(loan),
    downPaymentPct: +(downPct * 100).toFixed(2),
    insured,
    insurancePremium: round2(insurance),
    totalMortgage: round2(insuredLoan),
    monthlyPayment: Math.round(payment),
    stressTestRate: sRate,
    stressTestMonthlyPayment: Math.round(sPayment),
    gdsRatio,
    tdsRatio,
    stressGdsRatio,
    stressTdsRatio,
    gdsQualifies,
    tdsQualifies,
    stressQualifies,
    qualifies: stressQualifies,
    closingCostsBreakdown: cc,
    totalClosingCosts: Math.round(totalClosingCosts),
    totalCashNeeded: Math.round(totalCashNeeded),
    warnings,
  };
}
