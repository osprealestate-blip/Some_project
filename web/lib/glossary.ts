/** Plain-language definitions used by <Term> tooltips and the glossary on /how-it-works.
 *  Wording only: nothing here changes how a figure is calculated. */
export type GlossaryEntry = { id: string; term: string; short: string; long: string };

export const GLOSSARY = [
  {
    id: "gross-yield",
    term: "Gross yield",
    short: "A year's rent as a share of the price, before any costs. A 6% gross yield means rent of about AED 6 a year for every AED 100 of price.",
    long: "Median annual rent divided by median sale price, for the same bedroom type and the same 12 months. It is gross because it ignores service charges, vacancy between tenants, agent fees and repairs, so what an owner actually keeps is lower. We show it as an estimate, and only next to the rent it comes from.",
  },
  {
    id: "price-per-sq-ft",
    term: "Price per sq ft",
    short: "The sale price divided by the flat's size in square feet. It lets you compare flats of different sizes.",
    long: "Each sale's price divided by its size, then the median of those figures. A studio and a three-bed can be compared on this line. Floor, view and condition still change what a particular flat is worth, and a median is a typical value, not a price any one flat sold for.",
  },
  {
    id: "dld",
    term: "DLD",
    short: "Dubai Land Department, the government body that registers property sales and transfers in Dubai.",
    long: "Dubai Land Department registers every property sale and publishes anonymised sales records as open data on Dubai Pulse. All sale prices on this site come from those records. Names of buyers, sellers and unit numbers are never shown.",
  },
  {
    id: "ejari",
    term: "Ejari",
    short: "Dubai's registration system for tenancy contracts. Rent figures here come from registered Ejari contracts, not from adverts.",
    long: "Ejari is the system where tenancy contracts are registered in Dubai. We use the rent in those contracts, which is what tenants actually agreed to pay. These are not asking rents. Contracts are filed per project, not per tower, so a building's rent is sometimes the whole project's, and we say so when it is.",
  },
  {
    id: "service-charge",
    term: "Service charge",
    short: "The yearly fee an owner pays for running the building: cleaning, security, lifts, shared facilities. It is charged per sq ft.",
    long: "Owners pay it to the building's management every year, usually as an amount per sq ft. It differs by building and is not in the DLD data, so the cost calculator uses a general assumption that you can change. Check the real figure for a building before you buy.",
  },
  {
    id: "off-plan",
    term: "Off-plan and ready",
    short: "Off-plan means bought from the developer before the building is finished. Ready means a finished home, usually resold by an owner.",
    long: "DLD records whether a sale was made by the developer before completion (off-plan) or of a completed home (ready). Off-plan prices often follow a payment plan and can sit above or below ready prices, so we show them separately on area pages. A building with only off-plan sales may have no rent contracts yet.",
  },
  {
    id: "median",
    term: "Median",
    short: "The middle value: half of the deals were above it and half below. One unusual deal barely moves it.",
    long: "We use medians instead of averages so that a typo or an unusual deal cannot pull a figure up or down. A median needs at least 3 deals, otherwise we show a dash.",
  },
] as const satisfies readonly GlossaryEntry[];

export type TermId = (typeof GLOSSARY)[number]["id"];

export function glossaryEntry(id: TermId): GlossaryEntry {
  return GLOSSARY.find((g) => g.id === id)!;
}

export const termAnchor = (id: TermId) => `term-${id}`;
