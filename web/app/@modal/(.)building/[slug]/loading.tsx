import BuildingPanel from "@/components/BuildingPanel";

export default function Loading() {
  return (
    <BuildingPanel>
      <div className="space-y-3 p-5" aria-busy="true">
        <h1 id="building-panel-title" className="sr-only">Loading building</h1>
        <div className="h-3 w-24 animate-pulse rounded bg-[var(--grid)]" />
        <div className="h-7 w-2/3 animate-pulse rounded bg-[var(--grid)]" />
        <div className="grid grid-cols-2 gap-3 pt-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-[var(--grid)]" />)}
        </div>
      </div>
    </BuildingPanel>
  );
}
