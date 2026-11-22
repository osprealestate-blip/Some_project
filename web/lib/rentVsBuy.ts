/** Estimated monthly rent beside estimated monthly cost of owning, per bedroom type, from real DLD medians.
 *  Ownership cost here = mortgage + service charge only, from stated starting assumptions. It leaves out the cash up front,
 *  utilities, upkeep, fees and any change in price. There is no verdict and no prediction. */
import { DEFAULT_COST_CONFIG } from "@/config/costs";
import { calculateMonthlyCosts } from "./costs";
import type { Summary } from "./queries";

export type PriceRange = { rooms: number; count: number; p25: number; p75: number };

export type RentVsBuyRow = {
  rooms: number;
  /** Median registered rent over 12 months, per month. Null when there is not enough rent evidence. */
  monthlyRent: number | null;
  rentLevel: Summary["rent_level"];
  /** Mortgage plus service charge per month at the stated assumptions. */
  monthlyOwnership: number | null;
  monthlyMortgage: number | null;
  monthlyServiceCharge: number | null;
  /** Down payment and fees needed to buy, at the same assumptions. */
  cashUpfront: number | null;
  medianPrice: number | null;
  sizeSqft: number | null;
  /** The middle half of 12 months of sale prices: a quarter sold for less than low, a quarter for more than high. Null under 3 sales. */
  priceLow: number | null;
  priceHigh: number | null;
  sales: number;
};

export const ASSUMPTIONS = {
  downPaymentPct: DEFAULT_COST_CONFIG.downPaymentPct,
  mortgageRatePct: DEFAULT_COST_CONFIG.mortgageRatePct,
  termYears: DEFAULT_COST_CONFIG.termYears,
  serviceChargePsf: DEFAULT_COST_CONFIG.serviceChargePsf,
} as const;

const MIN_SALES = 3;
const MIN_RENTS = 3;

export function rentVsBuyRows(summaries: Summary[], ranges: PriceRange[], serviceChargePsf: number = ASSUMPTIONS.serviceChargePsf): RentVsBuyRow[] {
  return summaries
    .filter((s) => s.rooms >= 0 && s.sale_count_12m >= MIN_SALES && s.sale_median_price_12m != null)
    .map((s) => {
      const range = ranges.find((r) => r.rooms === s.rooms && r.count >= MIN_SALES) ?? null;
      const size = s.sale_median_size_12m ?? null;
      const c = calculateMonthlyCosts({ purchasePrice: s.sale_median_price_12m, sizeSqft: size, ...ASSUMPTIONS, serviceChargePsf });
      const hasRent = s.rent_median_12m != null && s.rent_count_12m >= MIN_RENTS;
      return {
        rooms: s.rooms,
        monthlyRent: hasRent ? s.rent_median_12m! / 12 : null,
        rentLevel: hasRent ? s.rent_level : null,
        monthlyOwnership: c.isValid ? c.monthlyMortgage + c.monthlyServiceCharge : null,
        monthlyMortgage: c.isValid ? c.monthlyMortgage : null,
        monthlyServiceCharge: c.isValid ? c.monthlyServiceCharge : null,
        cashUpfront: c.isValid ? c.upfrontCosts.totalUpfront : null,
        medianPrice: s.sale_median_price_12m,
        sizeSqft: size,
        priceLow: range?.p25 ?? null,
        priceHigh: range?.p75 ?? null,
        sales: s.sale_count_12m,
      };
    });
}
