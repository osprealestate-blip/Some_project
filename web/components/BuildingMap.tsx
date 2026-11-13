"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import maplibregl, { type ExpressionSpecification, type FilterSpecification, type MapLayerMouseEvent } from "maplibre-gl";
import { DEFAULT_CURRENCY, type Currency } from "@/config/currency";
import { LAUNCH_CODES } from "@/lib/communities";
import { formatPsf, formatShortPrice, pct } from "@/lib/format";
import { applyIllustratedOverrides, goToIllustratedView, illustratedCamera, showLandmarks } from "@/lib/illustratedTheme";
import {
  DEFAULT_SETTINGS, METRICS, colourise, legendItems, parseSettings, type MapBuildingProps, type MapSettings,
} from "@/lib/mapMetrics";
import { DUBAI_PITCH, LAUNCH_BOUNDS, MAP_ATTRIBUTION, webglAvailable } from "@/lib/mapStyle";
import { DEFAULT_THEME, THEMES, parseTheme, type ThemeId } from "@/lib/mapThemes";
import dynamic from "next/dynamic";
import { fetchCard } from "@/lib/cardClient";
import { MAP_COMPARE_MAX as MAX_COMPARE } from "@/lib/mapCompare";

// The card, panel, compare table and For you list load when first used, not with the map.
const ForYouPanel = dynamic(() => import("./ForYouPanel"));
const CompareTray = dynamic(() => import("./CompareTray"));
const BuildingCard = dynamic(() => import("./BuildingCard"));
import { FACILITIES, iconSvg, km, type FacilityId, type NearestFacility } from "@/lib/facilities";
import { fetchRoute } from "@/lib/routeClient";
import { labelPoint, routeLines, type RouteMap } from "@/lib/routeLines";
import { minutesLabel, type RouteMode } from "@/lib/routing";
import MapControls from "./MapControls";

type Props = {
  focus?: { lng: number; lat: number } | null;
  bounds?: [[number, number], [number, number]] | null;
  className?: string;
  currency?: Currency;
  /** "full": colour, scale and theme settings with the legend. "legend": the legend only (small maps). */
  controls?: "full" | "legend";
  /** The main map: a click selects the building and opens the card over the map (URL: ?building=slug). Other maps
   *  open the full building page instead. */
  cardMode?: boolean;
};

type Props3 = MapBuildingProps & { lng: number; lat: number; height: number };
type Feature = { type: "Feature"; geometry: GeoJSON.Geometry; properties: Props3 };
type Collection = { type: "FeatureCollection"; features: Feature[]; meta?: { periodEnd?: string | null } };

const STORE = { settings: "dpi.map.settings", theme: "dpi.map.theme" };
const CAMERA_KEY = "dpi.map.camera"; // this tab only: where the map was, so Back to map returns there
const SELECTED_ATTR = "data-building-selected";
const CYAN = "#22d3ee";
const DPI_LAYERS = ["dpi-3d", "dpi-3d-approx", "dpi-columns", "dpi-columns-minor"];
/** Adaptive density: zoomed far out only buildings with this many sales (12 months) get a column, so the city stays readable. */
const BUSY_SALES = 10;
const MINOR_FROM_ZOOM = 12.8;
const DPI_SOURCES = ["dpi-footprints", "dpi-columns"];
const COLUMN_HALF_M = 55; // zoomed-out stand-in for each building: a 110 m square column
/** A square polygon of half-side `half` metres around a point. */
function square(lng: number, lat: number, half: number): GeoJSON.Polygon {
  const dLat = half / 111_320;
  const dLng = half / (111_320 * Math.cos((lat * Math.PI) / 180));
  return { type: "Polygon", coordinates: [[[lng - dLng, lat - dLat], [lng + dLng, lat - dLat], [lng + dLng, lat + dLat], [lng - dLng, lat + dLat], [lng - dLng, lat - dLat]]] };
}

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

function load(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function save(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode: the choice lasts for this visit only */
  }
}

/** The hover / tap card. Built with DOM nodes, never innerHTML: names are data. */
function card(p: Props3, s: MapSettings, currency: Currency, onOpen: (() => void) | null): HTMLElement {
  const el = document.createElement("div");
  el.className = "dpi-card";
  const title = document.createElement("div");
  title.className = "dpi-card-title";
  title.textContent = p.name;
  el.append(title);
  if (p.community) {
    const sub = document.createElement("div");
    sub.className = "dpi-card-sub";
    sub.textContent = p.community;
    el.append(sub);
  }
  const rows: [keyof typeof METRICS, string, string][] = [
    ["psf", "Price per sq ft", formatPsf(p.psf, currency)],
    ["yield", "Gross yield (est.)", pct(p.yield)],
    ["rent", p.rentLevel === "project" ? "Rent (whole project)" : p.rentLevel === "estimated" ? "Rent (estimated)" : "Median rent", p.rent == null ? "–" : `${formatShortPrice(p.rent, currency)}/yr`],
    ["change", "12-month change", pct(p.change, 1, true)],
    ["sales", "Sales, 12 months", String(p.sales ?? 0)],
  ];
  const dl = document.createElement("dl");
  for (const [id, label, value] of rows) {
    const row = document.createElement("div");
    if (id === s.metric) row.className = "is-metric";
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    row.append(dt, dd);
    dl.append(row);
  }
  el.append(dl);
  const foot = document.createElement("div");
  foot.className = "dpi-card-foot";
  foot.textContent = p.approx ? "Approximate position · DLD, 12 months" : "DLD, 12 months";
  el.append(foot);
  if (onOpen) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dpi-card-open";
    btn.textContent = "View details";
    btn.addEventListener("click", onOpen);
    el.append(btn);
  } else {
    const hint = document.createElement("div");
    hint.className = "dpi-card-hint";
    hint.textContent = "Click for details";
    el.append(hint);
  }
  return el;
}

/** The map page's URL for a selection, keeping the compare list. Browser only. */
function mapUrl(slug: string | null, view?: string | null): string {
  const sp = new URLSearchParams();
  if (slug) sp.set("building", slug);
  if (slug && view) sp.set("view", view);
  const cur = new URLSearchParams(window.location.search);
  const c = cur.get("compare");
  if (c) sp.set("compare", c);
  const m = cur.get("m");
  if (m) sp.set("m", m);
  const q = sp.toString();
  return `/map${q ? `?${q}` : ""}`;
}

function readCamera(): { c: [number, number]; z: number; p: number; b: number } | null {
  try {
    const v = JSON.parse(window.sessionStorage.getItem(CAMERA_KEY) ?? "null");
    return v && Array.isArray(v.c) && v.c.length === 2 && [v.z, v.p, v.b].every((n: unknown) => typeof n === "number") ? v : null;
  } catch {
    return null;
  }
}

export default function BuildingMap({
  focus = null, bounds = null, className = "h-full w-full", currency = DEFAULT_CURRENCY, controls = "full", cardMode = false,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const router = useRouter();
  const params = useSearchParams();
  const selected = cardMode ? params.get("building") : null;
  const view: "card" | "panel" = params.get("view") === "panel" ? "panel" : "card";

  const [noWebgl, setNoWebgl] = useState(false);
  const [raw, setRaw] = useState<Collection | null>(null);
  const [settings, setSettings] = useState<MapSettings>(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);
  const [hidden, setHidden] = useState<number[]>([]);
  const [ready, setReady] = useState(false); // settings read from the browser
  const [styleGen, setStyleGen] = useState(0); // bumps each time a style finishes loading
  const [nearby, setNearby] = useState(false); // location mode: lines to the nearest places
  const [hiddenKinds, setHiddenKinds] = useState<FacilityId[]>([]);
  const [facilities, setFacilities] = useState<NearestFacility[]>([]);
  const [routeMode, setRouteMode] = useState<"line" | RouteMode>("line"); // straight line, or real walking / driving routes
  const [routes, setRoutes] = useState<RouteMap>({});
  const [compare, setCompare] = useState<string[]>([]);
  const [forYou, setForYou] = useState(false);
  const [thinned, setThinned] = useState(false); // zoomed out far enough that only busy buildings are drawn

  // Everything the map event handlers need, current without re-binding them.
  const live = useRef({ settings, currency, theme, selected, hover: null as string | null, baseKey: null as string | null, restored: false });
  live.current.settings = settings;
  live.current.currency = currency;
  live.current.theme = theme;
  live.current.selected = selected;

  const coloured = useMemo(() => (raw ? colourise(raw.features, settings) : null), [raw, settings]);

  // Other maps (building and community pages): a click goes to the full building page.
  const open = useCallback((slug: string) => router.push(`/building/${encodeURIComponent(slug)}`), [router]);

  // The main map keeps the visitor on the map. The selection lives in the URL (?building=slug, &view=panel), so a
  // shared link opens the card, and the browser Back button steps back: panel, then card, then the page before.
  const panelPushed = useRef(false);
  const select = useCallback((slug: string, keepView = false) => {
    const sp = new URLSearchParams(window.location.search);
    const had = sp.has("building");
    const v = keepView ? sp.get("view") : null;
    const url = mapUrl(slug, v);
    if (had) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
  }, []);
  const setView = useCallback((v: "card" | "panel") => {
    const slug = new URLSearchParams(window.location.search).get("building");
    if (!slug) return;
    if (v === "panel") {
      panelPushed.current = true;
      window.history.pushState(null, "", mapUrl(slug, "panel"));
    } else if (panelPushed.current) {
      panelPushed.current = false;
      window.history.back();
    } else window.history.replaceState(null, "", mapUrl(slug));
  }, []);
  const closeCard = useCallback(() => {
    panelPushed.current = false;
    window.history.replaceState(null, "", mapUrl(null));
  }, []);

  // 1. Read saved choices, then create the map.
  useEffect(() => {
    if (!container.current) return;
    if (!webglAvailable()) {
      setNoWebgl(true);
      return;
    }
    const savedTheme = parseTheme(load(STORE.theme));
    // A shared link can carry the colour layer (?m=yield); it wins over the saved choice.
    const shared = cardMode ? new URLSearchParams(window.location.search).get("m") : null;
    const base = parseSettings(load(STORE.settings));
    setSettings(shared && shared in METRICS ? { ...base, metric: shared as MapSettings["metric"] } : base);
    setTheme(savedTheme);
    setReady(true);
    live.current.theme = savedTheme;

    // The Illustrated theme opens on its own tilted coast view, unless this map was given a place to show.
    const saved = cardMode && !focus && !bounds ? readCamera() : null;
    live.current.restored = !!saved;
    const illustratedStart = savedTheme === "illustrated" && !focus && !bounds && !saved;
    const map = new maplibregl.Map({
      container: container.current,
      style: THEMES[savedTheme].styleUrl,
      ...(saved
        ? { center: saved.c, zoom: saved.z, pitch: saved.p, bearing: saved.b }
        : illustratedStart
        ? illustratedCamera(container.current.clientWidth)
        : focus
          ? { center: [focus.lng, focus.lat] as [number, number], zoom: 15.5, pitch: DUBAI_PITCH }
          : { bounds: bounds ?? LAUNCH_BOUNDS, fitBoundsOptions: { padding: 24 }, pitch: DUBAI_PITCH }),
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: MAP_ATTRIBUTION }));
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
    map.on("style.load", () => setStyleGen((g) => g + 1));
    // Says so when the smaller buildings are left out at this zoom.
    const syncZoom = () => setThinned(map.getZoom() < MINOR_FROM_ZOOM);
    map.on("zoom", syncZoom);
    map.on("load", syncZoom);
    if (cardMode) {
      map.on("moveend", () => {
        const c = map.getCenter();
        try { window.sessionStorage.setItem(CAMERA_KEY, JSON.stringify({ c: [c.lng, c.lat], z: map.getZoom(), p: map.getPitch(), b: map.getBearing() })); } catch { /* the view is just not remembered */ }
      });
    }

    // Hover and tap. Touch screens have no hover: a tap shows the card with a "View details" button.
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    // The hover card must never catch the mouse: it opens near the building under the pointer, and a card that steals the
    // pointer makes the canvas see "mouse left", which closed the card and flickered the cursor. Touch cards stay tappable.
    const popup = new maplibregl.Popup({ closeButton: !canHover, closeOnClick: false, offset: 14, maxWidth: "260px", className: canHover ? "dpi-popup dpi-popup-hover" : "dpi-popup" });
    const setHover = (slug: string | null) => {
      const prev = live.current.hover;
      if (prev === slug) return;
      for (const src of DPI_SOURCES) {
        if (!map.getSource(src)) continue;
        if (prev) map.setFeatureState({ source: src, id: prev }, { hover: false });
        if (slug) map.setFeatureState({ source: src, id: slug }, { hover: true });
      }
      live.current.hover = slug;
    };
    const featureAt = (e: MapLayerMouseEvent) => e.features?.[0]?.properties as Props3 | undefined;
    const show = (p: Props3, withButton: boolean) => {
      const { settings: s, currency: c } = live.current;
      popup.setLngLat([p.lng, p.lat]).setDOMContent(card(p, s, c, withButton ? () => open(p.slug) : null)).addTo(map);
    };
    // One handler for the whole map (not one per layer). Our priced buildings sit in three overlapping layers (3D,
    // approximate, zoomed-out columns); per-layer enter/leave events fired against each other as the pointer moved,
    // which flickered the cursor and the card. Here the pointer is hit-tested once per move and the result applied once.
    const setBaseHover = (f: maplibregl.MapGeoJSONFeature | null) => {
      const src = map.getSource("base-hover") as maplibregl.GeoJSONSource | undefined;
      if (!src) return;
      const g = f ? (f.geometry as GeoJSON.Geometry) : null;
      const key = f ? `${f.id ?? ""}|${JSON.stringify((g as GeoJSON.Polygon).coordinates?.[0]?.[0] ?? "")}|${f.properties?.render_height ?? ""}` : null;
      if (key === live.current.baseKey) return;
      live.current.baseKey = key;
      src.setData(f && g
        ? { type: "FeatureCollection", features: [{ type: "Feature", geometry: g, properties: { h: Number(f.properties?.render_height ?? 4), b: Number(f.properties?.render_min_height ?? 0) } }] }
        : EMPTY);
    };
    let leaveTimer: ReturnType<typeof setTimeout> | null = null;
    let prefetchTimer: ReturnType<typeof setTimeout> | null = null;
    const clearHover = () => {
      leaveTimer = null;
      setHover(null);
      setBaseHover(null);
      map.getCanvas().style.cursor = "";
      popup.remove();
    };
    map.on("mousemove", (e) => {
      if (!canHover) return;
      const priced = DPI_LAYERS.filter((l) => map.getLayer(l));
      const hit = priced.length ? map.queryRenderedFeatures(e.point, { layers: priced })[0] : undefined;
      const p = hit?.properties as Props3 | undefined;
      if (p) {
        if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
        setBaseHover(null);
        map.getCanvas().style.cursor = "pointer"; // a priced building: it opens a page
        if (live.current.hover !== p.slug) {
          setHover(p.slug);
          if (p.slug === live.current.selected) popup.remove(); else show(p, false);
          // Light preview: fetch the card's figures while the pointer rests on a building, so the click opens it at once.
          if (cardMode) { const slug = p.slug; if (prefetchTimer) clearTimeout(prefetchTimer); prefetchTimer = setTimeout(() => { fetchCard(slug).catch(() => {}); }, 200); }
        }
        return;
      }
      // Not a priced building. The grey OpenStreetMap buildings around ours lift on hover too, so every building
      // reacts the same way, but they have no figures and no page: no card and no pointer cursor.
      const base = map.getLayer("base-hover-3d") && map.getLayer("base-3d") ? map.queryRenderedFeatures(e.point, { layers: ["base-3d"] })[0] : undefined;
      if (base) {
        if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
        setHover(null);
        popup.remove();
        map.getCanvas().style.cursor = "";
        setBaseHover(base);
        return;
      }
      // Empty ground: clear after a short grace, so a building edge or a one-frame miss does not flicker.
      if ((live.current.hover || live.current.baseKey) && !leaveTimer) leaveTimer = setTimeout(clearHover, 90);
    });
    map.getCanvas().addEventListener("mouseleave", () => {
      if (canHover) clearHover();
    });
    map.on("click", (e) => {
      const layers = DPI_LAYERS.filter((l) => map.getLayer(l));
      const f = layers.length ? map.queryRenderedFeatures(e.point, { layers })[0] : undefined;
      const p = f?.properties as Props3 | undefined;
      if (!p) {
        if (!canHover) {
          setHover(null);
          popup.remove();
        }
        return;
      }
      if (cardMode) {
        popup.remove();
        select(p.slug, true);
      } else if (canHover) open(p.slug);
      else {
        setHover(p.slug);
        show(p, true);
      }
    });

    fetch("/api/buildings")
      .then((r) => (r.ok ? r.json() : null))
      .then((geo: Collection | null) => {
        if (geo?.features?.length) setRaw(geo);
      })
      .catch(() => {});

    return () => {
      popup.remove();
      map.remove();
      mapRef.current = null;
    };
    // The map is created once per mount; focus/bounds only set the first view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Theme change: swap the basemap style; step 3 then redraws our layers on it.
  const appliedTheme = useRef<ThemeId | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (appliedTheme.current === null) {
      appliedTheme.current = theme; // the style the map was created with
      return;
    }
    if (appliedTheme.current === theme) return;
    appliedTheme.current = theme;
    map.setStyle(THEMES[theme].styleUrl, { diff: false }); // full reload, so "style.load" fires and step 3 redraws
    // Choosing Illustrated on the main map also moves to its coast view; maps given a place stay where they are.
    if (theme === "illustrated" && !focus && !bounds) goToIllustratedView(map);
    // focus/bounds only set the first view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, ready]);

  // Landmark tags for the Illustrated theme. They are page elements, so they outlive style swaps and are
  // added or removed here rather than with the map layers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || theme !== "illustrated") return;
    return showLandmarks(map, maplibregl.Marker);
  }, [theme, ready]);

  // 3. Our layers on the current style: grey 3D city, launch outlines, coloured buildings.
  useEffect(() => {
    const map = mapRef.current;
    // No isStyleLoaded() check: it stays false while basemap tiles are still loading, which would skip our layers
    // for good. "style.load" (which bumps styleGen) already means the style can take new layers.
    if (!map || !styleGen || !map.getStyle()) return;
    const t = THEMES[live.current.theme];

    if (!map.getLayer("base-3d")) {
      // The styles ship flat building footprints; draw them extruded, in the theme's neutral colour.
      let tileSource: string | null = null;
      for (const layer of map.getStyle().layers ?? []) {
        if ("source-layer" in layer && layer["source-layer"] === "building") {
          tileSource = layer.source;
          map.setLayoutProperty(layer.id, "visibility", "none");
        }
      }
      if (tileSource) map.addLayer({
        id: "base-3d",
        type: "fill-extrusion",
        source: tileSource,
        "source-layer": "building",
        minzoom: 13,
        // Same rule as the basemap's own 3D layer: a whole-complex outline (hide_3d) is skipped, because its separate
        // parts are drawn instead. Without this the outline is drawn on top of its towers, and hovering any one of them
        // lifted the whole outline: a slab over its neighbours.
        filter: ["!", ["has", "hide_3d"]],
        paint: {
          "fill-extrusion-color": t.baseBuilding,
          "fill-extrusion-height": ["coalesce", ["get", "render_height"], 4],
          "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
          "fill-extrusion-opacity": 0.75,
        },
      });
      // The building under the pointer, when it is one of ours-without-figures: drawn again, taller, in a highlight colour.
      if (tileSource && !map.getSource("base-hover")) {
        map.addSource("base-hover", { type: "geojson", data: EMPTY });
        map.addLayer({
          id: "base-hover-3d",
          type: "fill-extrusion",
          source: "base-hover",
          paint: {
            "fill-extrusion-color": t.baseHover,
            "fill-extrusion-height": ["+", ["*", ["get", "h"], 1.2], 25],
            "fill-extrusion-base": ["get", "b"],
            "fill-extrusion-opacity": 0.9,
            "fill-extrusion-vertical-gradient": true,
          },
        });
      }
    }

    if (!map.getSource("communities")) {
      map.addSource("communities", { type: "geojson", data: "/data/dubai_communities.geojson" });
      const isLaunch: ExpressionSpecification = ["in", ["get", "code"], ["literal", [...LAUNCH_CODES]]];
      map.addLayer({ id: "launch-communities-fill", type: "fill", source: "communities", filter: isLaunch, maxzoom: 14, paint: { "fill-color": t.outline, "fill-opacity": 0.08 } });
      map.addLayer({ id: "launch-communities-line", type: "line", source: "communities", filter: isLaunch, paint: { "line-color": t.outline, "line-width": 1.5, "line-opacity": 0.8 } });
    }

    if (!map.getSource("dpi-footprints")) {
      map.addSource("dpi-footprints", { type: "geojson", data: EMPTY, promoteId: "slug" });
      map.addSource("dpi-columns", { type: "geojson", data: EMPTY, promoteId: "slug" });
      const active: ExpressionSpecification = ["any", ["boolean", ["feature-state", "hover"], false], ["boolean", ["feature-state", "selected"], false]];
      // The selected building turns cyan, whatever the colour scheme, so it is the one thing that cannot be missed.
      const colour: ExpressionSpecification = ["case", ["boolean", ["feature-state", "selected"], false], CYAN, active, ["get", "_tint"], ["get", "_color"]];
      // 4 m above the grey basemap tower: closer than that, the two roofs flicker as red and grey stripes.
      // The hovered or selected building grows 20% taller (and at least 25 m) so it stands out from its neighbours.
      const height: ExpressionSpecification = ["case", active, ["+", ["*", ["get", "height"], 1.2], 25], ["+", ["get", "height"], 4]];
      const extrusion = (id: string, approx: boolean, opacity: number) => map.addLayer({
        id,
        type: "fill-extrusion",
        source: "dpi-footprints",
        minzoom: 13,
        filter: ["==", ["get", "approx"], approx],
        paint: {
          "fill-extrusion-color": colour,
          "fill-extrusion-height": height,
          "fill-extrusion-base": 0,
          // Fade in as the columns fade out, so zooming in turns each column into its real building.
          "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 14, opacity],
          "fill-extrusion-vertical-gradient": true,
        },
      });
      extrusion("dpi-3d", false, 0.95);
      extrusion("dpi-3d-approx", true, 0.6); // approximate positions: see-through, and said so on the card
      // Zoomed out, footprints are too small to see: each building is a coloured column at its position instead.
      for (const [id, minzoom] of [["dpi-columns", 0], ["dpi-columns-minor", MINOR_FROM_ZOOM]] as const) {
        map.addLayer({
          id,
          type: "fill-extrusion",
          source: "dpi-columns",
          minzoom,
          maxzoom: 14.5,
          paint: {
            "fill-extrusion-color": colour,
            "fill-extrusion-height": height,
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 13.5, 0.95, 14.5, 0],
            "fill-extrusion-vertical-gradient": true,
          },
        });
      }
    }

    // Glow round the selected building's footprint: a wide soft line under a crisp one.
    if (!map.getSource("dpi-selected")) {
      map.addSource("dpi-selected", { type: "geojson", data: EMPTY });
      map.addLayer({ id: "dpi-selected-glow", type: "line", source: "dpi-selected", layout: { "line-join": "round" }, paint: { "line-color": CYAN, "line-width": 14, "line-blur": 10, "line-opacity": 0.75 } });
      map.addLayer({ id: "dpi-selected-line", type: "line", source: "dpi-selected", layout: { "line-join": "round" }, paint: { "line-color": "#ecfeff", "line-width": 2.5, "line-opacity": 0.95 } });
    }

    // Location mode: neon straight lines to the nearest places, coloured by kind. Compared buildings get an amber outline.
    if (!map.getSource("dpi-nearby")) {
      map.addSource("dpi-nearby", { type: "geojson", data: EMPTY });
      map.addLayer({ id: "dpi-nearby-glow", type: "line", source: "dpi-nearby", layout: { "line-cap": "round" }, paint: { "line-color": ["get", "colour"], "line-width": 9, "line-blur": 6, "line-opacity": 0.7 } });
      map.addLayer({ id: "dpi-nearby-line", type: "line", source: "dpi-nearby", layout: { "line-cap": "round" }, paint: { "line-color": ["get", "colour"], "line-width": ["case", ["==", ["get", "straight"], 1], 1.6, 3] } });
    }
    if (!map.getSource("dpi-compare")) {
      map.addSource("dpi-compare", { type: "geojson", data: EMPTY });
      map.addLayer({ id: "dpi-compare-line", type: "line", source: "dpi-compare", paint: { "line-color": "#fbbf24", "line-width": 3, "line-opacity": 0.95 } });
    }

    // Illustrated recolours the basemap and the grey city only; the coloured data buildings above stay as they are.
    if (live.current.theme === "illustrated") applyIllustratedOverrides(map);
  }, [styleGen]);

  // 4. Data and colours into the layers, legend filters, selection.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleGen || !coloured) return;
    const fp = map.getSource("dpi-footprints") as maplibregl.GeoJSONSource | undefined;
    const cols = map.getSource("dpi-columns") as maplibregl.GeoJSONSource | undefined;
    if (!fp || !cols) return;
    fp.setData({ type: "FeatureCollection", features: coloured.features } as GeoJSON.FeatureCollection);
    cols.setData({
      type: "FeatureCollection",
      features: coloured.features.map((f) => ({ type: "Feature", geometry: square(f.properties.lng, f.properties.lat, COLUMN_HALF_M), properties: f.properties })),
    } as GeoJSON.FeatureCollection);
  }, [coloured, styleGen]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleGen) return;
    const show: ExpressionSpecification = ["!", ["in", ["get", "_cls"], ["literal", hidden]]];
    for (const id of DPI_LAYERS) {
      if (!map.getLayer(id)) continue;
      const base: FilterSpecification | null = id === "dpi-columns" ? [">=", ["get", "sales"], BUSY_SALES]
        : id === "dpi-columns-minor" ? ["<", ["get", "sales"], BUSY_SALES]
        : ["==", ["get", "approx"], id === "dpi-3d-approx"];
      map.setFilter(id, (base ? ["all", base, show] : show) as FilterSpecification);
    }
  }, [hidden, styleGen]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleGen || !coloured) return;
    for (const src of DPI_SOURCES) {
      if (!map.getSource(src)) continue;
      map.removeFeatureState({ source: src });
      if (selected) map.setFeatureState({ source: src, id: selected }, { selected: true });
    }
    live.current.hover = null;
  }, [selected, coloured, styleGen]);

  // The selected building: glow outline, the page flag the phone layout reads, and the camera move.
  useEffect(() => {
    if (!cardMode) return;
    document.documentElement.toggleAttribute(SELECTED_ATTR, !!selected);
    return () => document.documentElement.removeAttribute(SELECTED_ATTR);
  }, [cardMode, selected]);

  useEffect(() => {
    const map = mapRef.current;
    if (!cardMode || !map || !styleGen) return;
    const src = map.getSource("dpi-selected") as maplibregl.GeoJSONSource | undefined;
    const f = selected && raw ? raw.features.find((x) => x.properties.slug === selected) : null;
    if (src) src.setData(f ? { type: "FeatureCollection", features: [{ type: "Feature", geometry: f.geometry, properties: {} }] } : EMPTY);
    if (!selected) live.current.restored = false;
    const wide = window.matchMedia("(min-width: 768px)").matches;
    const padding = !f ? { left: 0, bottom: 0, top: 0, right: 0 } : wide ? { left: 420, bottom: 0, top: 0, right: 0 } : { left: 0, bottom: Math.round(window.innerHeight * 0.45), top: 0, right: 0 };
    // Returning from the full page: the saved camera already shows the building, so do not move it again.
    if (f && live.current.restored) { live.current.restored = false; map.easeTo({ padding, duration: 0 }); return; }
    if (f) map.easeTo({ center: [f.properties.lng, f.properties.lat], zoom: Math.max(map.getZoom(), 15.8), padding, duration: 750 });
    else map.easeTo({ padding, duration: 400 });
  }, [cardMode, selected, raw, styleGen]);

  // Compare list: kept in the URL (?compare=a,b,c) so it survives a reload and can be shared.
  useEffect(() => {
    if (!cardMode) return;
    const c = (new URLSearchParams(window.location.search).get("compare") ?? "").split(",").filter(Boolean).slice(0, MAX_COMPARE);
    setCompare(c);
  }, [cardMode]);
  const writeCompare = useCallback((list: string[]) => {
    setCompare(list);
    const sp = new URLSearchParams(window.location.search);
    if (list.length) sp.set("compare", list.join(",")); else sp.delete("compare");
    const q = sp.toString();
    window.history.replaceState(null, "", `/map${q ? `?${q}` : ""}`);
  }, []);
  const toggleCompare = useCallback((slug: string) => {
    writeCompare(compare.includes(slug) ? compare.filter((x) => x !== slug) : compare.length >= MAX_COMPARE ? [...compare.slice(1), slug] : [...compare, slug]);
  }, [compare, writeCompare]);

  useEffect(() => {
    const map = mapRef.current;
    if (!cardMode || !map || !styleGen) return;
    const src = map.getSource("dpi-compare") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    const feats = compare.map((slug) => raw?.features.find((x) => x.properties.slug === slug)).filter((x): x is Feature => !!x);
    src.setData({ type: "FeatureCollection", features: feats.map((f) => ({ type: "Feature", geometry: f.geometry, properties: {} })) });
  }, [cardMode, compare, raw, styleGen]);

  // Location mode. Leaving the building, or pressing Reset, clears the lines.
  useEffect(() => { setNearby(false); setHiddenKinds([]); setFacilities([]); setRouteMode("line"); setRoutes({}); }, [selected]);
  // Real routes: asked for only when Walk or Drive is chosen. A kind with no route keeps its straight line and shows no minutes.
  useEffect(() => {
    setRoutes({});
    const from = selected ? raw?.features.find((x) => x.properties.slug === selected)?.properties : null;
    if (!nearby || routeMode === "line" || !from || !facilities.length) return;
    let live = true;
    for (const f of facilities) {
      fetchRoute(routeMode, [from.lng, from.lat], [f.lng, f.lat]).then((r) => { if (live) setRoutes((m) => ({ ...m, [f.id]: r })); });
    }
    return () => { live = false; };
  }, [nearby, routeMode, facilities, selected, raw]);
  const wasNearby = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!cardMode || !map || !styleGen) return;
    const src = map.getSource("dpi-nearby") as maplibregl.GeoJSONSource | undefined;
    const from = selected ? raw?.features.find((x) => x.properties.slug === selected)?.properties : null;
    const markers: maplibregl.Marker[] = [];
    if (src) src.setData(nearby && from ? routeLines({ lng: from.lng, lat: from.lat }, facilities, hiddenKinds, routes, routeMode !== "line") : EMPTY);
    if (nearby && from) {
      const visible = facilities.filter((f) => !hiddenKinds.includes(f.id));
      for (const f of visible) {
        const kind = FACILITIES.find((k) => k.id === f.id)!;
        // Pin at the place: icon in the kind's colour. Click it for the name.
        const pin = document.createElement("button");
        pin.type = "button";
        pin.className = "dpi-pin";
        pin.style.setProperty("--c", kind.colour);
        const r = routeMode === "line" ? null : routes[f.id];
        const timing = r ? `${minutesLabel(r.minutes, routeMode as RouteMode)}, ${km(r.distanceM)} by ${routeMode === "walk" ? "foot" : "road"}` : null;
        pin.setAttribute("aria-label", `${kind.label}: ${f.name}, ${timing ? `${timing}; ` : ""}${km(f.distanceM)} straight-line${f.approx ? ", approximate position" : ""}`);
        pin.innerHTML = iconSvg(f.id, 15);
        const tip = document.createElement("span");
        tip.className = "dpi-pin-tip";
        tip.textContent = `${f.name} · ${timing ? `${timing} · ` : ""}${f.approx ? "≈ " : ""}${km(f.distanceM)} straight-line`;
        pin.append(tip);
        pin.addEventListener("click", (e) => { e.stopPropagation(); pin.classList.toggle("is-open"); });
        markers.push(new maplibregl.Marker({ element: pin }).setLngLat([f.lng, f.lat]).addTo(map));
        // Floating label halfway along the line: the kind and the straight-line distance.
        const lab = document.createElement("div");
        lab.className = "dpi-dist";
        lab.style.setProperty("--c", kind.colour);
        lab.textContent = r ? `${kind.label} ${minutesLabel(r.minutes, routeMode as RouteMode)} · ${km(r.distanceM)}` : routeMode !== "line" && routes[f.id] === null ? `${kind.label} no route · ${f.approx ? "≈ " : ""}${km(f.distanceM)} straight` : `${kind.label} ${f.approx ? "≈ " : ""}${km(f.distanceM)}${routeMode !== "line" ? " straight" : ""}`;
        markers.push(new maplibregl.Marker({ element: lab }).setLngLat(labelPoint(from, f, r)).addTo(map));
      }
      if (!wasNearby.current && visible.length) {
        const b = new maplibregl.LngLatBounds([from.lng, from.lat], [from.lng, from.lat]);
        visible.forEach((f) => b.extend([f.lng, f.lat]));
        const wide = window.matchMedia("(min-width: 768px)").matches;
        map.fitBounds(b, { padding: wide ? { top: 90, bottom: 60, left: 440, right: 60 } : { top: 90, bottom: Math.round(window.innerHeight * 0.55), left: 40, right: 40 }, maxZoom: 15.5, duration: 900 });
      }
    }
    wasNearby.current = nearby;
    return () => markers.forEach((m) => m.remove());
  }, [cardMode, nearby, facilities, hiddenKinds, selected, raw, styleGen, routes, routeMode]);

  const changeSettings = (next: MapSettings) => {
    setSettings(next);
    setHidden([]);
    save(STORE.settings, JSON.stringify(next));
  };
  const changeTheme = (next: ThemeId) => {
    setTheme(next);
    save(STORE.theme, next);
  };

  if (noWebgl) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-[var(--muted)]">
        This browser can&apos;t draw the 3D map (WebGL is off or unsupported).
      </div>
    );
  }
  const legend = coloured ? legendItems(settings.metric, coloured.breaks, settings.palette, coloured.values, currency) : null;
  return (
    <div className="relative h-full w-full" data-map-theme={theme}>
      <div ref={container} className={className} aria-label="Map of Dubai buildings" />
      {legend && (
        <div className={selected ? "contents max-sm:hidden" : "contents"}>
        <MapControls
          compact={controls === "legend"}
          settings={settings}
          theme={theme}
          currency={currency}
          legend={legend}
          hidden={hidden}
          periodEnd={raw?.meta?.periodEnd ?? null}
          onSettings={changeSettings}
          onTheme={changeTheme}
          onToggleClass={(cls) => setHidden((h) => (h.includes(cls) ? h.filter((c) => c !== cls) : [...h, cls]))}
        />
        </div>
      )}
      {cardMode && selected && (
        <BuildingCard
          slug={selected}
          view={view}
          currency={currency}
          features={raw?.features.map((f) => f.properties) ?? []}
          onClose={closeCard}
          onView={setView}
          onSelect={(slug) => select(slug, true)}
          nearby={nearby}
          hiddenKinds={hiddenKinds}
          onNearby={(on) => { setNearby(on); if (!on) { setHiddenKinds([]); setRouteMode("line"); } }}
          routeMode={routeMode}
          routes={routes}
          onRouteMode={setRouteMode}
          onToggleKind={(id) => setHiddenKinds((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]))}
          onFacilities={setFacilities}
          compared={compare}
          onCompare={toggleCompare}
        />
      )}
      {cardMode && (
        <CompareTray
          slugs={compare}
          names={Object.fromEntries((raw?.features ?? []).map((f) => [f.properties.slug, f.properties.name]))}
          currency={currency}
          onRemove={(slug) => writeCompare(compare.filter((x) => x !== slug))}
          onClear={() => writeCompare([])}
          onShow={(slug) => select(slug)}
        />
      )}
      {cardMode && forYou && (
        <ForYouPanel features={raw?.features.map((f) => f.properties) ?? []} currency={currency} periodEnd={raw?.meta?.periodEnd ?? null} onPick={(slug) => select(slug)} onClose={() => setForYou(false)} />
      )}
      {cardMode && thinned && !selected && (
        <p role="status" className="pointer-events-none absolute inset-x-0 bottom-[4.75rem] z-10 flex justify-center px-2 md:bottom-[4.5rem]">
          <span className="rounded-full bg-[var(--panel)]/95 px-3 py-1 text-xs text-[var(--muted)] shadow-md backdrop-blur">Showing the busiest buildings (10+ sales). Zoom in to see all.</span>
        </p>
      )}
      {cardMode && legend && (
        <div role="group" aria-label="Colour the map by" className={`absolute inset-x-0 bottom-9 z-10 flex justify-center px-2 ${selected ? "max-md:hidden" : ""} ${compare.length ? "md:bottom-20" : ""}`}>
          <div className="pointer-events-auto flex max-w-full gap-1 overflow-x-auto rounded-full border border-[var(--border)] bg-[var(--panel)]/95 p-1 text-xs shadow-md backdrop-blur">
            <button type="button" onClick={() => setForYou(true)} className="shrink-0 rounded-full bg-cyan-300 px-3 py-1.5 font-semibold text-slate-900 hover:bg-cyan-200">★ For you</button>
            {(["psf", "yield", "sales", "change"] as const).map((id) => (
              <button key={id} type="button" aria-pressed={settings.metric === id} title={id === "change" ? "Median price per sq ft against the 12 months before. Needs enough sales in both years." : METRICS[id].title}
                onClick={() => {
                  changeSettings({ ...settings, metric: id });
                  const sp = new URLSearchParams(window.location.search);
                  if (id === "psf") sp.delete("m"); else sp.set("m", id);
                  window.history.replaceState(null, "", `/map${sp.toString() ? `?${sp}` : ""}`);
                }}
                className={`shrink-0 rounded-full px-3 py-1.5 font-medium ${settings.metric === id ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--grid)]"}`}>
                {METRICS[id].label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
