/** Named places on the main map (arenas, malls, hotels, sights, parks), so visitors can find their way. The list is
 *  public/data/dubai_landmarks.geojson, made from OpenStreetMap by `dpi fetch-landmarks`: names, types and positions are
 *  OpenStreetMap's, and the card says so with the date. The map's own collision rules drop any name that would overlap
 *  another, and lesser-known places only appear when zoomed in. */
import type { LayerSpecification, Map as MapLibreMap } from "maplibre-gl";

export type VenueKind = "arena" | "mall" | "hotel" | "attraction" | "museum" | "venue" | "golf" | "park";
export type VenueProps = { name: string; nameAr?: string; kind: VenueKind; tier: 1 | 2 | 3; osm: string };
export type Venues = GeoJSON.FeatureCollection<GeoJSON.Point, VenueProps> & { meta: { source: string; asOf: string } };

export const VENUES_URL = "/data/dubai_landmarks.geojson";

export const VENUE_KINDS: Record<VenueKind, { label: string; colour: string }> = {
  arena: { label: "Arena or stadium", colour: "#be185d" },
  mall: { label: "Mall", colour: "#1d4ed8" },
  hotel: { label: "Hotel", colour: "#7c3aed" },
  attraction: { label: "Attraction", colour: "#c2410c" },
  museum: { label: "Museum", colour: "#92400e" },
  venue: { label: "Theatre or event venue", colour: "#be185d" },
  golf: { label: "Golf course", colour: "#15803d" },
  park: { label: "Park", colour: "#15803d" },
};

/** The zoom from which each tier is named. */
export const TIER_ZOOM = { 1: 11.5, 2: 13, 3: 14.5 } as const;

/** Bottom to top: the map places upper layers first, so the best-known names win any overlap. */
export const VENUE_LAYERS = ["dpi-venues-3", "dpi-venues-2", "dpi-venues-1"];
const SOURCE = "dpi-venues";

/** A round dot in the kind's colour with a white rim, drawn here so no icon files are needed. */
function dot(colour: string): ImageData | null {
  const c = document.createElement("canvas");
  c.width = c.height = 22;
  const g = c.getContext("2d");
  if (!g) return null;
  g.beginPath();
  g.arc(11, 11, 8, 0, Math.PI * 2);
  g.fillStyle = colour;
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = "#ffffff";
  g.stroke();
  return g.getImageData(0, 0, 22, 22);
}

/** Adds the layers to the current style, or refreshes nothing if they are there already (call after every style load). */
export function addVenueLayers(map: MapLibreMap, data: Venues, dark: boolean): void {
  if (map.getSource(SOURCE)) return;
  const font = (map.getStyle().layers ?? []).find((l) => l.type === "symbol" && (l as LayerSpecification & { layout?: Record<string, unknown> }).layout?.["text-font"]) as
    | (LayerSpecification & { layout?: Record<string, unknown> }) | undefined;
  const textFont = (font?.layout?.["text-font"] as string[] | undefined) ?? ["Noto Sans Regular"];
  for (const [kind, k] of Object.entries(VENUE_KINDS)) {
    const image = map.hasImage(`venue-${kind}`) ? null : dot(k.colour);
    if (image) map.addImage(`venue-${kind}`, image, { pixelRatio: 2 });
  }
  map.addSource(SOURCE, { type: "geojson", data });
  for (const tier of [3, 2, 1] as const) {
    map.addLayer({
      id: `dpi-venues-${tier}`,
      type: "symbol",
      source: SOURCE,
      minzoom: TIER_ZOOM[tier],
      filter: ["==", ["get", "tier"], tier],
      layout: {
        "icon-image": ["concat", "venue-", ["get", "kind"]],
        "text-field": ["get", "name"],
        "text-font": textFont,
        "text-size": ["interpolate", ["linear"], ["zoom"], 11.5, 10.5, 16, 12.5],
        "text-max-width": 8,
        "text-anchor": "top",
        "text-offset": [0, 0.6],
        // Room round each name, so the map never fills up with text.
        "text-padding": 6,
      },
      paint: {
        "text-color": dark ? "#f1f5f9" : "#1f2937",
        "text-halo-color": dark ? "#0f172a" : "#ffffff",
        "text-halo-width": 1.6,
      },
    });
  }
}

export function setVenueVisibility(map: MapLibreMap, on: boolean): void {
  for (const id of VENUE_LAYERS) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
}

/** The named place under a tap or the pointer, if any. A few pixels of slack make small dots easy to hit on a phone. */
export function venueAt(map: MapLibreMap, point: { x: number; y: number }): { props: VenueProps; lngLat: [number, number] } | null {
  const layers = VENUE_LAYERS.filter((l) => map.getLayer(l));
  if (!layers.length) return null;
  const hit = map.queryRenderedFeatures([[point.x - 6, point.y - 6], [point.x + 6, point.y + 6]], { layers })[0];
  if (!hit || hit.geometry.type !== "Point") return null;
  return { props: hit.properties as VenueProps, lngLat: hit.geometry.coordinates as [number, number] };
}

/** The small card for a place. Built with DOM nodes, never innerHTML: names are data. */
export function venueCard(p: VenueProps, asOf: string, rtl: boolean, t: (k: string, v?: Record<string, string>) => string, day: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "dpi-card";
  const title = document.createElement("div");
  title.className = "dpi-card-title";
  title.textContent = rtl && p.nameAr ? p.nameAr : p.name;
  const sub = document.createElement("div");
  sub.className = "dpi-card-sub";
  sub.textContent = t(VENUE_KINDS[p.kind].label);
  const foot = document.createElement("div");
  foot.className = "dpi-card-foot";
  foot.textContent = asOf ? t("Source: OpenStreetMap, {date}", { date: day }) : t("Source: OpenStreetMap");
  el.append(title, sub, foot);
  return el;
}
