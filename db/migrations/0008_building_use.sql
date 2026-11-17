-- Commercial vs residential. Market-level facts only: no names, no unit-level details.
-- DLD publishes a usage and a sub-type (Flat, Office, Shop, Hotel Apartment ...) on every sale and rent contract.
-- Earlier imports kept only a coarse property_type, so these two columns are filled by re-running `dpi import-dld`.
alter table transactions  add column if not exists usage    text;
alter table transactions  add column if not exists sub_type text;
alter table rent_contracts add column if not exists usage    text;
alter table rent_contracts add column if not exists sub_type text;

-- buildings.building_type (from 0001) holds the class: residential | commercial | mixed | hotel | unknown.
-- building_type_source says where it came from (dld | osm | manual); basis keeps the counts it was worked out from.
-- Written by `dpi classify-buildings`; the web app only reads building_type.
alter table buildings add column if not exists building_type_source text;
alter table buildings add column if not exists building_type_basis  jsonb;
alter table buildings add column if not exists osm_building         text;   -- raw OpenStreetMap building= tag
create index if not exists buildings_type on buildings (building_type);
