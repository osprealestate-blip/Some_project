/**
 * The "Illustrated" map theme: a soft, pastel, cartoon-like 3D look built only from our usual OpenFreeMap
 * OpenStreetMap tiles (the liberty style), recoloured in the browser. No imagery, no keys, no paid service.
 *
 * Style reference only: nothing here copies any third-party artwork, labels or logos. Landmark tags are our own
 * hand-placed points (approximate centres, read off OpenStreetMap) drawn as plain text.
 *
 * Rules for this file:
 * - The basemap is recoloured by OpenMapTiles source-layer and class, not by layer id, so it keeps working if
 *   OpenFreeMap renames layers.
 * - Our data layers (dpi-*), the community outlines and their colour-by logic are never touched here.
 * - Never call setStyle(): theme switching belongs to BuildingMap.tsx.
 */
import type maplibregl from "maplibre-gl";
import type { ExpressionSpecification } from "maplibre-gl";

/** All Illustrated colours in one place. */
export const ILLUSTRATED_PALETTE = {
  land: "#f6ecd6", // soft pastel sand
  sand: "#f1e0bb", // beaches and desert, a touch warmer
  urban: "#f3ead8", // built-up landuse, close to the land so the city reads as one soft surface
  water: "#3fb4e8", // bright blue sea
  waterLabel: "#ffffff",
  waterLabelHalo: "#2a8fc4",
  park: "#9fd88a", // parks, golf courses, grass
  wood: "#86c97a",
  road: "#e3e5e9", // light grey roads
  roadCasing: "#cfd3d9",
  rail: "#c4c8cf",
  airport: "#e9e4d8",
  building: "#fbfbfa", // soft white 3D buildings around ours
  buildingOutline: "#c9ced6", // light footprint outline
  sky: "#bfe6f7",
  horizon: "#fdf6e9",
} as const;

/** The opening view: tilted and turned so the coast runs across the screen with the sea at the top, framing
 *  the Palm, Dubai Harbour, Dubai Marina, JBR and JLT. Buildings in the tiles start at zoom 13. */
export function illustratedCamera(viewportWidth: number) {
  return {
    center: [55.142, 25.093] as [number, number],
    zoom: viewportWidth < 640 ? 13 : 13.4,
    pitch: 58,
    bearing: -40,
  };
}

/** Landmark tags. Hand-placed approximate centres (OpenStreetMap), no lookup at run time. */
export const ILLUSTRATED_LANDMARKS: ReadonlyArray<{ name: string; lng: number; lat: number }> = [
  { name: "Burj Al Arab", lng: 55.1853, lat: 25.1412 },
  { name: "Palm Jumeirah", lng: 55.1385, lat: 25.1165 },
  { name: "Atlantis", lng: 55.1172, lat: 25.1305 },
  { name: "Dubai Harbour", lng: 55.1338, lat: 25.0925 },
  { name: "Bluewaters", lng: 55.1205, lat: 25.0800 },
  { name: "JBR", lng: 55.1340, lat: 25.0780 },
  { name: "Dubai Marina", lng: 55.1405, lat: 25.0810 },
  { name: "JLT", lng: 55.1445, lat: 25.0705 },
  { name: "Internet City", lng: 55.1560, lat: 25.0975 },
  { name: "Emirates Golf Club", lng: 55.1580, lat: 25.0830 },
  { name: "Dubai Mall", lng: 55.2796, lat: 25.1980 },
];

/** Below this zoom the tags would pile on top of each other, so they hide. */
export const LANDMARK_MIN_ZOOM = 11;

type StyleLayer = { id: string; type: string; "source-layer"?: string };
type Override = { paint?: Record<string, unknown>; layout?: Record<string, unknown> };

const P = ILLUSTRATED_PALETTE;
const cls: ExpressionSpecification = ["get", "class"];

/**
 * What the Illustrated theme changes on one basemap layer, or null to leave it as it is. Pure, so it is tested
 * without a map. Building layers are left alone: BuildingMap.tsx already hides them and draws its own 3D layer.
 */
export function illustratedOverride(layer: StyleLayer): Override | null {
  const src = layer["source-layer"];
  const { id, type } = layer;
  if (type === "background") return { paint: { "background-color": P.land } };
  if (!src || src === "building") return null;

  if (type === "fill") {
    switch (src) {
      case "water":
        return { paint: { "fill-color": P.water, "fill-opacity": 1 } };
      case "park":
        return { paint: { "fill-color": P.park, "fill-opacity": 0.9 } };
      case "landcover":
        return {
          paint: {
            "fill-color": ["match", cls, ["grass", "farmland", "wetland"], P.park, "wood", P.wood, "sand", P.sand, P.land],
            "fill-opacity": 0.9,
          },
        };
      case "landuse":
        return {
          paint: {
            "fill-color": ["match", cls, ["pitch", "stadium", "playground", "garden", "cemetery"], P.park, P.urban],
            "fill-opacity": 0.7,
          },
        };
      case "aeroway":
        return { paint: { "fill-color": P.airport } };
      default:
        return null;
    }
  }

  if (type === "line") {
    if (src === "waterway") return { paint: { "line-color": P.water } };
    if (src === "park") return { paint: { "line-color": P.wood, "line-opacity": 0.5 } };
    if (src === "transportation") {
      if (/rail|transit/.test(id)) return { paint: { "line-color": P.rail } };
      if (/casing/.test(id)) return { paint: { "line-color": P.roadCasing } };
      return { paint: { "line-color": P.road } };
    }
    return null;
  }

  if (type === "symbol") {
    // Shop, café and house-number icons clutter the cartoon look; the landmark tags take their place.
    if (src === "poi" || src === "housenumber" || src === "mountain_peak") return { layout: { visibility: "none" } };
    if (src === "water_name") return { paint: { "text-color": P.waterLabel, "text-halo-color": P.waterLabelHalo } };
    if (src === "place" || src === "transportation_name") return { paint: { "text-halo-color": "#ffffff", "text-halo-width": 1.5 } };
    return null;
  }
  return null;
}

/**
 * Recolour the current style and soften the light. Call after BuildingMap.tsx has added its "base-3d" layer.
 * Safe to call again on the same style.
 */
export function applyIllustratedOverrides(map: maplibregl.Map): void {
  const layers = (map.getStyle()?.layers ?? []) as StyleLayer[];
  for (const layer of layers) {
    const o = illustratedOverride(layer);
    if (!o) continue;
    for (const [k, v] of Object.entries(o.paint ?? {})) {
      try {
        map.setPaintProperty(layer.id, k, v);
      } catch {
        /* a property this layer type does not take: leave it */
      }
    }
    for (const [k, v] of Object.entries(o.layout ?? {})) {
      try {
        map.setLayoutProperty(layer.id, k, v);
      } catch {
        /* as above */
      }
    }
  }

  // Soft white buildings with a light footprint outline under them.
  if (map.getLayer("base-3d")) {
    map.setPaintProperty("base-3d", "fill-extrusion-color", P.building);
    map.setPaintProperty("base-3d", "fill-extrusion-opacity", 0.92);
    map.setPaintProperty("base-3d", "fill-extrusion-vertical-gradient", true);
    const source = (map.getLayer("base-3d") as { source?: string } | undefined)?.source;
    if (source && !map.getLayer("illustrated-building-outline")) {
      map.addLayer(
        {
          id: "illustrated-building-outline",
          type: "line",
          source,
          "source-layer": "building",
          minzoom: 14,
          paint: { "line-color": P.buildingOutline, "line-width": 0.8 },
        },
        "base-3d",
      );
    }
  }

  // A low, warm light from the south-west gives the soft shading; a pale sky closes the tilted horizon.
  map.setLight({ anchor: "map", color: "#ffffff", intensity: 0.32, position: [1.3, 210, 35] });
  try {
    map.setSky({ "sky-color": P.sky, "horizon-color": P.horizon, "fog-color": P.horizon, "sky-horizon-blend": 0.6, "horizon-fog-blend": 0.6, "fog-ground-blend": 0.9 });
  } catch {
    /* older renderer without sky: the plain background shows instead */
  }
}

/** A white rounded tag. DOM nodes, never innerHTML. Clicks pass through to the buildings underneath. */
function tag(name: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "dpi-landmark";
  const label = document.createElement("span");
  label.className = "dpi-landmark-label";
  label.textContent = name;
  const pin = document.createElement("span");
  pin.className = "dpi-landmark-pin";
  pin.setAttribute("aria-hidden", "true");
  el.append(label, pin);
  return el;
}

/** Add the landmark tags. Returns a function that removes them again. */
export function showLandmarks(map: maplibregl.Map, Marker: typeof maplibregl.Marker): () => void {
  const markers = ILLUSTRATED_LANDMARKS.map((lm) =>
    new Marker({ element: tag(lm.name), anchor: "bottom" }).setLngLat([lm.lng, lm.lat]).addTo(map),
  );
  const sync = () => {
    const hide = map.getZoom() < LANDMARK_MIN_ZOOM;
    for (const m of markers) m.getElement().style.visibility = hide ? "hidden" : "";
  };
  sync();
  map.on("zoomend", sync);
  return () => {
    try {
      map.off("zoomend", sync);
      for (const m of markers) m.remove();
    } catch {
      /* the map was already removed with the page */
    }
  };
}

/** Move to the Illustrated view: a gentle flight, or a jump when the visitor prefers reduced motion. */
export function goToIllustratedView(map: maplibregl.Map): void {
  const cam = illustratedCamera(map.getContainer().clientWidth);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) map.jumpTo(cam);
  else map.flyTo({ ...cam, duration: 1800 });
}
