-- How a building's master community was decided: name (building name has a known master-development word),
-- area (the official DM area is that one community) or official (official area name with its number dropped).
-- Filled by `dpi group-complexes --apply`; 0009 only set the three launch communities.
alter table buildings add column if not exists master_community_source text;
