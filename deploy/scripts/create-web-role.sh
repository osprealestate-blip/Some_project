#!/usr/bin/env bash
# Creates (or updates) the read-only database login the website uses. Run from deploy/ after the data is restored.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
docker compose exec -T db psql -U dpi -d dpi -v ON_ERROR_STOP=1 -v pw="$WEB_DB_PASSWORD" <<'SQL'
select format('create role dpi_web login') where not exists (select 1 from pg_roles where rolname = 'dpi_web') \gexec
alter role dpi_web password :'pw';
-- Row-level security is on for some tables (e.g. migration 0012) with no policies, so without this the website reads no rows
-- from them. Same as db/hosted_roles.sql. The login can still only read.
alter role dpi_web bypassrls;
grant usage on schema public to dpi_web;
grant select on all tables in schema public to dpi_web;
alter default privileges in schema public grant select on tables to dpi_web;
alter role dpi_web set default_transaction_read_only = on;
alter role dpi_web set statement_timeout = '20s';
SQL
echo "dpi_web ready (read-only)."
