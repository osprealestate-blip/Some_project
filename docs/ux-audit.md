# UX audit and redesign plan

Step 0 of the UX/UI transformation brief. Document only: no code changes ride with it.
Audited 2026-11-11 against the live site (https://some-project-five.vercel.app, main at PR #28) and the code in `web/`.

**How it was checked.** Every page and component in `web/app` and `web/components` was read. The live site was
loaded on desktop (1920 px) and phone (360 px) for the homepage, a community page (JVC, `/community/681`), a
building page (`/building/binghatti-apex`), the fair-price checker, search (`/search?q=marina`) and two not-found
URLs. Screenshots were taken with an automated browser, so one finding (community-page map, problem U-14) still
needs a check in a real browser.

**Guardrails for everything below.** No change to the pipeline, schema, migrations, existing API contracts,
building placement or any calculation. Map code is untouched (the map's style, colour-by, hover and placement).
No mock data, no invented figures, photos, metro or school data. Asking prices are never shown as sales, and
estimates are never shown as Ejari contracts. Items that would cross a guardrail are listed under
[Needs your decision](#9-needs-your-decision) and are not planned until you say yes.

---

## 1. Current assessment

**What already works well, and must be kept**

- The data is honest. Every block of figures carries a source and date (`SourceNote`), estimates carry the
  required disclaimer, project-level and estimated rents are labelled, and medians need 3+ deals.
- The building page is rich: bedroom table, 10-year quarterly charts with a table view, monthly cost, Golden
  Visa price check, recent sales, Nearby with a basic Life Score, distances with real route links, and a
  plain "About this page" on how the building was matched.
- The community page explains the like-for-like change against the plain median, and splits ready from off-plan.
- The map panel (`@modal` route) opens a building over the map without losing your place, works as a bottom
  sheet on phones, and closes with Esc or Back.
- The charts are accessible already: `aria-label` with the latest value, crosshair tooltip, "Show as table".
- The layout uses logical (start/end) spacing, so Arabic can follow later.

**What holds it back**

1. **It speaks to analysts, not to ordinary people.** The homepage is a map plus three area cards and two tools.
   Nothing asks *what are you trying to do?* A first-time buyer, an investor, an owner and a tenant all land on
   the same price-per-sq-ft map, with no route to "what can I afford" or "is my rent fair".
2. **Navigation is a list of places and two tools.** The header shows Dubai Marina, JVC, Business Bay, Fair price,
   Rent increase. The monthly cost calculator and Golden Visa check exist but can only be found by scrolling a
   building page. There is no Communities or Buildings index, no tools hub and no "How it works" link in the
   header (only a small footer link to `/about`).
3. **Everything is shown at once.** A building page is one long scroll of about 12 sections with equal weight.
   The four headline figures sit above the fold, but none of them says in plain words what it means
   ("Gross yield (estimate) 6.5%, median across bedroom types" assumes you know what gross yield is).
4. **Jargon is not explained where it appears.** Gross yield, price per sq ft, DLD, Ejari, off-plan, service
   charge, like-for-like, "project" rent and "est." are explained only on `/about`, which a visitor has to find.
5. **Mobile works but is not designed for touch.** The header wraps to three rows, nav items are clipped at the
   screen edge, tables scroll sideways with no hint, the Nearby section overflows the screen, and chart labels
   shrink to unreadable sizes.
6. **Loading and error states are thin.** Only the building panel has a loading skeleton. There is no `error.tsx`
   anywhere, so a database hiccup shows the default Next.js error. The fair-price form says why it can't answer
   (too few sales), which is good; most other places just show "–".

---

## 2. Usability problems found

Each problem has an id used in the backlog (section 10). "Evidence" says where it was seen.

| Id | Problem | Evidence | Class |
|---|---|---|---|
| U-1 | Homepage area cards label price per sq ft as "Median price" (shows "AED 2,365/sq ft" under "Median price"). A first-time buyer reads it as the price of a flat. | `app/page.tsx` line ~85; live homepage | P0 |
| U-2 | No intent entry points (buy, invest, own, rent). Homepage leads with a city-wide map coloured by AED/sq ft. | Live homepage | P0 |
| U-3 | Header nav mixes three place names and two tools; monthly cost and Golden Visa are not reachable from nav or homepage; no Communities, Buildings, Tools or How it works pages. | `components/SiteHeader.tsx` | P0 |
| U-4 | Search is name-only with no filters, and results include non-homes with no figures ("Marina Promenade Retail", "Marina Vista Podium"). No way to ask "2-bed under AED 2M with 6%+ yield". | `/search?q=marina`; `lib/queries.ts` `search()` | P0 (filters need a decision, see D-1) |
| U-5 | Building page has no hierarchy: about 12 sections at equal weight, no collapse, no in-page jump links. | Live building page (3,700 px tall on desktop, 5,700 px on phone) | P0 |
| U-6 | Headline figures have no plain-language line ("what this means for you"). | `components/Stat.tsx`, `BuildingDetail.tsx` | P0 |
| U-7 | Building "Change on a year earlier" can mislead: Binghatti Apex shows +21.2% because a year ago its sales were few and mostly off-plan (Q1 2025: 13 sales). The community page explains mix effects; the building page does not. | Live `/building/binghatti-apex` | P0 (label and context only; no calc change) |
| U-8 | No "last updated" or data-confidence signal next to the headline; the date is in small print below. | Building and community pages | P0 |
| U-9 | Glossary terms are unexplained in place (gross yield, per sq ft, DLD, Ejari, off-plan, ready, service charge, "project", "est.", like-for-like, Life Score). | All data pages | P0 |
| U-10 | Monthly cost calculator mixes real medians (price, size, rent) and assumptions (rate 4.5%, service charge AED 15/sq ft, utilities AED 1,200) in one undifferentiated form. The assumptions are placeholders still awaiting owner confirmation (`config/costs.ts`). | Building page; `config/costs.ts` | P0 |
| U-11 | Golden Visa block says the visa "needs property worth at least AED 2,000,000", which reads like an eligibility check. It only compares median prices to the threshold. | `GoldenVisaChecker.tsx` | P0 |
| U-12 | Fair-price checker is one form; the result shows "Median per sq ft" in AED even when another currency is selected (the other result lines convert). Price input is AED only while results show the chosen currency. | `FairPriceForm.tsx` line ~416 | P0 (display only) |
| U-13 | Phone: header takes three rows; nav is clipped ("Rent…" cut off) with no scroll hint; search placeholder is cut. | Phone screenshots, homepage and building page | P0 |
| U-14 | Community page: in the automated full-page screenshot the area map collapsed and its legend floated over the Buildings table. Needs a real-browser check before acting; if real, it is a layout bug around the map container (page side, not map code). | Desktop screenshot of `/community/681` | P0 to verify |
| U-15 | Phone: the Nearby section and the small map overflow the right edge of the screen (Life Score distances and the map are cut off), so the whole page scrolls sideways. | Phone screenshot of building page | P0 |
| U-16 | Phone: tables (bedroom types, recent sales, buildings list) scroll sideways with no visual cue; columns past the edge (Per sq ft, Status, Rent, Yield) are invisible. | Phone screenshot of building page | P0 |
| U-17 | Charts: axis labels are drawn at 11 units in a 640-wide viewBox, so on a 360 px phone they render at about 5 px. | `LineChart.tsx`; phone screenshot | P0 |
| U-18 | Small touch targets: bedroom chips, "Change" link in the building picker, "Show as table", "Route" links, the panel's close button area are under 44 px. | Phone screenshots | P0 |
| U-19 | Community page "Buildings (200)" while the homepage says JVC has 378 buildings. The list is capped at 200 by the query, but the heading reads like a total. | `/community/681`; `communityBuildings(limit = 200)` | P0 (label only) |
| U-20 | Community buildings table: 200 rows, no sort, no filter, no search, no paging. Most rows show "–" for rent and yield with no reason given. | `/community/681` | P1 |
| U-21 | No `loading.tsx` for pages and no `error.tsx` anywhere. Pages are `force-dynamic` and query the database on every request, so a slow query shows a blank screen and a failed one shows the framework error page. | `web/app` tree | P1 |
| U-22 | Not-found page always says "Buildings get a page once enough DLD sales are matched", also for a community URL; it offers only "Back to the map", no search. | `/community/1`, `/building/does-not-exist-xyz` | P1 |
| U-23 | "No data" message (`NoData`) tells visitors to set `DATABASE_URL` in `web/.env.local`: a developer message on the public site. | `components/NoData.tsx` | P1 |
| U-24 | Focus styles: the search input and several controls use `outline-none` with only a border colour change; nav links have no `aria-current`. | `SearchBox.tsx`, `CurrencySwitcher.tsx`, `SiteHeader.tsx` | P1 |
| U-25 | Colour carries meaning alone in the fair-price verdict and Golden Visa column (green/amber text). The words are present, so this is minor; add an icon or prefix. | `FairPriceForm.tsx`, `GoldenVisaChecker.tsx` | P1 |
| U-26 | Reduced motion: only the Illustrated theme honours `prefers-reduced-motion`. Page-level animations (skeleton pulse, smooth scrolls added later) should too. | Repo-wide grep | P1 |
| U-27 | Nearby lists repeat entries ("Bus stop" twice, "Socialicious Cafe" twice) and a school appears under Health. This is source data; the UI can de-duplicate identical name+distance rows, but cannot fix categories. | Live building page | P2 (UI de-dup only) |
| U-28 | Map attribution is printed twice ("OpenFreeMap © OpenMapTiles Data from OpenStreetMap \| OpenFreeMap © OpenMapTiles © OpenStreetMap contributors") and covers a large block of the phone map. | Live map | P2 (map code, needs D-4) |
| U-29 | Map legend counts on a community or building page are city-wide (same 25 / 120 / 96… everywhere), not this area's. | Community and building pages | P2 (map code, needs D-4) |
| U-30 | Homepage hero card covers about 40% of the phone map, so the map is barely usable on the first screen. | Phone homepage screenshot | P0 (fixed by the new homepage) |

---

## 3. Recommended homepage

The map stays one tap away but stops being the first thing a newcomer has to decode.

```
┌──────────────────────────────────────────────────────────────┐
│ Header (see section 4)                                       │
├──────────────────────────────────────────────────────────────┤
│ Find the right property. Understand the real market.         │
│ Official Dubai Land Department sales and rent data,          │
│ building by building. Free, no login.                        │
│                                                              │
│ [ Search a building or area ……………………… ] [ Filters ]          │
│ [ Open the 3D map → ]                                        │
├──────────────────────────────────────────────────────────────┤
│  Buy          Invest         I own a        Rent             │
│  "What can    "Where do      property       "Is my rent      │
│  I afford?"   rents pay      "What is it    fair? How much   │
│               best?"         worth?"        can it rise?"    │
├──────────────────────────────────────────────────────────────┤
│ Areas we cover today: Dubai Marina · JVC · Business Bay      │
│ (existing cards, relabelled: "Price per sq ft", plain line)  │
├──────────────────────────────────────────────────────────────┤
│ Tools: Fair price · Monthly cost · Golden Visa price check · │
│ Rent increase                                                │
├──────────────────────────────────────────────────────────────┤
│ Where the numbers come from (3 lines + link to How it works) │
└──────────────────────────────────────────────────────────────┘
```

**The four intent pages** (`/buy`, `/invest`, `/own`, `/rent`) are short guided pages built only from data and tools
that exist today. Each opens with one question, a two-line explanation, and two or three next steps.

| Page | First question | Built from (existing) | Honest limits shown |
|---|---|---|---|
| Buy | "What do homes really sell for, and what would it cost me each month?" | Area cards (price per sq ft, by bedroom table), search, fair-price checker, monthly cost calculator, Golden Visa price check | Prices are DLD sale prices, not listings. We don't show homes for sale. |
| Invest | "Where do rents pay back best?" | Community gross yield by bedroom type, community buildings list sorted by gross yield (existing `communityBuildings` rows), monthly cost (net yield), ready vs off-plan split | Gross yield ignores fees and vacancy. Only buildings with their own or project rents show a yield. |
| I own a property | "What is my home worth today, and what can I charge?" | Fair-price checker (as an estimate range), building bedroom table, median rents, rent increase rules | Not a valuation; floor, view and condition unknown. |
| Rent | "Is my rent fair, and how much can it go up?" | Median Ejari rents by bedroom (community and building), rent increase calculator (Decree 43 of 2013) | The official RERA index decides disputes; our figure is an estimate from Ejari contracts. |

No intent page invents a recommendation or a "best building". The Invest list is a sortable table of real
figures, not a ranking with a winner.

---

## 4. Recommended navigation and search

**Desktop header (one row):** logo · Explore Map · Communities · Buildings · Property Tools · How It Works ·
(currency) · search.

**Phone header (one row):** logo · search icon · menu button. The menu opens a full-height sheet with the five
links as 48 px rows, the currency picker, and "How the figures are made". A thumb-reach bottom bar is *not*
proposed: the building panel already uses the bottom of the screen.

**New index pages** (no new data, existing queries only):

- `/communities`: the three launch communities as cards (existing `launchCommunities()`), with a plain line that
  more areas come later. No list of 234 empty communities.
- `/buildings`: the existing per-community building lists combined under three tabs, with sort (sales, price per
  sq ft, rent, yield) and a name filter, client-side. Shows "Top 200 by sales of 378" when capped (fixes U-19).
- `/tools`: the four tools as cards with one-line "use this when…" descriptions. Monthly cost and Golden Visa
  pick a building first (they are per building today).
- `/how-it-works`: see section 5.

**Search.** Keep the current type-ahead (it is quick and handles typos). Improve it without changing the API:

- Group results under "Areas" and "Buildings"; show price per sq ft and sales count on each building row.
- Down-rank or hide rows with no 12-month figures (retail, podium). Done in the UI from fields the API already
  returns (`psf`). Nothing is removed from the data.
- Filters (budget, bedrooms, yield) need data the search API does not return. See D-1.

---

## 5. Page-by-page proposal

### Building page (P0-4, P0-3, P0-5, P0-7)

Above the fold, in this order:

1. Breadcrumb · **name** · community (official name in small print) · floors · units.
2. **Four figures, each with a one-line meaning:**
   - Typical price per sq ft · "Half of the 297 homes sold here in the last 12 months went for more, half for less."
   - Typical price (busiest bedroom type) · from the existing bedroom row, e.g. "1 bed: AED 1.15M".
   - Gross yield (estimate) · "A year's rent is about 6.5% of the price, before fees and empty months."
   - Last update and data confidence · "Data to 30 Oct 2026 · Good: 297 sales, 256 own rent contracts".
3. Simple / Advanced toggle (Simple by default, remembered in `localStorage`, nothing removed).

Below, collapsible sections with jump links:

| Section | Simple view | Advanced view adds |
|---|---|---|
| Overview | Plain summary sentence built from existing figures; matching method in plain words | Names seen in DLD files, map position source |
| Sale prices | Bedroom rows: type, typical price, typical size | Per sq ft, sales count, full table, quarterly chart |
| Rentals | Typical annual rent by bedroom, rent level label ("whole project", "estimated") | Contract counts, quarterly chart, off-plan comparison table |
| History | Change on a year earlier **with context** (U-7): sales counts this year and last; a note when last year had under 15 sales or a different ready/off-plan mix, based on the recent-sales status column already loaded | Both quarterly charts with table view |
| Recent transactions | Last 5 sales as cards on phone | All 15, table |
| Ownership costs | Monthly cost with "From DLD data" and "Your assumptions" groups; Golden Visa price check | Cash needed to buy, all inputs |
| Nearby | Life Score with a one-line meaning, top place per group | Full lists, key distances |
| Data and methodology | Sources, date, what "estimate" means, link to How it works | Data confidence detail (see D-2) |

The year-on-year figure is not recalculated or hidden; it gets a context line. Changing *how* it is calculated
(like-for-like at building level) would be a calculation change and is out of scope.

### Community page (P0-3, P0-5)

Same pattern: four figures with meanings and data date; Simple shows the four figures, ready vs off-plan, the
bedroom table (type, typical price, rent, gross yield) and the map; Advanced adds charts, sales counts and the
like-for-like explanation. The buildings list moves to a sortable, filterable table (P1, U-20), with a reason in
place of "–" (for example "rent: too few contracts"). Fix the "Buildings (200)" heading (U-19).

### Fair-price checker (P0-6)

Four short steps on one page, each revealed after the previous: 1 building, 2 bedrooms, 3 size, 4 asking price
(optional), then the result. The result keeps the existing estimate, range and verdict text, adds "Based on N
sales, building/community scope", and when there are fewer than 5 comparable sales it says so and suggests the
community view or another bedroom type instead of guessing (this behaviour already exists in `assessPrice`; it
gets clearer wording). The asking price is labelled "the price you were quoted", never mixed with sales.
Fix the unconverted "Median per sq ft" (U-12).

### Monthly cost calculator (P0-6)

Two visible groups:
- **From DLD data** (read-only by default, editable on tap): typical price, typical size, typical rent, with
  source and date.
- **Your assumptions** (editable, marked "general assumption, not this building's figure"): down payment, rate,
  term, service charge, utilities.

Net yield stays labelled "estimate"; gross yield wherever shown is labelled "gross". The calculation in
`lib/costs.ts` is not touched. The placeholder defaults still need your confirmation (D-3).

### Golden Visa price check (P0-6)

Retitle to "Golden Visa: price threshold check". First line: "This only checks whether typical prices here are
above AED 2 million. It does not check eligibility." Keep the per-bedroom table and official link.

### Rent increase calculator (P0-6)

Already step-like. Reorder to: 1 your current rent, 2 the average (RERA index if you have it, otherwise our
Ejari estimate), 3 contract end date, then the answer. Label the estimate path clearly as an estimate.

### How it works (P0-7)

New `/how-it-works` page that reuses and extends `/about` (which redirects to it). Sections: where the data comes
from (DLD sales, Ejari rents, KHDA, DHA, OSM, Dubai Municipality), how often it updates and the current data date,
what we count and leave out, how deals are matched to buildings, what each figure means (glossary), what an
estimate is, limits (no listings, no floor/view, no valuations), privacy (no personal data).

### Search results page

Same grouping as the type-ahead, plus the filter row once D-1 is decided.

### Not found and errors (P1)

Separate copy for missing building vs missing community, with the search box and links to the three areas.
`error.tsx` at the app root: "We couldn't load the figures just now. Try again." with a retry button. Replace
the developer text in `NoData` with a visitor message.

---

## 6. Mobile proposal (P0-8)

- One-row header with a menu sheet (section 4).
- Fix the page-wide sideways scroll on building pages (U-15): Nearby grid and the small map need `min-w-0` on
  the grid children; distances wrap under the name.
- Tables become stacked cards under 640 px for recent sales and the buildings list; the bedroom table keeps
  columns but shows a scroll hint (fade edge) and pins the first column (U-16).
- Charts: larger axis text on narrow screens (render labels at a size based on the drawn width, not the viewBox),
  fewer y-ticks, tap to show the tooltip (U-17). Chart drawing logic and data stay the same.
- 44 px minimum touch targets for chips, links in rows, toggles and close buttons (U-18).
- Number inputs use `inputMode="decimal"`/`numeric` (already mostly done) and show the unit inside the field.
- Homepage: the hero is above the map, not on top of it (U-30); the map button opens the full-screen map.
- Checked at 360, 390 and 768 px, light and dark.

---

## 7. Component reuse

**Reuse as is:** `SourceNote`, `LineChart` (plus the label-size fix), `RoomsTable`, `NearbyPanel`, `KeyDistances`,
`BuildingPicker`, `SearchBox`, `CurrencySwitcher`, `BuildingMap` and `BuildingPanel` (untouched), all of `lib/`.

**Extend:**
- `Stat` gets optional `meaning`, `term` (glossary link) and `confidence` props; existing calls keep working.
- `NoData` gets visitor copy and an optional reason.

**New, small, shared:**
- `Term` / glossary tooltip: a button with a short definition popover and "What does this mean?" link to the
  glossary anchor on How it works. Keyboard and touch friendly; definitions live in one file (`lib/glossary.ts`).
- `ViewToggle` (Simple / Advanced) with a context so sections can read the mode.
- `Section` (collapsible, with an id for jump links; uses `<details>` so it works without JavaScript).
- `IntentCard` for the homepage and Tools hub.
- `MobileNav` sheet.
- `DataBadge` ("Data to 30 Oct 2026 · Good") built from counts already on the page.

No new library is needed for any of this.

---

## 8. What data exists, and what doesn't

So no screen promises something we can't show.

| Exists (can be shown) | Does not exist (show an honest empty state or leave out) |
|---|---|
| DLD sale price, size, bedrooms, date, ready/off-plan flag, per building and community, 12-month medians and quarterly series | Asking prices or listings (never scraped, never shown as sales) |
| Ejari rent medians by bedroom, with building / project / estimated level | Per-building service charges (we use a general assumption) |
| Community like-for-like change and ready vs off-plan split | Building-level ready vs off-plan split and like-for-like change (would need pipeline work) |
| Building floors, units, project, aliases, matching method, map position source | Photos (none loaded yet; only free-licence images are allowed per CLAUDE.md) |
| Nearby: OSM transit, shops, parks; KHDA schools and ratings; DHA facilities | Floor, view, condition, developer delivery dates, metro walking times |
| Golden Visa threshold (config), Decree 43 bands, DLD fees | Visa eligibility, mortgage approval, rush-hour commutes |

---

## 9. Needs your decision

These touch a guardrail or change scope. Nothing here is built until you say yes.

- **D-1 Search filters (budget, bedrooms, yield).** The search API returns only name, community and price per sq
  ft. Filters need per-bedroom price, rent and yield. Options:
  (a) add one new read-only endpoint, e.g. `/api/explore`, that reads the existing `building_summary` table
  (no change to existing APIs, schema or calculations); or
  (b) filter client-side on the map's existing `/api/buildings` data: budget and yield only, all-bedroom figures,
  and only buildings placed on the map. **Recommended: (a)**, because (b) silently drops unplaced buildings and
  can't filter by bedrooms.
- **D-2 Data confidence label.** Propose a three-level label (Good / Limited / Too few) using thresholds that
  already exist in the code: 15+ sales "Good" and 5+ "Limited" (`GOOD_COMPS`, `MIN_COMPS` in `lib/fairPrice.ts`),
  plus rent level (own / project / estimated). It is a display label, not a new figure, but it is a new rule, so
  please confirm.
- **D-3 Monthly cost defaults.** 20% down, 4.5% rate, 25 years, AED 15/sq ft service charge and AED 1,200/month
  utilities are still marked "placeholders, owner to confirm" in `config/costs.ts`. The redesign will label
  them "general assumptions"; confirm or give new values.
- **D-4 Map-side fixes.** U-28 (duplicated attribution) and U-29 (city-wide legend counts on area pages) are in
  map code, which the brief puts off limits outside Part B. Leave them, or allow two small map PRs?
- **D-5 `/about` URL.** Move it to `/how-it-works` with a permanent redirect from `/about`? (Recommended.)

---

## 10. Backlog and PR plan

One branch and one PR per item, each off the latest main. Each PR states what changed, what was tested, risks, and
confirms numbers are unchanged (see "How we prove figures didn't change" below).

### P0 (before launch)

| PR | Item | Fixes | Notes |
|---|---|---|---|
| P0-1 | Homepage by intent + four guided pages (`/buy`, `/invest`, `/own`, `/rent`) | U-1, U-2, U-30 | Headline and subline as in the brief; map button; area cards relabelled |
| P0-2 | Navigation and search: new header, phone menu sheet, `/communities`, `/buildings`, `/tools` hubs, grouped search results | U-3, U-4 (filters after D-1), U-13, U-19 | Filters land in this PR if D-1 is decided by then, otherwise a follow-up |
| P0-3 | Simple / Advanced toggle on building and community pages | U-5 | Simple by default, nothing removed |
| P0-4 | Building page redesign: above-the-fold figures with meanings, collapsible sections, jump links, year-on-year context | U-5, U-6, U-7, U-8 | Built on P0-3 |
| P0-5 | Glossary: `Term` tooltips + "What does this mean?" | U-9 | Gross yield, price per sq ft, DLD, Ejari, service charge, off-plan vs ready, plus "project"/"est." rent and Life Score |
| P0-6 | Tools made self-explanatory: stepped fair price, cost calculator groups, gross labelling, Golden Visa wording, rent increase order | U-10, U-11, U-12 | No change to `lib/fairPrice.ts`, `lib/costs.ts`, `lib/goldenVisa.ts`, `lib/rentIncrease.ts` |
| P0-7 | Trust and transparency: `DataBadge` on major figures, How it works page | U-8 | Needs D-2 for the confidence label, D-5 for the URL |
| P0-8 | Mobile pass | U-14 (after real-browser check), U-15, U-16, U-17, U-18 | Last, so it covers the new pages too |

Order: P0-2 first (the header is shared by everything), then P0-1, P0-5, P0-3, P0-4, P0-6, P0-7, P0-8.

### P1 (after approval)

- Building comparison: up to 4 buildings, shareable URL (`/compare?b=slug1,slug2`), side-by-side existing figures,
  no "winner", follows the currency switcher.
- Empty, loading and error states: `loading.tsx` skeletons for building, community and search; root `error.tsx`;
  visitor `NoData`; separate not-found copy (U-21, U-22, U-23); reasons instead of "–" (U-20).
- Community buildings table: sort, filter, paging (U-20).
- Accessibility: focus rings, `aria-current`, labels, contrast check of every token in both themes, colour plus
  icon for verdicts, `prefers-reduced-motion` for page animations (U-24, U-25, U-26).
- Performance: lazy-load the small maps on building and community pages (render when scrolled into view),
  defer charts below the fold, check bundle size of new components.

### P2 (later)

- De-duplicate identical Nearby rows in the UI (U-27).
- Map-side fixes if D-4 allows (U-28, U-29).
- Natural-language search (explicitly out of scope for now).
- Photos from Wikimedia Commons / Mapillary with credit, when a licensed source is wired up.
- Saved buildings and shareable "my shortlist" (no login: URL or local storage only).

### How we prove figures didn't change

Before the first P0 PR, add a small check that loads three reference pages (one building and one community in
each launch area is the target; at minimum Binghatti Apex and JVC) in a local build, extracts every number shown,
and compares the list before and after a change. Plus the existing `npm run typecheck && npm test && npm run build`.
Calculation files (`lib/fairPrice.ts`, `lib/costs.ts`, `lib/goldenVisa.ts`, `lib/rentIncrease.ts`,
`lib/lifeScore.ts`, `lib/stats.ts`, `lib/mapMetrics.ts`) and `lib/queries.ts` must show no diff in any P0 PR,
except a new additive query if D-1 (a) is approved.

---

## 11. Risks

- **Scope creep into data.** Several natural asks (building-level like-for-like, per-building service charge,
  photos) need pipeline work. They are listed as "does not exist" and stay out.
- **Two views can drift.** Simple and Advanced must render from the same props so a figure can't differ between
  them; the toggle only hides sections.
- **Plain-language lines can overstate.** Every meaning line is a template over existing numbers and is reviewed
  against the disclaimer; no line says "good investment" or "cheap".
- **Intent pages could look like advice.** Each carries the disclaimer and says what it can't tell you.
- **Preview deployments show no data** (memory: the PR preview project lacks `DATABASE_URL`), so UI review on
  previews needs the live data env var set for Preview, or local runs with screenshots attached to each PR.
- **Header change touches every page.** P0-2 goes first and is kept small so later PRs rebase cleanly.
