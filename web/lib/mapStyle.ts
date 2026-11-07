/** Basemap settings. OpenFreeMap serves OpenStreetMap vector tiles with no key. It is a donation-funded public
 *  service with no uptime guarantee, so this is the one place to switch to self-hosted PMTiles before launch. */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

/** Dubai, framed on the coast between Dubai Marina and Downtown. */
export const DUBAI_CENTER: [number, number] = [55.205, 25.12]; // [lng, lat]
export const DUBAI_ZOOM = 11.2;
export const DUBAI_PITCH = 45;

/** First view: the three launch communities (Dubai Marina, JVC, Business Bay) with a margin,
 *  [[west, south], [east, north]] from their Dubai Municipality polygons. */
export const LAUNCH_BOUNDS: [[number, number], [number, number]] = [[55.112, 25.038], [55.299, 25.201]];

/** Sequential ramp (one hue, light to dark) for median AED per sq ft on building dots. */
export const PSF_RAMP: [number, string][] = [
  [800, "#cfe1f5"],
  [1400, "#86b4e8"],
  [2000, "#3f86d9"],
  [2800, "#1f5aa6"],
  [3600, "#123a6e"],
];

/** Attribution that must show on every map (OSM licence and Dubai Government open data licence). */
export const MAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> ' +
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> · ' +
  "Community boundaries: Dubai Municipality";

export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Building colours by height in metres, for the 3D layer until real metrics (price per sq ft, yield) exist. */
export const BUILDING_HEIGHT_RAMP: [number, string][] = [
  [0, "#d9dde2"],
  [60, "#b7c4d1"],
  [150, "#8ea6be"],
  [300, "#5f84a8"],
];
