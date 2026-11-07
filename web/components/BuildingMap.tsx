"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import maplibregl, { type ExpressionSpecification } from "maplibre-gl";
import {
  BUILDING_HEIGHT_RAMP,
  DUBAI_PITCH,
  LAUNCH_BOUNDS,
  MAP_ATTRIBUTION,
  MAP_STYLE_URL,
  PSF_RAMP,
  webglAvailable,
} from "@/lib/mapStyle";
import { LAUNCH_CODES } from "@/lib/communities";

const heightColour: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["coalesce", ["get", "render_height"], 0],
  ...BUILDING_HEIGHT_RAMP.flat(),
] as unknown as ExpressionSpecification;

const psfColour: ExpressionSpecification = [
  "case",
  ["==", ["get", "psf"], null],
  "#9aa3ad",
  ["interpolate", ["linear"], ["get", "psf"], ...PSF_RAMP.flat()],
] as unknown as ExpressionSpecification;

const fmt = new Intl.NumberFormat("en-AE", { maximumFractionDigits: 0 });

type Props = { focus?: { lng: number; lat: number } | null; bounds?: [[number, number], [number, number]] | null; className?: string };

export default function BuildingMap({ focus = null, bounds = null, className = "h-full w-full" }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [noWebgl, setNoWebgl] = useState(false);
  const [hasDots, setHasDots] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    if (!webglAvailable()) {
      setNoWebgl(true);
      return;
    }
    const map = new maplibregl.Map({
      container: container.current,
      style: MAP_STYLE_URL,
      // Open framed on the launch areas (or the page's building/community) so they are on screen at once.
      ...(focus
        ? { center: [focus.lng, focus.lat] as [number, number], zoom: 15.5 }
        : { bounds: bounds ?? LAUNCH_BOUNDS, fitBoundsOptions: { padding: 24 } }),
      pitch: DUBAI_PITCH,
      attributionControl: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: MAP_ATTRIBUTION }));
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");

    map.on("load", () => {
      // The Liberty style ships flat building footprints; draw our own extruded layer from the same tiles.
      let tileSource: string | null = null;
      for (const layer of map.getStyle().layers ?? []) {
        if ("source-layer" in layer && layer["source-layer"] === "building") {
          tileSource = layer.source;
          map.setLayoutProperty(layer.id, "visibility", "none");
        }
      }
      if (tileSource) map.addLayer({
        id: "buildings-3d",
        type: "fill-extrusion",
        source: tileSource,
        "source-layer": "building",
        minzoom: 13,
        paint: {
          "fill-extrusion-color": heightColour,
          "fill-extrusion-height": ["coalesce", ["get", "render_height"], 4],
          "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
          "fill-extrusion-opacity": 0.85,
        },
      });

      map.addSource("communities", { type: "geojson", data: "/data/dubai_communities.geojson" });
      const isLaunch: ExpressionSpecification = ["in", ["get", "code"], ["literal", [...LAUNCH_CODES]]];
      map.addLayer({
        id: "launch-communities-fill",
        type: "fill",
        source: "communities",
        filter: isLaunch,
        maxzoom: 14,
        paint: { "fill-color": "#2a69a6", "fill-opacity": 0.12 },
      });
      map.addLayer({
        id: "launch-communities-line",
        type: "line",
        source: "communities",
        filter: isLaunch,
        paint: { "line-color": "#2a69a6", "line-width": 2 },
      });

      // Our matched buildings, coloured by median price per sq ft. Click opens the building page.
      fetch("/api/buildings")
        .then((r) => (r.ok ? r.json() : null))
        .then((geo) => {
          if (!geo || !geo.features?.length || !map.getStyle()) return;
          map.addSource("dpi-buildings", { type: "geojson", data: geo });
          map.addLayer({
            id: "dpi-buildings",
            type: "circle",
            source: "dpi-buildings",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 3, 14, 6, 17, 10],
              "circle-color": psfColour,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2,
            },
          });
          setHasDots(true);
          const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
          map.on("mouseenter", "dpi-buildings", (e) => {
            map.getCanvas().style.cursor = "pointer";
            const f = e.features?.[0];
            if (!f) return;
            const p = f.properties as { name: string; psf?: number | null; sales?: number };
            const el = document.createElement("div");
            const title = document.createElement("div");
            title.style.fontWeight = "600";
            title.textContent = p.name; // names are data: never innerHTML
            const line = document.createElement("div");
            line.textContent = p.psf ? `AED ${fmt.format(p.psf)}/sq ft · ${p.sales ?? 0} sales in 12 months` : "Too few recent sales";
            el.append(title, line);
            popup.setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number]).setDOMContent(el).addTo(map);
          });
          map.on("mouseleave", "dpi-buildings", () => {
            map.getCanvas().style.cursor = "";
            popup.remove();
          });
          map.on("click", "dpi-buildings", (e) => {
            const slug = e.features?.[0]?.properties?.slug;
            if (slug) router.push(`/building/${slug}`);
          });
        })
        .catch(() => {});
    });

    return () => map.remove();
  }, [focus, bounds, router]);

  if (noWebgl) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-[var(--muted)]">
        This browser can&apos;t draw the 3D map (WebGL is off or unsupported).
      </div>
    );
  }
  return (
    <div className="relative h-full w-full">
      <div ref={container} className={className} aria-label="Map of Dubai buildings" />
      {hasDots && (
        <div className="pointer-events-none absolute bottom-8 start-2 rounded border border-[var(--border)] bg-[var(--panel)]/95 px-2 py-1 text-xs">
          <div className="mb-1 text-[var(--muted)]">Median AED per sq ft, 12 months</div>
          <div className="flex items-center gap-1">
            {PSF_RAMP.map(([v, c]) => (
              <span key={v} className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} />{fmt.format(v)}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
