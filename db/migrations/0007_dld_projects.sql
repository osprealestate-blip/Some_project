-- Every project in the DLD Projects file for the area, whether or not it has appeared in sales yet.
-- Off-plan launches often have no sales rows, so the sales-derived `projects` table cannot list them.
-- Market-level facts only: no names of people, no unit-level data. Filled by `dpi import-projects`.
create table if not exists dld_projects (
  project_number  text primary key,                 -- DLD project number, unique per project
  community_id    int references communities(id),
  name            text not null,                    -- as filed: DLD publishes project names in Arabic
  master_project  text,                             -- English master project, e.g. Business Bay
  developer_name  text,                             -- as filed (Arabic)
  dld_status      text not null,                    -- ACTIVE, NOT_STARTED, PENDING, ...
  percent_completed real,                           -- 0..100
  start_date      date,
  end_date        date,                             -- DLD project_end_date (planned end)
  completion_date date,                             -- DLD completion_date
  no_of_units     int,
  no_of_buildings int,
  source          text not null default 'dld_projects',
  source_date     date not null
);
create index if not exists dld_projects_community on dld_projects (community_id, dld_status);
