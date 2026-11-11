"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type BuildingMapType from "@/components/BuildingMap";

/** Loads the map code in the browser only, after the page text is up, so building and community pages
 *  don't wait for it. The map itself (components/BuildingMap.tsx) is unchanged. */
const BuildingMap = dynamic(() => import("@/components/BuildingMap"), {
  ssr: false,
  loading: () => <div className="h-full min-h-40 w-full animate-pulse bg-[var(--grid)]" role="status" aria-label="Loading map" />,
});

export default function LazyBuildingMap(props: ComponentProps<typeof BuildingMapType>) {
  return <BuildingMap {...props} />;
}
