-- Development = every phase that shares a name ("Azizi Venice 1" ... "Azizi Venice 16"), however far apart the towers sit.
-- complex_key (0009) stays the tight group: the buildings of one numbered phase ("Azizi Venice 14", Buildings A-G).
alter table buildings add column if not exists development_key  text;
alter table buildings add column if not exists development_name text;
create index if not exists buildings_development on buildings (development_key) where development_key is not null;
