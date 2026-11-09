-- Run on the hosted (Supabase) database as postgres, NOT part of db/migrations.
-- Replace each <verifier> with the line `dpi hosted-login` printed; never put a plain password here.

-- Uploads (dpi push-public): empties and refills the public tables.
create role dpi_push login bypassrls password '<verifier for dpi_push>';
grant usage on schema public to dpi_push;
grant select, insert, update, delete, truncate, maintain on all tables in schema public to dpi_push;  -- maintain: analyze (PG17)
grant usage, select, update on all sequences in schema public to dpi_push;

-- The website (Vercel DATABASE_URL): read-only.
create role dpi_web login bypassrls password '<verifier for dpi_web>';
grant usage on schema public to dpi_web;
grant select on all tables in schema public to dpi_web;
alter role dpi_web set default_transaction_read_only = on;

-- Supabase keeps PostGIS and pg_trgm in the extensions schema, so the website login needs it on its search path.
grant usage on schema extensions to dpi_web;
alter role dpi_web set search_path = public, extensions;
