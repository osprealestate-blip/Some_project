import type { BuildingImage } from "@/lib/queries";

const SOURCE_LABEL: Record<BuildingImage["source"], string> = {
  own: "Our own photo", wikimedia: "Wikimedia Commons", mapillary: "Mapillary", map: "Map snapshot",
};

function Credit({ img }: { img: BuildingImage }) {
  return (
    <figcaption className="mt-1 text-xs text-[var(--muted)]">
      {img.source === "own" ? "Photo: our own." : <>Photo: {img.author ?? "unknown"}{img.licence ? <>, {img.licence_url ? <a className="link" href={img.licence_url} target="_blank" rel="noopener noreferrer">{img.licence}</a> : img.licence}</> : null}.</>}
      {" "}Source: {img.source_url ? <a className="link" href={img.source_url} target="_blank" rel="noopener noreferrer">{SOURCE_LABEL[img.source]}</a> : SOURCE_LABEL[img.source]}.
    </figcaption>
  );
}

/** Building photos with credit and licence under each. Free-licence, our own or map snapshot only (CLAUDE.md). */
export default function BuildingGallery({ images, name }: { images: BuildingImage[]; name: string }) {
  if (images.length === 0) return null;
  const [main, ...rest] = images;
  return (
    <section aria-label={`Photos of ${name}`} className="mt-4">
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element -- remote free-licence files; no image optimiser configured */}
        <img src={main.url} alt={main.title ?? `${name}`} loading="lazy" decoding="async" className="aspect-video w-full rounded-lg border border-[var(--border)] object-cover" />
        <Credit img={main} />
      </figure>
      {rest.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {rest.map((img) => (
            <li key={img.url}>
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.title ?? `${name}`} loading="lazy" decoding="async" className="aspect-video w-full rounded-md border border-[var(--border)] object-cover" />
                <Credit img={img} />
              </figure>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
