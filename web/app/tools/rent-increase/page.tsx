import RentIncreaseForm from "@/components/RentIncreaseForm";
import { hasDatabase } from "@/lib/db";
import { buildingBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rent increase calculator" };

export default async function Page({ searchParams }: { searchParams: Promise<{ building?: string }> }) {
  const { building } = await searchParams;
  const b = hasDatabase() && building ? await buildingBySlug(building).catch(() => null) : null;
  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Rent increase calculator</h1>
      <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">How much can your landlord raise the rent at renewal? Dubai law ties it to how far your rent is below the average for similar homes.</p>
      <div className="mt-6"><RentIncreaseForm initial={b ? { slug: b.slug, name: b.name_en, community: b.community } : null} /></div>
    </main>
  );
}
