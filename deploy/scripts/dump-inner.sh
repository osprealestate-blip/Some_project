#!/usr/bin/env bash
# Runs INSIDE a postgres:17 container (called by restore-from-supabase.sh). Dumps the public data from Supabase.
set -euo pipefail
# Skip tables/sequences this login cannot read, and say which.
EXCL=$(psql "$SRC" -Atc "
  select format('--exclude-table=public.%I', c.relname)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and ((c.relkind in ('r','p') and not has_table_privilege(c.oid, 'select'))
      or (c.relkind = 'S' and not has_sequence_privilege(c.oid, 'select')))" | tr '\n' ' ')
echo "Skipped (no read access): ${EXCL:-none}"
# shellcheck disable=SC2086
pg_dump "$SRC" --schema=public --data-only --no-owner --no-privileges --disable-triggers -Fc $EXCL -f /out/supabase-data.dump.part
mv /out/supabase-data.dump.part /out/supabase-data.dump
