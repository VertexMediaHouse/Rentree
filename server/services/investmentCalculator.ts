import { monthlyPayment } from "../lib/finance";
import { cmhcAverage as lookupCmhc } from "../data/cmhc";

export interface PropertyInvestmentInput {
  purchasePrice: number;
  monthlyRent: number;
  occupancyRate?: number; // 0-1, e.g. 0.95
  propertyTaxAnnual: number;
  insuranceAnnual: number;
  maintenanceAnnual: number;
  propertyManagementAnnual?: number;
  downPayment: number;
  mortgageRate: number;
  amortizationYears: number;
  city: string;
  unitType: "bachelor" | "one" | "two" | "three";
}

export function calculateInvestmentMetrics(input: PropertyInvestmentInput) {
  const occupancy = input.occupancyRate ?? 0.96;
  const grossPotentialRent = input.monthlyRent * 12;
  const effectiveGrossIncome = grossPotentialRent * occupancy;

  const totalOperatingExpenses =
    input.propertyTaxAnnual +
    input.insuranceAnnual +
    input.maintenanceAnnual +
    (input.propertyManagementAnnual ?? 0);

  const netOperatingIncome = effectiveGrossIncome - totalOperatingExpenses;
  const capRate = +((netOperatingIncome / input.purchasePrice) * 100).toFixed(2);

  const loanAmount = Math.max(0, input.purchasePrice - input.downPayment);
  const monthlyMortgage = monthlyPayment(loanAmount, input.mortgageRate, input.amortizationYears);
  const annualDebtService = monthlyMortgage * 12;

  const annualCashFlow = netOperatingIncome - annualDebtService;
  const cashOnCashReturn = input.downPayment > 0 ? +((annualCashFlow / input.downPayment) * 100).toFixed(2) : null;
  const grossYield = +((grossPotentialRent / input.purchasePrice) * 100).toFixed(2);
  const dscr = annualDebtService > 0 ? +(netOperatingIncome / annualDebtService).toFixed(2) : null;
  const grossRentMultiplier = +(input.purchasePrice / grossPotentialRent).toFixed(1);

  const cmhcAverage = lookupCmhc(input.city, input.unitType);
  const cmhcBenchmark = cmhcAverage
    ? {
        city: input.city,
        unitType: input.unitType,
        cmhcAverageRent: cmhcAverage,
        varianceVsCmhcPct: +(((input.monthlyRent - cmhcAverage) / cmhcAverage) * 100).toFixed(1),
      }
    : null; // unknown city: no benchmark rather than silently using Toronto

  return {
    grossPotentialRent: Math.round(grossPotentialRent),
    effectiveGrossIncome: Math.round(effectiveGrossIncome),
    totalOperatingExpenses: Math.round(totalOperatingExpenses),
    netOperatingIncome: Math.round(netOperatingIncome),
    capRate,
    monthlyMortgagePayment: Math.round(monthlyMortgage),
    annualCashFlow: Math.round(annualCashFlow),
    monthlyCashFlow: Math.round(annualCashFlow / 12),
    cashOnCashReturn,
    grossYield,
    dscr,
    grossRentMultiplier,
    cmhcBenchmark,
  };
}
