/** Map settings shared by every map. Basemap styles (themes) are in mapThemes.ts. OpenFreeMap serves OpenStreetMap
 *  vector tiles with no key. It is a donation-funded public service with no uptime guarantee, so mapThemes.ts is the
 *  one place to switch to self-hosted PMTiles before launch. */

export const DUBAI_PITCH = 45;

/** First view: the three launch communities (Dubai Marina, JVC, Business Bay) with a margin,
 *  [[west, south], [east, north]] from their Dubai Municipality polygons. */
export const LAUNCH_BOUNDS: [[number, number], [number, number]] = [[55.112, 25.038], [55.299, 25.201]];

/** Attribution that must show on every map (OSM licence, OpenMapTiles schema, Dubai Government open data licence). */
export const MAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> ' +
  '<a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">© OpenMapTiles</a> ' +
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> · ' +
  "Community boundaries: Dubai Municipality · Figures: Dubai Land Department";

export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
