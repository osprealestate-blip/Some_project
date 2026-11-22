-- Building-level service charge (AED per sq ft per year) from the DLD "Owners Association Service Charges" open
-- dataset (Data Dubai). One row per linked building; the figure is the latest residential budget year, with
-- Parking, Storage, Meter Installation, Income, Adjustment and Doubtful Debts left out. Market data only.
-- `complete` is true only for figures with at least 5 charge categories totalling AED 3 to 45; others are never shown.
create table if not exists building_service_charges (
  building_id    integer primary key references buildings(id) on delete cascade,
  assoc_id       text not null,
  assoc_name     text not null,
  community_name text,
  company        text,
  budget_year    integer not null,
  psf_total      real not null,
  ac_psf         real,
  categories     jsonb not null default '{}'::jsonb,
  complete       boolean not null default false,
  match_method   text not null,
  source         text not null default 'dld_service_charges',
  source_date    date not null
);
alter table building_service_charges enable row level security;

-- 0008-era public tables that had no row-level security: close them to the public API keys (the web app reads
-- through its own role, which is unaffected). Already applied to the hosted database on 2026-11-22.
alter table if exists building_images enable row level security;
alter table if exists dld_projects enable row level security;

-- Supabase's public API roles exist only on the hosted database; plain Postgres (local, CI) has none.
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on building_service_charges, building_images, dld_projects from %I', r);
    end if;
  end loop;
end $$;
