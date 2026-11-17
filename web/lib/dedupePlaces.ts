/** Drops repeated rows in a Nearby list: same name and the same distance (to the nearest 10 m) is one place listed twice
 *  in the source data. Different names, or the same name at a different distance, are kept. Order is preserved. */
export function dedupePlaces<T extends { name: string; distance_m: number }>(places: T[]): T[] {
  const seen = new Set<string>();
  return places.filter((p) => {
    const key = `${p.name.trim().toLowerCase()}|${Math.round(p.distance_m / 10)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
