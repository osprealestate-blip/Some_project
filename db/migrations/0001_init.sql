-- First schema draft (plan section 8). Public tables hold no personal data: no owner, buyer, tenant
-- names, phones, IDs or unit-level tenant details. Every figure row carries source and source_date.
create extension if not exists postgis;
create extension if not exists pg_trgm;   -- fuzzy building-name matching

create table communities (
  id            serial primary key,
  dm_code       text unique,                 -- Dubai Municipality community number
  name_official text not null,               -- "Marsa Dubai"
  name_common   text,                        -- "Dubai Marina"
  name_ar       text,
  geom          geometry(MultiPolygon, 4326),
  is_launch     boolean not null default false
);
create index on communities using gist (geom);

create table developers (
  id    serial primary key,
  name  text not null unique,
  dld_id text
);

create table projects (
  id             serial primary key,
  dld_project_id text unique,
  name           text not null,
  developer_id   int references developers(id),
  community_id   int references communities(id),
  status         text,                       -- planned | under_construction | completed
  completion_date date,
  source         text not null,
  source_date    date not null
);

create table land_plots (
  id           serial primary key,
  land_number  text unique,
  community_id int references communities(id),
  land_use     text,
  freehold     boolean,
  geom         geometry(MultiPolygon, 4326)
);
create index on land_plots using gist (geom);

-- Master building table: one row per physical building.
create table buildings (
  id               serial primary key,
  slug             text unique not null,     -- URL of the building page
  name_en          text not null,
  name_ar          text,
  aliases          text[] not null default '{}',
  dld_building_ids text[] not null default '{}',
  project_id       int references projects(id),
  land_plot_id     int references land_plots(id),
  community_id     int references communities(id),
  osm_id           bigint,
  geom             geometry(Geometry, 4326),
  floors           int,
  unit_count       int,
  completion_year  int,
  building_type    text,                     -- residential | commercial | mixed | hotel
  match_confidence real not null default 0,  -- 0..1; low values are hidden in the app
  match_method     text,                     -- plot_overlap | name | manual
  verified_at      timestamptz,
  verified_by      text
);
create index on buildings using gist (geom);
create index on buildings using gin (name_en gin_trgm_ops);

create table units (
  id          serial primary key,
  building_id int not null references buildings(id),
  unit_no     text,
  floor       int,
  size_sqft   real,
  rooms       int,                           -- 0 = studio
  stack_id    text
);
create index on units (building_id);

create table transactions (
  id           bigserial primary key,
  source       text not null,                -- dld
  source_ref   text not null,
  source_date  date not null,                -- date of the downloaded file
  building_id  int references buildings(id),
  community_id int references communities(id),
  raw_building text,
  raw_project  text,
  raw_area     text,
  txn_date     date not null,
  price        numeric not null,
  size_sqft    real not null,
  price_psf    real not null,
  rooms        int,
  property_type text not null,
  off_plan     boolean,
  excluded     text,                         -- null = counted; otherwise the cleaning rule that dropped it
  unique (source, source_ref)
);
create index on transactions (building_id, txn_date);
create index on transactions (community_id, txn_date);

create table rent_contracts (
  id           bigserial primary key,
  source       text not null,
  source_ref   text not null,
  source_date  date not null,
  building_id  int references buildings(id),
  community_id int references communities(id),
  raw_building text,
  raw_area     text,
  start_date   date not null,
  end_date     date,
  annual_rent  numeric not null,
  size_sqft    real,
  rooms        int,
  is_new       boolean,                      -- new contract vs renewal
  excluded     text,
  unique (source, source_ref)
);
create index on rent_contracts (building_id, start_date);

create table permits (
  id          serial primary key,
  permit_no   text unique,
  project_id  int references projects(id),
  geom        geometry(Geometry, 4326),
  starts_on   date,
  ends_on     date,
  source      text not null,
  source_date date not null
);

create table pois (
  id          serial primary key,
  category    text not null,                 -- school | health | transit | daily_needs | lifestyle
  subcategory text,
  name        text not null,
  attributes  jsonb not null default '{}',   -- e.g. KHDA rating, curriculum, fees
  geom        geometry(Point, 4326) not null,
  source      text not null,
  source_date date not null,
  active      boolean not null default true
);
create index on pois using gist (geom);

create table building_metrics (
  building_id     int not null references buildings(id),
  period          date not null,             -- month the figures describe
  rooms           int not null default -1,   -- -1 = all bedroom types
  sale_median_psf real,
  sale_count      int,
  rent_median     real,
  rent_count      int,
  gross_yield     real,
  computed_at     timestamptz not null default now(),
  source_date     date not null,             -- newest source file used
  primary key (building_id, period, rooms)
);

-- Phase 2: commute_times, leads.

-- Admin queue for low-confidence matches.
create table match_reviews (
  id          serial primary key,
  raw_name    text not null,
  raw_area    text,
  candidate_building_id int references buildings(id),
  score       real,
  decision    text,                          -- accepted | rejected | new_building
  decided_by  text,
  decided_at  timestamptz
);
