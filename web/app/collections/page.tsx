import CollectionsManager from "@/components/CollectionsManager";

export const metadata = { title: "Your collections", description: "Named lists of buildings you saved in this browser.", robots: { index: false, follow: true } };

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Your collections</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Group buildings the way you think about them: “Near metro”, “High rent return”, “My shortlist”. Add a building from the heart button on the map card or its page.</p>
      <CollectionsManager />
    </main>
  );
}
