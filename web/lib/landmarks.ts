/** Approximate distance and drive time from a building to key places. Not routed: straight-line distance
 *  times a road factor, at typical off-peak speeds. Shown as estimates, with a link to a real route on
 *  OpenStreetMap. Rush-hour commute times stay in Phase 1b (provider licence needed). */

export type Landmark = { id: string; name: string; lng: number; lat: number };

/** Reference points (approximate centres). Edit here to add places. */
export const LANDMARKS: Landmark[] = [
  { id: "business-bay", name: "Business Bay", lng: 55.2727, lat: 25.1857 },
  { id: "downtown", name: "Downtown Dubai (Burj Khalifa)", lng: 55.2744, lat: 25.1972 },
  { id: "difc", name: "DIFC", lng: 55.2823, lat: 25.2131 },
  { id: "kite-beach", name: "Kite Beach", lng: 55.199, lat: 25.1586 },
  { id: "jumeirah", name: "Jumeirah (Jumeirah Mosque)", lng: 55.2659, lat: 25.2338 },
  { id: "dxb", name: "Dubai International Airport (DXB)", lng: 55.3657, lat: 25.2532 },
];

export const ROAD_FACTOR = 1.35; // roads are longer than a straight line; Dubai grid average, approximate

export function haversineM(aLng: number, aLat: number, bLng: number, bLat: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Off-peak drive minutes: slower for short city trips, faster once a trip reaches the highways. */
export function driveMinutes(straightM: number): number {
  const roadKm = (straightM * ROAD_FACTOR) / 1000;
  const kmh = roadKm < 3 ? 25 : roadKm < 10 ? 40 : 60;
  return Math.max(2, Math.round(((roadKm / kmh) * 60 + 3) / 5) * 5 || 5); // +3 min to park, rounded to 5
}

export function osmRouteUrl(fromLng: number, fromLat: number, toLng: number, toLat: number): string {
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${fromLat.toFixed(5)}%2C${fromLng.toFixed(5)}%3B${toLat.toFixed(5)}%2C${toLng.toFixed(5)}`;
}

export type KeyDistance = { id: string; name: string; straightM: number; roadKm: number; minutes: number; routeUrl: string };

export function keyDistances(lng: number, lat: number, extra: Landmark[] = []): KeyDistance[] {
  return [...extra, ...LANDMARKS].map((l) => {
    const straightM = haversineM(lng, lat, l.lng, l.lat);
    return {
      id: l.id,
      name: l.name,
      straightM,
      roadKm: Math.round((straightM * ROAD_FACTOR) / 100) / 10,
      minutes: driveMinutes(straightM),
      routeUrl: osmRouteUrl(lng, lat, l.lng, l.lat),
    };
  });
}
