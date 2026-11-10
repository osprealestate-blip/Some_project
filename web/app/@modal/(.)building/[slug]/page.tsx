import BuildingDetail from "@/components/BuildingDetail";
import BuildingPanel from "@/components/BuildingPanel";

export const dynamic = "force-dynamic";

/** A building clicked on a map opens here, as a panel over the map. Opening /building/<slug> directly, a reload
 *  or a shared link still renders the full page in app/building/[slug]. */
export default async function BuildingPanelRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <BuildingPanel slug={slug}>
      <BuildingDetail slug={slug} variant="panel" />
    </BuildingPanel>
  );
}
