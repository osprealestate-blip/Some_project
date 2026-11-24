-- Figures for master communities (Dubai Marina, Azizi Venice, Dubai South ...), the groups people search for.
-- A master community is buildings.master_community (set by `dpi group-complexes --apply`); the official Dubai
-- Municipality area (community_summary) stays as it was. Filled by `dpi compute-metrics`, copied to a hosted
-- database by `dpi push-public --summaries-only`. Names and market figures only: no personal data.

-- Off-plan sales per building in the trailing 12 months (rooms = -1 row), to tell new-launch towers from ready ones.
alter table building_summary add column if not exists sale_count_offplan_12m int not null default 0;

create table if not exists master_community_summary (
  master_community     text not null,
  rooms                int not null default -1,   -- -1 = all bedroom types, 0 = studio, 4 = four and above
  sale_count_12m       int not null default 0,
  sale_median_psf_12m  real,
  sale_median_price_12m real,
  sale_median_psf_prev_12m real,
  rent_count_12m       int not null default 0,
  rent_median_12m      real,
  gross_yield          real,
  building_count       int not null default 0,
  sale_count_ready_12m int not null default 0,
  sale_median_psf_ready_12m real,
  sale_median_psf_ready_prev_12m real,
  sale_count_offplan_12m int not null default 0,
  sale_median_psf_offplan_12m real,
  sale_median_psf_offplan_prev_12m real,
  like_for_like_change real,
  like_for_like_towers int not null default 0,
  period_end           date not null,
  source_date          date not null,
  computed_at          timestamptz not null default now(),
  primary key (master_community, rooms)
);

create table if not exists master_community_metrics (
  master_community text not null,
  period           date not null,
  sale_median_psf  real,
  sale_count       int,
  rent_median      real,
  rent_count       int,
  source_date      date not null,
  primary key (master_community, period)
);

alter table master_community_summary enable row level security;  -- no policies: the web logins bypass it, the public API sees nothing
alter table master_community_metrics enable row level security;

-- Hosted databases read through dpi_web and write through dpi_push (db/hosted_roles.sql); tables made after
-- that script ran need the same grants. Skipped where the roles do not exist (a local database).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'dpi_web') then
    grant select on master_community_summary, master_community_metrics to dpi_web;
  end if;
  if exists (select 1 from pg_roles where rolname = 'dpi_push') then
    grant select, insert, update, delete, truncate on master_community_summary, master_community_metrics to dpi_push;
  end if;
end $$;
