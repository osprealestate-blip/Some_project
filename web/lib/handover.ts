/** "Handover soon" view for off-plan towers, from the completion date on file in DLD Projects data.
 *  Dates are as filed and can change. No date means no place in this view; we never estimate one. */
export type HandoverRow = { completion_date: string | null; dld_status: string | null };

const ms = (d: string) => Date.parse(`${d.slice(0, 10)}T00:00:00Z`);

/** Rows with a completion date within the next 12 months of `today`, soonest first, plus those whose date has passed
 *  but DLD does not mark finished (kept apart and labelled). */
export function handoverView<T extends HandoverRow>(rows: T[], today: Date): { next12: T[]; passed: T[] } {
  const t0 = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const t1 = Date.UTC(today.getUTCFullYear() + 1, today.getUTCMonth(), today.getUTCDate());
  const dated = rows.filter((r) => r.completion_date && !Number.isNaN(ms(r.completion_date)) && r.dld_status !== "FINISHED");
  const byDate = (a: T, b: T) => ms(a.completion_date!) - ms(b.completion_date!);
  return {
    next12: dated.filter((r) => ms(r.completion_date!) >= t0 && ms(r.completion_date!) <= t1).sort(byDate),
    passed: dated.filter((r) => ms(r.completion_date!) < t0).sort(byDate),
  };
}
