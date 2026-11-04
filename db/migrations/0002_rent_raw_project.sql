-- Rent contracts carry a project name but no building name (see docs/datasets.md).
alter table rent_contracts add column if not exists raw_project text;
