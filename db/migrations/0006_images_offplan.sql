-- Building photos (free-licence, own, or map snapshot only; see CLAUDE.md) and off-plan project facts.
-- Images are hidden until a person has approved them (approved = true).
create table if not exists building_images (
  id          bigserial primary key,
  building_id int not null references buildings(id) on delete cascade,
  url         text not null,               -- https link to the file (Supabase Storage for our own photos)
  source      text not null check (source in ('own', 'wikimedia', 'mapillary', 'map')),
  author      text,                        -- credit line; required for every source except own
  licence     text,                        -- e.g. CC BY-SA 4.0, CC0, Public domain, Own
  licence_url text,
  source_url  text,                        -- page the image came from (Commons file page, Mapillary image)
  title       text,
  is_primary  boolean not null default false,
  sort        int not null default 0,
  approved    boolean not null default false,
  added_at    timestamptz not null default now(),
  unique (building_id, url)
);
create index if not exists building_images_building on building_images (building_id) where approved;

-- DLD Projects dataset facts, joined to projects by normalised name. All market-level, no personal data.
alter table projects add column if not exists project_number text;
alter table projects add column if not exists developer_name text;
alter table projects add column if not exists percent_completed real;   -- 0..100
alter table projects add column if not exists launch_date date;
alter table projects add column if not exists dld_status text;           -- as published: ACTIVE, FINISHED, NOT_STARTED, PENDING
