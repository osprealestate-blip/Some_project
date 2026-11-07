/** M6 rent increase calculator: Dubai Decree No. 43 of 2013 (rent increase rules), Article 1.
 *  The allowed increase depends on how far the current rent is below the average rent for similar units
 *  (the RERA rental index). The official index is on the DLD Rental Index calculator; our DLD-based
 *  market figure is an estimate and is labelled so. */

export type RentBand = { maxBelow: number | null; increase: number; text: string };

/** Bands from the decree. `maxBelow` is the upper bound of "how far below the average", as a fraction. */
export const BANDS: RentBand[] = [
  { maxBelow: 0.1, increase: 0, text: "Up to 10% below the average: no increase" },
  { maxBelow: 0.2, increase: 0.05, text: "More than 10% and up to 20% below: up to 5%" },
  { maxBelow: 0.3, increase: 0.1, text: "More than 20% and up to 30% below: up to 10%" },
  { maxBelow: 0.4, increase: 0.15, text: "More than 30% and up to 40% below: up to 15%" },
  { maxBelow: null, increase: 0.2, text: "More than 40% below: up to 20%" },
];

export type RentIncreaseResult = {
  below: number; // how far the current rent is below the average (negative = above the average)
  maxIncrease: number; // fraction
  maxNewRent: number;
  band: RentBand;
};

export function maxRentIncrease(currentRent: number, averageRent: number): RentIncreaseResult | null {
  if (!(currentRent > 0) || !(averageRent > 0)) return null;
  const below = 1 - currentRent / averageRent;
  // The decree's bands (11-20%, 21-30%...) are read as continuous: a gap above 20% falls in the next band.
  // Round to 0.1 point so 10.000001% stays in its band.
  const belowPct = Math.round(below * 1000) / 10;
  const band = BANDS.find((b) => b.maxBelow === null || belowPct <= b.maxBelow * 100)!;
  return { below, maxIncrease: band.increase, maxNewRent: currentRent * (1 + band.increase), band };
}

/** Latest date the landlord must give written notice of an increase: 90 days before the contract ends. */
export function noticeDeadline(contractEnd: Date): Date {
  const d = new Date(contractEnd.getTime());
  d.setUTCDate(d.getUTCDate() - 90);
  return d;
}
