import { DEFAULT_COST_CONFIG } from "@/config/costs";

export interface MonthlyCostInputs {
  purchasePrice: number | null | undefined;
  downPaymentPct?: number;
  mortgageRatePct?: number;
  termYears?: number;
  serviceChargePsf?: number;
  sizeSqft?: number | null | undefined;
  utilitiesMonthly?: number;
  annualRent?: number | null | undefined;
  /** Optional extras. Left out means 0, so existing callers keep their figures. */
  agencyFeePct?: number;
  maintenancePsf?: number;
  vacancyPct?: number;
}

export interface UpfrontCosts {
  downPaymentCash: number;
  dldTransferFee: number;
  mortgageRegistrationFee: number;
  agencyFee: number;
  totalUpfront: number;
}

export interface MonthlyCostOutputs {
  isValid: boolean;
  message?: string;
  purchasePrice: number;
  loanAmount: number;
  monthlyMortgage: number;
  monthlyServiceCharge: number;
  annualServiceCharge: number;
  monthlyUtilities: number;
  totalMonthlyCost: number;
  netYield: number | null;
  netYieldNote?: string;
  upfrontCosts: UpfrontCosts;
  annualMaintenance: number;
  vacancyLoss: number;
  /** Interest paid over the whole term, assuming the rate never changes. */
  totalInterest: number;
  /** (rent after vacancy - service charge - maintenance) / price. Before mortgage payments. Null without rent. */
  netYieldAllCosts: number | null;
  /** Rent after vacancy and running costs, minus the year of mortgage payments. Can be negative. Null without rent. */
  annualCashFlow: number | null;
}

/**
 * Calculates monthly mortgage payment using the standard amortisation formula.
 *
 * Formula:
 * M = P * [ r(1 + r)^n ] / [ (1 + r)^n - 1 ]
 *
 * Where:
 * P = Principal loan amount
 * r = Monthly interest rate (annualRate / 12)
 * n = Number of monthly payments (years * 12)
 *
 * If rate is 0, M = P / n.
 * If principal <= 0, M = 0.
 */
export function calculateMortgagePayment(
  principal: number,
  annualRatePct: number,
  termYears: number
): number {
  if (principal <= 0 || termYears <= 0) return 0;
  const n = Math.round(termYears * 12);
  if (n <= 0) return 0;

  if (annualRatePct <= 0) {
    return principal / n;
  }

  const r = annualRatePct / 100 / 12;
  const factor = Math.pow(1 + r, n);
  if (!isFinite(factor) || factor <= 1) return principal / n;

  return principal * ((r * factor) / (factor - 1));
}

/**
 * Calculates complete monthly holding costs and net yield.
 * Handles missing or invalid inputs gracefully without returning NaN.
 */
export function calculateMonthlyCosts(inputs: MonthlyCostInputs): MonthlyCostOutputs {
  const price = inputs.purchasePrice;

  if (price == null || isNaN(price) || price <= 0) {
    return {
      isValid: false,
      message: "Please enter a purchase price to calculate monthly costs.",
      purchasePrice: 0,
      loanAmount: 0,
      monthlyMortgage: 0,
      monthlyServiceCharge: 0,
      annualServiceCharge: 0,
      monthlyUtilities: 0,
      totalMonthlyCost: 0,
      netYield: null,
      netYieldNote: "Purchase price required for yield calculation",
      upfrontCosts: {
        downPaymentCash: 0,
        dldTransferFee: 0,
        mortgageRegistrationFee: 0,
        agencyFee: 0,
        totalUpfront: 0,
      },
      annualMaintenance: 0,
      vacancyLoss: 0,
      totalInterest: 0,
      netYieldAllCosts: null,
      annualCashFlow: null,
    };
  }

  const downPct = inputs.downPaymentPct != null && !isNaN(inputs.downPaymentPct)
    ? Math.max(0, Math.min(100, inputs.downPaymentPct))
    : DEFAULT_COST_CONFIG.downPaymentPct;

  const ratePct = inputs.mortgageRatePct != null && !isNaN(inputs.mortgageRatePct)
    ? Math.max(0, inputs.mortgageRatePct)
    : DEFAULT_COST_CONFIG.mortgageRatePct;

  const term = inputs.termYears != null && !isNaN(inputs.termYears) && inputs.termYears > 0
    ? inputs.termYears
    : DEFAULT_COST_CONFIG.termYears;

  const scPsf = inputs.serviceChargePsf != null && !isNaN(inputs.serviceChargePsf)
    ? Math.max(0, inputs.serviceChargePsf)
    : DEFAULT_COST_CONFIG.serviceChargePsf;

  const size = inputs.sizeSqft != null && !isNaN(inputs.sizeSqft) && inputs.sizeSqft > 0
    ? inputs.sizeSqft
    : DEFAULT_COST_CONFIG.defaultSizeSqft;

  const utilities = inputs.utilitiesMonthly != null && !isNaN(inputs.utilitiesMonthly)
    ? Math.max(0, inputs.utilitiesMonthly)
    : DEFAULT_COST_CONFIG.utilitiesMonthly;

  const downCash = price * (downPct / 100);
  const loanAmount = Math.max(0, price - downCash);
  const monthlyMortgage = calculateMortgagePayment(loanAmount, ratePct, term);

  const annualServiceCharge = scPsf * size;
  const monthlyServiceCharge = annualServiceCharge / 12;
  const monthlyUtilities = utilities;

  const totalMonthlyCost = monthlyMortgage + monthlyServiceCharge + monthlyUtilities;

  // Upfront costs
  const dldTransferFee = price * (DEFAULT_COST_CONFIG.dldTransferFeePct / 100);
  const mortgageRegistrationFee = loanAmount > 0
    ? loanAmount * (DEFAULT_COST_CONFIG.mortgageRegistrationFeePct / 100) +
      DEFAULT_COST_CONFIG.mortgageRegistrationAdminFee
    : 0;

  const clampPct = (v: number | undefined, max: number) =>
    v != null && Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : 0;
  const agencyFee = price * (clampPct(inputs.agencyFeePct, 10) / 100);
  const totalUpfront = downCash + dldTransferFee + mortgageRegistrationFee + agencyFee;

  const maintPsf = inputs.maintenancePsf != null && Number.isFinite(inputs.maintenancePsf) ? Math.max(0, inputs.maintenancePsf) : 0;
  const annualMaintenance = maintPsf * size;
  const vacancyFrac = clampPct(inputs.vacancyPct, 100) / 100;
  const totalInterest = Math.max(0, monthlyMortgage * Math.round(term * 12) - loanAmount);

  // Net yield: (annual rent - annual service charge) / purchase price
  let netYield: number | null = null;
  let netYieldNote: string | undefined;

  const rent = inputs.annualRent;
  if (rent != null && !isNaN(rent) && rent > 0) {
    const netAnnualIncome = rent - annualServiceCharge;
    netYield = netAnnualIncome / price;
  } else {
    netYield = null;
    netYieldNote = "No rental contracts recorded to calculate net yield.";
  }

  let netYieldAllCosts: number | null = null;
  let annualCashFlow: number | null = null;
  let vacancyLoss = 0;
  if (rent != null && !isNaN(rent) && rent > 0) {
    vacancyLoss = rent * vacancyFrac;
    const noi = rent - vacancyLoss - annualServiceCharge - annualMaintenance;
    netYieldAllCosts = noi / price;
    annualCashFlow = noi - monthlyMortgage * 12;
  }

  return {
    isValid: true,
    purchasePrice: price,
    loanAmount,
    monthlyMortgage,
    monthlyServiceCharge,
    annualServiceCharge,
    monthlyUtilities,
    totalMonthlyCost,
    netYield,
    netYieldNote,
    upfrontCosts: {
      downPaymentCash: downCash,
      dldTransferFee,
      mortgageRegistrationFee,
      agencyFee,
      totalUpfront,
    },
    annualMaintenance,
    vacancyLoss,
    totalInterest,
    netYieldAllCosts,
    annualCashFlow,
  };
}
