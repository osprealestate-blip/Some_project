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
  { id: "jumeirah-beach", name: "Jumeirah Beach (public beach)", lng: 55.2517, lat: 25.2196 },
  { id: "dxb", name: "Dubai International Airport (DXB)", lng: 55.3657, lat: 25.2532 },
];

/** Sheikh Zayed Road, Trade Centre roundabout to Jebel Ali, as a rough line (approximate, from memory of the map).
 *  Distance is to the nearest point on this line. */
export const SHEIKH_ZAYED_ROAD: [number, number][] = [
  [55.287, 25.2285], [55.2795, 25.2135], [55.27, 25.2], [55.2585, 25.1855], [55.247, 25.17], [55.2325, 25.152],
  [55.218, 25.1365], [55.2005, 25.118], [55.1795, 25.1065], [55.161, 25.095], [55.145, 25.075], [55.1305, 25.0595],
  [55.118, 25.045], [55.0905, 25.0215], [55.06, 24.995],
];

/** Nearest point on a line, in a local flat projection (accurate to metres at city scale). */
export function nearestOnLine(lng: number, lat: number, line: [number, number][]): { lng: number; lat: number } {
  const kx = Math.cos((lat * Math.PI) / 180);
  let best = { lng: line[0][0], lat: line[0][1] };
  let bestD = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = [line[i][0] * kx, line[i][1]];
    const [bx, by] = [line[i + 1][0] * kx, line[i + 1][1]];
    const [px, py] = [lng * kx, lat];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
    const [qx, qy] = [ax + t * dx, ay + t * dy];
    const d = (qx - px) ** 2 + (qy - py) ** 2;
    if (d < bestD) {
      bestD = d;
      best = { lng: qx / kx, lat: qy };
    }
  }
  return best;
}

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
  const szr = nearestOnLine(lng, lat, SHEIKH_ZAYED_ROAD);
  const szrLandmark: Landmark = { id: "szr", name: "Sheikh Zayed Road (nearest point)", ...szr };
  return [...extra, szrLandmark, ...LANDMARKS].map((l) => {
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
