import BuildingMap from "@/components/BuildingMap";
import { LAUNCH_COMMUNITIES } from "@/lib/communities";

export default function Home() {
  return (
    <main className="relative h-dvh w-full">
      <BuildingMap />
      <section className="pointer-events-none absolute inset-x-4 top-4 flex justify-start">
        <div className="pointer-events-auto max-w-sm rounded-lg border border-[var(--border)] bg-[var(--panel)]/95 p-4 shadow-sm">
          <h1 className="text-lg font-semibold">Dubai building intelligence</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Early preview. Launch communities:{" "}
            {LAUNCH_COMMUNITIES.map((c) => c.label).join(", ")}.
          </p>
        </div>
      </section>
    </main>
  );
}
