#!/usr/bin/env bash
# Runs INSIDE a postgres:17 container on the compose network (called by restore-from-supabase.sh).
# Empties and reloads the public tables in ONE transaction: if anything fails, the old data stays exactly as it was.
set -euo pipefail
export PGHOST=db PGUSER=dpi PGDATABASE=dpi PGOPTIONS='-c client_min_messages=warning'
test -s /out/supabase-data.dump || { echo "No dump file: nothing was changed."; exit 1; }
pg_restore -l /out/supabase-data.dump >/dev/null || { echo "Dump file is not readable: nothing was changed."; exit 1; }
{
  echo "BEGIN;"
  cat <<'SQL'
do $$ declare r record; begin
  for r in select tablename from pg_tables where schemaname = 'public' and tablename not in ('spatial_ref_sys','schema_migrations') loop
    execute format('truncate table public.%I restart identity cascade', r.tablename);
  end loop;
end $$;
SQL
  # The postgres:17 dump starts with a setting the 16 server does not know; drop that one line.
  pg_restore --data-only --disable-triggers --no-owner -f - /out/supabase-data.dump | grep -v '^SET transaction_timeout'
  echo "COMMIT;"
} | psql -q -v ON_ERROR_STOP=1 >/dev/null
echo "Loaded."
