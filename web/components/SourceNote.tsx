import { DISCLAIMER } from "@/lib/sources";
import { day } from "@/lib/format";

/** Source and date line under every block of figures. `estimate` adds the required disclaimer. */
export default function SourceNote({ source, date, estimate = false, children }: { source: string; date?: string | null; estimate?: boolean; children?: React.ReactNode }) {
  return (
    <p className="mt-2 text-xs text-[var(--muted)]">
      Source: {source}{date ? `, data to ${day(date)}` : ""}.{children ? <> {children}</> : null}
      {estimate && <> <strong className="font-medium">{DISCLAIMER}</strong></>}
    </p>
  );
}
