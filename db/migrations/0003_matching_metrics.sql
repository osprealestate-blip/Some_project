-- M2-M6: building matching keys, project links, summaries for pages and the map.
-- Public tables still hold no personal data.

-- Matching keys. name_key is the normalised name (see pipeline/src/dpi/names.py: name_key + canonical_key).
alter table projects add column if not exists name_key text;
create unique index if not exists projects_name_key_community on projects (name_key, community_id);

alter table buildings add column if not exists name_key text;
alter table buildings add column if not exists land_number text;
alter table buildings add column if not exists geom_source text;      -- osm | manual | plot
alter table buildings add column if not exists height_m real;
create unique index if not exists buildings_community_key on buildings (community_id, name_key);

-- One row per spelling seen in the DLD files, so the importer and search can resolve any of them.
create table if not exists building_aliases (
  alias_key    text not null,
  community_id int not null references communities(id),
  building_id  int not null references buildings(id) on delete cascade,
  primary key (alias_key, community_id)
);
create index if not exists building_aliases_trgm on building_aliases using gin (alias_key gin_trgm_ops);

-- Rents carry only a project; sales carry a project too. Linked by name within the community.
alter table transactions add column if not exists project_id int references projects(id);
alter table rent_contracts add column if not exists project_id int references projects(id);
create index if not exists transactions_project on transactions (project_id, txn_date);
create index if not exists rent_contracts_project on rent_contracts (project_id, start_date);
create index if not exists rent_contracts_community on rent_contracts (community_id, start_date);

-- Trailing 12-month figures per building and bedroom type (rooms -1 = all). Filled by `dpi compute-metrics`.
create table if not exists building_summary (
  building_id         int not null references buildings(id) on delete cascade,
  rooms               int not null default -1,
  sale_count_12m      int not null default 0,
  sale_median_psf_12m real,
  sale_median_price_12m real,
  sale_median_size_12m real,
  sale_median_psf_prev_12m real,             -- the 12 months before, for the year-on-year change
  rent_count_12m      int not null default 0,
  rent_median_12m     real,
  rent_level          text,                  -- building | project (rents only known per project)
  gross_yield         real,                  -- rent_median_12m / sale_median_price_12m, an estimate
  sale_count_all      int not null default 0,
  last_sale_date      date,
  period_end          date not null,         -- last day covered
  source_date         date not null,         -- newest DLD file used
  computed_at         timestamptz not null default now(),
  primary key (building_id, rooms)
);

create table if not exists community_summary (
  community_id        int not null references communities(id) on delete cascade,
  rooms               int not null default -1,
  sale_count_12m      int not null default 0,
  sale_median_psf_12m real,
  sale_median_price_12m real,
  sale_median_psf_prev_12m real,
  rent_count_12m      int not null default 0,
  rent_median_12m     real,
  gross_yield         real,
  building_count      int not null default 0,
  period_end          date not null,
  source_date         date not null,
  computed_at         timestamptz not null default now(),
  primary key (community_id, rooms)
);

-- Monthly series per community for charts (building series are read from transactions directly).
create table if not exists community_metrics (
  community_id    int not null references communities(id) on delete cascade,
  period          date not null,
  rooms           int not null default -1,
  sale_median_psf real,
  sale_count      int,
  rent_median     real,
  rent_count      int,
  source_date     date not null,
  primary key (community_id, period, rooms)
);

create index if not exists pois_category on pois (category);
