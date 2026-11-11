"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
import { PANEL_ATTR } from "./BuildingPanel";
import MapControls from "./MapControls";

type Props = {
  focus?: { lng: number; lat: number } | null;
  bounds?: [[number, number], [number, number]] | null;
  className?: string;
  currency?: Currency;
  /** "full": colour, scale and theme settings with the legend. "legend": the legend only (small maps). */
  controls?: "full" | "legend";
};

type Props3 = MapBuildingProps & { lng: number; lat: number; height: number };
type Feature = { type: "Feature"; geometry: GeoJSON.Geometry; properties: Props3 };
type Collection = { type: "FeatureCollection"; features: Feature[]; meta?: { periodEnd?: string | null } };

const STORE = { settings: "dpi.map.settings", theme: "dpi.map.theme" };
const DPI_LAYERS = ["dpi-3d", "dpi-3d-approx", "dpi-columns"];
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

function slugFromPath(path: string | null): string | null {
  const m = path ? /^\/building\/([^/?#]+)/.exec(path) : null;
  return m ? decodeURIComponent(m[1]) : null;
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

export default function BuildingMap({
  focus = null, bounds = null, className = "h-full w-full", currency = DEFAULT_CURRENCY, controls = "full",
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const selected = slugFromPath(pathname);

  const [noWebgl, setNoWebgl] = useState(false);
  const [raw, setRaw] = useState<Collection | null>(null);
  const [settings, setSettings] = useState<MapSettings>(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);
  const [hidden, setHidden] = useState<number[]>([]);
  const [ready, setReady] = useState(false); // settings read from the browser
  const [styleGen, setStyleGen] = useState(0); // bumps each time a style finishes loading

  // Everything the map event handlers need, current without re-binding them.
  const live = useRef({ settings, currency, theme, selected, hover: null as string | null, baseKey: null as string | null });
  live.current.settings = settings;
  live.current.currency = currency;
  live.current.theme = theme;
  live.current.selected = selected;

  const coloured = useMemo(() => (raw ? colourise(raw.features, settings) : null), [raw, settings]);

  const open = useCallback((slug: string) => {
    const url = `/building/${encodeURIComponent(slug)}`;
    // While a panel is open, swap it so Close (browser Back) returns to the map, not to the previous building.
    if (document.documentElement.hasAttribute(PANEL_ATTR)) router.replace(url, { scroll: false });
    else router.push(url, { scroll: false });
  }, [router]);

  // 1. Read saved choices, then create the map.
  useEffect(() => {
    if (!container.current) return;
    if (!webglAvailable()) {
      setNoWebgl(true);
      return;
    }
    const savedTheme = parseTheme(load(STORE.theme));
    setSettings(parseSettings(load(STORE.settings)));
    setTheme(savedTheme);
    setReady(true);
    live.current.theme = savedTheme;

    // The Illustrated theme opens on its own tilted coast view, unless this map was given a place to show.
    const illustratedStart = savedTheme === "illustrated" && !focus && !bounds;
    const map = new maplibregl.Map({
      container: container.current,
      style: THEMES[savedTheme].styleUrl,
      ...(illustratedStart
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
          show(p, false);
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
      if (canHover) open(p.slug);
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
      const colour: ExpressionSpecification = ["case", active, ["get", "_tint"], ["get", "_color"]];
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
      map.addLayer({
        id: "dpi-columns",
        type: "fill-extrusion",
        source: "dpi-columns",
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
      const base: FilterSpecification | null = id === "dpi-columns" ? null : ["==", ["get", "approx"], id === "dpi-3d-approx"];
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
      )}
    </div>
  );
}
