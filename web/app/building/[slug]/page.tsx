export const metadata = { title: "Building" };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">Building: {slug}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Placeholder. Building pages are built in milestone M4.</p>
    </main>
  );
}
