#!/usr/bin/env bash
# Largest tables and their row counts. Run the same SQL in the Supabase SQL editor to compare.
cd "$(dirname "$0")/.."
SQL="select relname as table, n_live_tuples as rows from pg_stat_user_tables where schemaname='public' order by 2 desc limit 15;"
docker compose exec -T db psql -U dpi -d dpi -c "$SQL"
echo "Same check on Supabase (SQL editor, after 'analyze;'):  $SQL"
