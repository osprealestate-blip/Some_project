-- Complexes (sibling towers: Tower A / Tower B, 1 / 2 / 3 ...) and master communities.
-- Written by `dpi group-complexes --apply`. Names only: no personal data, nothing unit-level.
alter table buildings add column if not exists complex_key       text;  -- e.g. 392:sobha-seahaven, same value for sibling towers
alter table buildings add column if not exists complex_name      text;  -- e.g. Sobha Seahaven
alter table buildings add column if not exists master_community  text;  -- Dubai Marina | Jumeirah Village Circle (JVC) | Business Bay, else null
create index if not exists buildings_complex on buildings (complex_key) where complex_key is not null;
create index if not exists buildings_master_community on buildings (master_community) where master_community is not null;

update buildings b set master_community = case c.dm_code
    when '392' then 'Dubai Marina' when '681' then 'Jumeirah Village Circle (JVC)' when '346' then 'Business Bay' end
from communities c
where c.id = b.community_id and c.dm_code in ('392', '681', '346');
