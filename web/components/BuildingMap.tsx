"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { type ExpressionSpecification } from "maplibre-gl";
import {
  BUILDING_HEIGHT_RAMP,
  DUBAI_CENTER,
  DUBAI_PITCH,
  DUBAI_ZOOM,
  MAP_ATTRIBUTION,
  MAP_STYLE_URL,
  webglAvailable,
} from "@/lib/mapStyle";
import { LAUNCH_CODES } from "@/lib/communities";

const heightColour: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["coalesce", ["get", "render_height"], 0],
  ...BUILDING_HEIGHT_RAMP.flat(),
] as unknown as ExpressionSpecification;

export default function BuildingMap() {
  const container = useRef<HTMLDivElement>(null);
  const [noWebgl, setNoWebgl] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    if (!webglAvailable()) {
      setNoWebgl(true);
      return;
    }
    const map = new maplibregl.Map({
      container: container.current,
      style: MAP_STYLE_URL,
      center: DUBAI_CENTER,
      zoom: DUBAI_ZOOM,
      pitch: DUBAI_PITCH,
      attributionControl: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: MAP_ATTRIBUTION }));
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");

    map.on("load", () => {
      // The Liberty style ships flat building footprints; draw our own extruded layer from the same tiles.
      // Take the tile source name from the style itself rather than assuming it.
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
          "fill-extrusion-opacity": 0.9,
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
    });

    return () => map.remove();
  }, []);

  if (noWebgl) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-[var(--muted)]">
        This browser can&apos;t draw the 3D map (WebGL is off or unsupported).
      </div>
    );
  }
  return <div ref={container} className="h-full w-full" aria-label="Map of Dubai buildings" />;
}
