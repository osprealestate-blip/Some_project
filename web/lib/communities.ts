/** Launch communities, matched to the official Dubai Municipality community polygons in
 *  public/data/dubai_communities.geojson by their community number (`code`). The official name is the
 *  statistical community, which differs from the name people use (Marsa Dubai is Dubai Marina). */
export type LaunchCommunity = { code: string; label: string; officialName: string; scope?: string };

export const LAUNCH_COMMUNITIES: readonly LaunchCommunity[] = [
  {
    code: "392",
    label: "Dubai Marina",
    officialName: "Marsa Dubai",
    scope: "Area figures cover all of Marsa Dubai: the Marina towers plus JBR, Bluewaters and Dubai Harbour, where new " +
      "waterfront towers sell higher. Each building page shows that tower alone.",
  },
  { code: "681", label: "JVC", officialName: "Al Barsha South Fourth" },
  { code: "346", label: "Business Bay", officialName: "Business Bay" },
] as const;

export const LAUNCH_CODES: readonly string[] = LAUNCH_COMMUNITIES.map((c) => c.code);

export function launchCommunity(code: string | null | undefined): LaunchCommunity | undefined {
  return LAUNCH_COMMUNITIES.find((c) => c.code === String(code ?? "").trim());
}

export function isLaunchCommunity(code: string | number | null | undefined): boolean {
  if (code === null || code === undefined) return false;
  return LAUNCH_CODES.includes(String(code).trim());
}
