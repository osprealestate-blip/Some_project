/** Expected rents for towers that are still off-plan. Nobody can rent a flat that is not finished, so these
 *  towers have no rent contracts. The page shows what similar finished flats in the same community rent for
 *  instead, clearly as an expectation. Medians, never means. */

export const OFF_PLAN_SHARE = 0.8; // a tower counts as off-plan when this share of its last 12 months' sales were
export const MIN_SALES = 3; // ... and it had at least this many sales
export const SIZE_BAND = 0.15; // comparable rents: same bedrooms, size within +-15% of the tower's median size
export const MIN_RENTS = 10; // contracts needed behind an expected rent

export type ExpectedRent = { rooms: number; median: number; count: number };

/** True when the tower has no rents of its own and sells almost only off-plan. */
export function isOffPlanTower(sales12m: number, offPlan12m: number, ownRents12m: number): boolean {
  return ownRents12m === 0 && sales12m >= MIN_SALES && offPlan12m / sales12m >= OFF_PLAN_SHARE;
}

/** Size band for comparable rents around a median flat size. */
export function sizeBand(size: number): [number, number] {
  return [size * (1 - SIZE_BAND), size * (1 + SIZE_BAND)];
}

/** Expected gross yield: expected rent / median price of the same bedroom type. */
export function expectedYield(rent: number | null | undefined, price: number | null | undefined): number | null {
  if (rent == null || price == null || price <= 0) return null;
  return rent / price;
}
