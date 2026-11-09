-- Ready and off-plan sales separately per community, and a like-for-like yearly change (same towers),
-- because the plain change of the median moves with the mix of off-plan and new towers. Filled by
-- `dpi compute-metrics` on the all-bedrooms row (rooms = -1).
alter table community_summary add column if not exists sale_count_ready_12m int not null default 0;
alter table community_summary add column if not exists sale_median_psf_ready_12m real;
alter table community_summary add column if not exists sale_median_psf_ready_prev_12m real;
alter table community_summary add column if not exists sale_count_offplan_12m int not null default 0;
alter table community_summary add column if not exists sale_median_psf_offplan_12m real;
alter table community_summary add column if not exists sale_median_psf_offplan_prev_12m real;
alter table community_summary add column if not exists like_for_like_change real;  -- e.g. 0.004 = +0.4%
alter table community_summary add column if not exists like_for_like_towers int not null default 0;
