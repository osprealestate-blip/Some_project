import { SOURCES } from "@/lib/sources";

/** One entry of the "About these numbers" panel: where a headline figure comes from and how it is made. */
export type FigureFact = { id: string; label: string; source: string; period: string; sample: string; how: string; limits: string };

export type AboutInput = {
  periodEnd: string | null;
  saleCount: number | null | undefined;
  rentCount: number | null | undefined;
  rentLevel: "building" | "project" | "estimated" | null | undefined;
  offPlan?: boolean;
};

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/** Facts for the headline figures of a building page. Only states what we hold: counts, periods and sources.
 *  Nothing here is a verdict or a score. */
export function figureFacts(i: AboutInput): FigureFact[] {
  const sales = i.saleCount ?? 0;
  const rents = i.rentCount ?? 0;
  const period = i.periodEnd ? `12 months to ${i.periodEnd}` : "12 months to the newest sale (date not available)";
  const salesSample = sales > 0 ? plural(sales, "sale", "sales") + " counted" : "No counted sales";
  const rentSample = i.offPlan
    ? "None: off-plan, not completed yet"
    : rents > 0 ? plural(rents, "contract", "contracts") + (i.rentLevel === "estimated" ? ", some placed by unit size" : "") : "No rent contracts recorded";
  const rentLimit =
    i.rentLevel === "project" ? "Rents are filed per project, so this is the whole project's rent, not this tower's."
    : i.rentLevel === "estimated" ? "Some contracts name only the project and were placed in this tower by unit size, so this is an estimate."
    : "Contracts are registered by owners and agents; unusual or very old contracts can sit in the 12 months.";
  return [
    {
      id: "price", label: "Median sale price and price per sq ft", source: SOURCES.dldSales, period, sample: salesSample,
      how: "The middle value of apartment sales registered with DLD. Half sold for less, half for more.",
      limits: "A tower with few sales can swing a lot. Off-plan sales are included. It is what flats sold for, not what they are listed for.",
    },
    {
      id: "change", label: "Change on a year earlier", source: SOURCES.dldSales, period: "Latest 12 months against the 12 before",
      sample: "Needs at least 3 sales in each period",
      how: "Median price per sq ft now compared with the median a year earlier.",
      limits: "Reflects which flats happened to sell as well as price movement.",
    },
    {
      id: "rent", label: "Median annual rent", source: SOURCES.dldRents, period, sample: rentSample,
      how: "The middle value of registered Ejari rent contracts.",
      limits: rentLimit,
    },
    {
      id: "yield", label: "Gross yield (estimate)", source: `${SOURCES.dldSales}; ${SOURCES.dldRents}`, period,
      sample: sales > 0 && rents > 0 ? `${plural(sales, "sale", "sales")} and ${plural(rents, "contract", "contracts")}` : "Needs both sales and rent contracts",
      how: "Median rent divided by median price for the same bedroom type, then the middle across bedroom types.",
      limits: "Before service charge, empty time, upkeep and fees. An estimate, not a promised return. We hold no asking prices, so it is not a listing-based figure.",
    },
  ];
}
