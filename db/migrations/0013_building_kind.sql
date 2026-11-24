-- Finer building kind (apartments, villas and townhouses, hotel apartments, office, retail, warehouse, school,
-- hospital, police, petrol station, mosque ...). buildings.building_type (0001/0008) stays the coarse class.
-- Written by `dpi classify-buildings`; the web app only reads these columns. NULL kind = unknown, nothing is shown.
alter table buildings add column if not exists building_kind            text;
alter table buildings add column if not exists building_kind_source     text;   -- dld | khda | dha | osm | manual
alter table buildings add column if not exists building_kind_confidence text;   -- high | medium | low
alter table buildings add column if not exists building_kind_basis      jsonb;  -- counts or the matched place, and its date
create index if not exists buildings_kind on buildings (building_kind);
