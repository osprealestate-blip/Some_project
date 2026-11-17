/** A short list of things to check before buying. These are questions to ask and records to look at, not legal rules:
 *  the app states no law or fee. Items switch on from facts we hold about the building. */
export type OfficialLink = { id: string; label: string; url: string };

/** Home pages of the official bodies only (no deep links, which change). NOT yet opened and confirmed by us:
 *  the build sandbox cannot reach these hosts. Owner to click each before launch. */
export const OFFICIAL_LINKS: OfficialLink[] = [
  { id: "dld", label: "Dubai Land Department", url: "https://dubailand.gov.ae" },
  { id: "rest", label: "Dubai REST (real estate services)", url: "https://dubairest.gov.ae" },
];

export type ChecklistFacts = { offPlan: boolean; sales12m: number; rentLevel: "building" | "project" | "estimated" | null; rentCount: number; hasCompletionYear: boolean };
export type CheckItem = { id: string; text: string; why?: string };

export function buyChecklist(f: ChecklistFacts): CheckItem[] {
  const items: CheckItem[] = [
    { id: "deed", text: "Ask the seller for the title deed and check it with the Dubai Land Department.", why: "Confirms the seller is the registered owner." },
    { id: "charges", text: "Ask for the latest service-charge statement and any unpaid amounts for the unit.", why: "We do not hold real service charges; the cost figures here use an assumed rate." },
    { id: "comps", text: "Compare the asking price with the comparable sales on this page, for the same bedrooms and size.", why: "A price per sq ft far from the middle value needs an explanation." },
    { id: "advice", text: "Have a lawyer or licensed adviser read the contract before you pay a deposit." },
  ];
  if (f.offPlan) {
    items.splice(1, 0,
      { id: "project", text: "Check the project is registered with the Dubai Land Department and who the developer is.", why: "Most recent sales here were off-plan." },
      { id: "handover", text: "Ask for the written handover date and the payment plan, and what happens if the date slips.", why: "Planned dates in the open data can be blank or out of date." },
    );
  } else {
    items.splice(1, 0, { id: "snag", text: "Visit the unit and ask about repairs, snagging and who pays for them." });
  }
  if (f.sales12m < 5) items.push({ id: "few", text: "Few sales were counted here in 12 months, so ask an adviser for other recent sales nearby.", why: `${f.sales12m} counted.` });
  const rentTower = f.rentLevel === "building" && f.rentCount >= 3;
  if (!rentTower) {
    items.push({ id: "rent", text: "Ask for the current tenancy contract, or evidence of rents for this exact tower, before relying on a yield.", why: f.rentLevel == null || f.rentCount < 3 ? "We have too little rent evidence for this building." : "Our rent figure is not for this tower alone." });
  }
  if (!f.hasCompletionYear && !f.offPlan) items.push({ id: "year", text: "Ask for the completion year of the building; we do not have it confirmed." });
  return items;
}
