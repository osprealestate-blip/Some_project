/** Optional map overlays drawn from the basemap's own OpenStreetMap vector tiles (no extra download, no new data
 *  source): Dubai Metro and tram lines with their stations, and the main highways (motorway and trunk roads) with
 *  their route numbers (E11 Sheikh Zayed Road, E611 Emirates Road, E66 Dubai-Al Ain Road and so on).
 *  Lines are only what OpenStreetMap has mapped; line names and colours are not shown because the tiles do not carry them. */
import type { ExpressionSpecification, FilterSpecification, LayerSpecification, Map as MapLibreMap } from "maplibre-gl";

export type Overlays = { metro: boolean; roads: boolean };
export const DEFAULT_OVERLAYS: Overlays = { metro: false, roads: false };
export const METRO_LAYERS = ["ov-metro-casing", "ov-metro", "ov-metro-stations", "ov-metro-labels"];
export const ROAD_LAYERS = ["ov-roads-casing", "ov-roads", "ov-roads-labels"];
const METRO = "#7c3aed";
const ROAD = "#f59e0b";

const width = (a: number, b: number): ExpressionSpecification => ["interpolate", ["exponential", 1.4], ["zoom"], 8, a, 16, b];

export function addTransitLayers(map: MapLibreMap, source: string, beforeId: string | undefined, vis: Overlays): void {
  const font = (map.getStyle().layers ?? []).find((l) => l.type === "symbol" && (l as LayerSpecification & { layout?: Record<string, unknown> }).layout?.["text-font"]) as
    | (LayerSpecification & { layout?: Record<string, unknown> }) | undefined;
  const textFont = (font?.layout?.["text-font"] as string[] | undefined) ?? ["Noto Sans Regular"];
  const v = (on: boolean) => ({ visibility: on ? "visible" : "none" }) as const;
  const roadClass: FilterSpecification = ["in", ["get", "class"], ["literal", ["motorway", "trunk"]]];
  const transit: FilterSpecification = ["all", ["==", ["get", "class"], "transit"], ["in", ["get", "subclass"], ["literal", ["subway", "light_rail", "tram", "monorail"]]]];
  const add = (l: LayerSpecification) => { if (!map.getLayer(l.id)) map.addLayer(l, beforeId); };
  const label = { "text-font": textFont, "text-size": 11, "text-max-width": 8 };
  const halo = { "text-color": "#1f2937", "text-halo-color": "#ffffff", "text-halo-width": 1.6 };

  add({ id: "ov-roads-casing", type: "line", source, "source-layer": "transportation", minzoom: 6, filter: roadClass, layout: { ...v(vis.roads), "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": width(3.5, 14), "line-opacity": 0.9 } });
  add({ id: "ov-roads", type: "line", source, "source-layer": "transportation", minzoom: 6, filter: roadClass, layout: { ...v(vis.roads), "line-cap": "round", "line-join": "round" }, paint: { "line-color": ROAD, "line-width": width(2, 9) } });
  add({
    id: "ov-roads-labels", type: "symbol", source, "source-layer": "transportation_name", minzoom: 9,
    filter: ["all", roadClass, ["has", "ref"], ["!=", ["get", "subclass"], "junction"]],
    layout: { ...v(vis.roads), "symbol-placement": "line", "symbol-spacing": 400, ...label, "text-field": ["format", ["get", "ref"], { "font-scale": 1.1 }, ["case", ["has", "name_en"], ["concat", " · ", ["get", "name_en"]], ""], {}] },
    paint: halo,
  });
  add({ id: "ov-metro-casing", type: "line", source, "source-layer": "transportation", minzoom: 8, filter: transit, layout: { ...v(vis.metro), "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": width(3, 9), "line-opacity": 0.9 } });
  add({ id: "ov-metro", type: "line", source, "source-layer": "transportation", minzoom: 8, filter: transit, layout: { ...v(vis.metro), "line-cap": "round", "line-join": "round" }, paint: { "line-color": METRO, "line-width": width(1.6, 5) } });
  add({
    id: "ov-metro-stations", type: "circle", source, "source-layer": "poi", minzoom: 10.5,
    filter: ["all", ["==", ["get", "class"], "railway"], ["in", ["get", "subclass"], ["literal", ["subway", "light_rail", "tram_stop", "station"]]]],
    layout: v(vis.metro),
    paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 10.5, 3, 16, 7], "circle-color": "#ffffff", "circle-stroke-color": METRO, "circle-stroke-width": 2.2 },
  });
  add({
    id: "ov-metro-labels", type: "symbol", source, "source-layer": "poi", minzoom: 13,
    filter: ["all", ["==", ["get", "class"], "railway"], ["in", ["get", "subclass"], ["literal", ["subway", "light_rail", "tram_stop", "station"]]]],
    layout: { ...v(vis.metro), ...label, "text-field": ["coalesce", ["get", "name_en"], ["get", "name:latin"], ["get", "name"]], "text-anchor": "top", "text-offset": [0, 0.8] },
    paint: { ...halo, "text-color": "#5b21b6" },
  });
}

export function setOverlayVisibility(map: MapLibreMap, o: Overlays): void {
  for (const [ids, on] of [[METRO_LAYERS, o.metro], [ROAD_LAYERS, o.roads]] as const) {
    for (const id of ids) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
  }
}
