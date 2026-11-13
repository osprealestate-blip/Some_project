import { DISCLAIMER } from "@/lib/sources";
import { day } from "@/lib/format";
import { makeT, tList, type T } from "@/lib/i18n";

/** Source and date line under every block of figures. `estimate` adds the required disclaimer. */
export default function SourceNote({ source, date, estimate = false, children, t = makeT("en") }: { source: string; date?: string | null; estimate?: boolean; children?: React.ReactNode; t?: T }) {
  return (
    <p className="mt-2 text-xs text-[var(--muted)]">
      {t("Source")}: {tList(t, source)}{date ? `, ${t("data to {date}", { date: day(date) })}` : ""}.{children ? <> {children}</> : null}
      {estimate && <> <strong className="font-medium">{t(DISCLAIMER)}</strong></>}
    </p>
  );
}
