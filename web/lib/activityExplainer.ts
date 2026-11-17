/** Plain-language reading of how busy a building is and how its price moved. Describes only: no forecasts, no verdicts,
 *  and a warning whenever the mix of sales (size, ready or off-plan) could explain the move. */
export type PeriodStats = { sales: number; medianPsf: number | null; offPlan: number; medianSize: number | null };
export type ActivityInput = { now: PeriodStats; prev: PeriodStats };

export type Explainer = { activity: string; price: string; cautions: string[] };

const MIN = 5;
const pctText = (x: number) => `${x >= 0 ? "up" : "down"} ${Math.abs(Math.round(x * 100))}%`;
const sales = (n: number) => `${n.toLocaleString("en-US")} ${n === 1 ? "sale" : "sales"}`;

export function explain({ now, prev }: ActivityInput): Explainer {
  const cautions: string[] = [];
  let activity: string;
  if (now.sales === 0 && prev.sales === 0) activity = "No sales were counted here in the last two years.";
  else if (prev.sales === 0) activity = `${sales(now.sales)} in the last 12 months and none in the 12 months before.`;
  else {
    const rel = now.sales > prev.sales * 1.25 ? "more than" : now.sales < prev.sales * 0.75 ? "fewer than" : "about the same as";
    activity = `${sales(now.sales)} in the last 12 months, ${rel} the ${prev.sales.toLocaleString("en-US")} in the 12 months before.`;
  }
  let price: string;
  if (now.medianPsf == null || prev.medianPsf == null || now.sales < MIN || prev.sales < MIN) {
    price = `Not enough sales to compare years: each year needs at least ${MIN}.`;
  } else {
    const ch = now.medianPsf / prev.medianPsf - 1;
    price = `The middle price per sq ft is ${pctText(ch)} on the year before (${Math.round(prev.medianPsf).toLocaleString("en-US")} to ${Math.round(now.medianPsf).toLocaleString("en-US")}).`;
    const shareNow = now.offPlan / now.sales;
    const sharePrev = prev.offPlan / prev.sales;
    if (Math.abs(shareNow - sharePrev) >= 0.25) cautions.push(`Off-plan was ${Math.round(shareNow * 100)}% of sales this year against ${Math.round(sharePrev * 100)}% the year before. Off-plan and ready flats sell at different prices, so part of this move is the mix.`);
    if (now.medianSize != null && prev.medianSize != null && Math.abs(now.medianSize / prev.medianSize - 1) >= 0.15) cautions.push("The typical flat size sold changed by 15% or more, which also moves price per sq ft.");
    if (Math.min(now.sales, prev.sales) < 15) cautions.push("Under 15 sales in one of the years: one or two unusual deals can move the middle value.");
  }
  return { activity, price, cautions };
}
