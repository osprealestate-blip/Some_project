-- Villa and townhouse clusters: one map point per villa or townhouse project, never one per villa.
-- Written by `dpi load-villa-clusters` (dry run first, then --apply). Public and aggregate only: no owner, buyer or
-- tenant details, no plot numbers, no unit-level rows. A cluster with no geom is stored but never shown on the map.
create table if not exists villa_clusters (
  id                serial primary key,
  slug              text unique not null,
  name              text not null,
  kind              text not null default 'villa',      -- villa | townhouse | mixed
  community_id      int references communities(id),
  geom              geometry(Point, 4326),               -- the cluster centre, not a building
  geom_source       text,                                -- 2gis | google | osm | manual
  is_cluster_point  boolean not null default true,       -- true = the centre of the cluster, so the app says "approximate"
  geom_note         text,
  plot_count        int,                                 -- plots in the cluster, from the DLD audit
  record_count      int,                                 -- DLD records behind that count
  size_median_sqft  real,                                -- median plot or villa size from that audit, when known
  match_names       text[] not null default '{}',        -- DLD project names whose sales and rents belong to the cluster
  source            text not null default 'dld_audit',
  source_date       date not null,
  created_at        timestamptz not null default now()
);
create index if not exists villa_clusters_geom on villa_clusters using gist (geom);
create index if not exists villa_clusters_community on villa_clusters (community_id);
create index if not exists villa_clusters_name on villa_clusters using gin (name gin_trgm_ops);

-- Trailing 12-month figures per cluster and bedroom count (rooms -1 = all). Same rules as building_summary.
create table if not exists villa_cluster_summary (
  cluster_id            int not null references villa_clusters(id) on delete cascade,
  rooms                 int not null default -1,
  sale_count_12m        int not null default 0,
  sale_median_psf_12m   real,
  sale_median_price_12m real,
  sale_median_size_12m  real,
  sale_count_all        int not null default 0,
  last_sale_date        date,
  rent_count_12m        int not null default 0,
  rent_median_12m       real,
  period_end            date not null,
  source_date           date not null,
  computed_at           timestamptz not null default now(),
  primary key (cluster_id, rooms)
);

alter table villa_clusters enable row level security;   -- no policies: the web logins bypass it, the public API sees nothing
alter table villa_cluster_summary enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'dpi_web') then
    grant select on villa_clusters, villa_cluster_summary to dpi_web;
  end if;
  if exists (select 1 from pg_roles where rolname = 'dpi_push') then
    grant select, insert, update, delete, truncate on villa_clusters, villa_cluster_summary to dpi_push;
    grant usage, select, update on sequence villa_clusters_id_seq to dpi_push;
  end if;
end $$;
