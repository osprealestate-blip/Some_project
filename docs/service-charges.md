# Service charges (DLD Owners Association Service Charges)

Source: Dubai Land Department, "Owners Association Service Charges", https://data.dubai/en/l/466633 (RERA-approved budgets).
Licence accepted by the project owner on 2026-11-22 (the portal page shows "Not Specified" and links a draft Open Data
Licence; keep the source line on every figure). Findings and profile: `findings/service-charges-dataset-2026-11-21.md` in the project files.

## Load (on the PC)
1. On the portal page press CSV and save the file to `data/raw/` (never commit it).
2. `dpi migrate` (adds `building_service_charges`).
3. `dpi import-service-charges data/raw/<file>.csv --source-date YYYY-MM-DD`
   Links a building only when exactly one association and one building share the same canonical name. Everything
   near-but-not-exact goes to `data/clean/service_charge_review.csv`; put `y` in `accept` on the right rows and re-run
   with `--reviewed data/clean/service_charge_review.csv`.
4. `dpi push-public ...` copies the usable rows to the hosted database.

## Rules in the code
- Residential rows, latest budget year of 2025 or later, summed per association.
- Left out of the sum: Parking, Storage Units, Meter Installation (not AED per sq ft), Income, Adjustment, Doubtful Debts.
  Unit A/C is stored separately (`ac_psf`) and not added.
- A figure is `complete` (shown) only with at least 5 charge categories and a total of AED 3 to 45 per sq ft.
- The card uses: the building's filed figure, else the community median (10 or more buildings with figures, labelled assumed),
  else the flat AED 15 (labelled assumed). The evidence profile says "Not available" when no figure is matched.
