-- Villa clusters and new towers can be listed before they have a map position.
-- master_community: the community people search for, when no single official area is known.
-- match_community_ids: sales and rents are matched only in these communities (0 = records with no official area);
-- null = no restriction. Stops a short project name ("Club Villas") picking up another community's sales.
alter table villa_clusters add column if not exists master_community text;
alter table villa_clusters add column if not exists match_community_ids int[];
-- DLD area names used to tie sales to a tower that has no official community.
alter table buildings add column if not exists sale_areas text[];
create index if not exists villa_clusters_master on villa_clusters (master_community) where master_community is not null;
