/** Source lines and the estimate disclaimer. Every figure on a page names its source and date. */
export const DISCLAIMER = "Estimate based on DLD data. Not a valuation or financial advice.";

export const SOURCES = {
  dldSales: "Dubai Land Department sales transactions (Dubai Pulse open data)",
  dldRents: "Dubai Land Department Ejari rent contracts (Dubai Pulse open data)",
  osm: "© OpenStreetMap contributors (ODbL)",
  khda: "KHDA school directory",
  dha: "DHA Sheryan facility directory",
  dm: "Dubai Municipality community boundaries",
} as const;

export const POI_SOURCE: Record<string, string> = {
  osm: SOURCES.osm,
  khda: SOURCES.khda,
  dha_sheryan: SOURCES.dha,
};
