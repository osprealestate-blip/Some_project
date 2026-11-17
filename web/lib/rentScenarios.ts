/** Gross yield, net yield and cash-on-cash side by side for the rent we hold and for rent 5% and 10% lower.
 *  Every cost behind the net and cash figures is the user's assumption; the rent is the DLD median. A what-if, not a forecast. */
import { calculateMonthlyCosts, type MonthlyCostInputs } from "./costs";

export type ScenarioRow = {
  label: string;
  rentFactor: number;
  annualRent: number;
  grossYield: number | null;
  netYield: number | null;
  annualCashFlow: number | null;
  /** Yearly cash left after mortgage payments, as a share of the cash needed to buy (down payment and upfront fees). */
  cashOnCash: number | null;
};

export const RENT_CUTS = [0, 0.05, 0.1] as const;

export function rentScenarios(inputs: MonthlyCostInputs): ScenarioRow[] | null {
  const rent = inputs.annualRent;
  if (rent == null || !Number.isFinite(rent) || rent <= 0) return null;
  return RENT_CUTS.map((cut) => {
    const r = rent * (1 - cut);
    const c = calculateMonthlyCosts({ ...inputs, annualRent: r });
    if (!c.isValid) return { label: "", rentFactor: 1 - cut, annualRent: r, grossYield: null, netYield: null, annualCashFlow: null, cashOnCash: null };
    return {
      label: cut === 0 ? "Rent as recorded" : `Rent ${Math.round(cut * 100)}% lower`,
      rentFactor: 1 - cut,
      annualRent: r,
      grossYield: r / c.purchasePrice,
      netYield: c.netYieldAllCosts,
      annualCashFlow: c.annualCashFlow,
      cashOnCash: c.annualCashFlow != null && c.upfrontCosts.totalUpfront > 0 ? c.annualCashFlow / c.upfrontCosts.totalUpfront : null,
    };
  });
}
