export const metadata = { title: "Community" };

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">Community {code}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Placeholder. Community pages are built in milestone M4.</p>
    </main>
  );
}
