-- How a rent contract got its building: 'project' = its project has one tower (exact),
-- 'size' = estimated from the exact unit size and bedrooms seen in that building's sales.
alter table rent_contracts add column if not exists building_match text;
update rent_contracts set building_match = 'project' where building_id is not null and building_match is null;
create index if not exists rent_contracts_match on rent_contracts (building_match) where building_match is not null;
