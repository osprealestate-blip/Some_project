# Push batch: the remaining 174 communities (sales and rents)

Written 2026-11-17. The hosted database was 310 MB of 500 MB. The first 60 communities by 12-month sales are
already hosted (top 20, then the next 40). This batch is the other 174, which are small: together they hold
2,475 sales and 349,001 rents in the last 12 months, almost all rents (Al Barsha, Naif, Al Karama, Al Nahda and
similar older districts).

Estimate (coverage_by_community.csv, calibrated on the 40-community batch: real +113 MB against 115 estimated;
sales at 3 years are about 3.8 times the 12-month count): about +93 MB, so about 403 MB, 81% of 500 MB, leaving
about 97 MB. Nothing is left out because of size. `--add` refuses above 90% (450 MB) unless `--force-size`.
Buildings, summaries and positions for these communities were pushed earlier (`--all-structure`), so no
structure push is needed.

Run from the repo root in PowerShell with `HOSTED_DATABASE_URL` and `DATABASE_URL` set as in README.md.
Run each dry run first and read the last two lines (growth and size). If "after about" is above 425 MB, stop.

## Part A: 31 communities, about +73 MB
```powershell
$a = "373,118,318,241,127,245,124,117,231,317,312,421,123,365,248,316,129,335,614,133,128,319,333,134,416,313,358,119,599,116,336"
dpi push-public --add --communities $a --years 3 --rent-years 1 --dry-run
dpi push-public --add --communities $a --years 3 --rent-years 1
```

## Part B: 143 small communities, about +20 MB
```powershell
$b = "113,126,214,122,112,114,359,242,322,243,284,216,364,613,111,115,125,247,353,342,315,215,314,412,356,354,264,352,616,362,532,368,323,246,369,261,226,811,511,325,363,367,376,357,931,132,533,262,375,282,711,281,891,423,221,814,131,622,671,422,841,263,302,303,424,831,228,121,271,731,617,227,721,244,615,917,845,941,987,213,311,283,252,594,813,384,512,736,919,923,847,945,727,234,516,413,304,267,,,,,,,,951,913,911,912,967,991,857,851,233,924,431,724,981,978,835,988,961,975,824,956,268,861,232,502,355,,425,971,826,735,916,918,265,592,593,266,914,821"
dpi push-public --add --communities $b --years 3 --rent-years 1 --dry-run
dpi push-public --add --communities $b --years 3 --rent-years 1
```

Re-running a part is safe: each community and table is replaced inside its own transaction.

## After the rent date rule change: refresh figures (no new rows, no emptying)

The new rule (rents and sales dated more than 31 days after the newest file date, 2 Nov 2026, are set aside
as `future_date`) runs inside `compute-metrics`. Run on the PC, repo root, `DATABASE_URL` = local database:

```powershell
dpi compute-metrics          # prints "newly set aside as future_date: N sales, N rents"
dpi push-public --summaries-only
```

`--summaries-only` replaces only `building_summary`, `community_summary` and `community_metrics` on the hosted
database (one transaction per table). Sales, rents, buildings and places are untouched, so size barely changes.
Run it after the two parts above, so the figures cover the new communities too.

Rows already hosted keep their old flag until their community is added again; the website figures come from
the summary tables, so they are right after `--summaries-only`. `--add` now skips future-dated rows, so the
parts above do not copy them.
