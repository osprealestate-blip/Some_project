/** Launch communities, matched to the official Dubai Municipality community polygons in
 *  public/data/dubai_communities.geojson by their community number (`code`). The official name is the
 *  statistical community, which differs from the name people use (Marsa Dubai is Dubai Marina). */
export type LaunchCommunity = { code: string; label: string; officialName: string };

export const LAUNCH_COMMUNITIES: readonly LaunchCommunity[] = [
  { code: "392", label: "Dubai Marina", officialName: "Marsa Dubai" },
  { code: "681", label: "JVC", officialName: "Al Barsha South Fourth" },
  { code: "346", label: "Business Bay", officialName: "Business Bay" },
] as const;

export const LAUNCH_CODES: readonly string[] = LAUNCH_COMMUNITIES.map((c) => c.code);

export function isLaunchCommunity(code: string | number | null | undefined): boolean {
  if (code === null || code === undefined) return false;
  return LAUNCH_CODES.includes(String(code).trim());
}
