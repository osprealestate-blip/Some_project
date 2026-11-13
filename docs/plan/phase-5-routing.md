# Phase 5 (optional): real routes and minutes

Not built. Start only if the owner approves a routing service and its licence and cost.

## Why it waits
Today every distance on the map is a straight line in km, labelled as such. Travel minutes need road and path data, a travel
mode (walk, drive) and a time of day. We do not invent minutes.

## What it would add
- Glowing road routes from a building to the nearest metro, hospital, school, mall and park, drawn along real roads.
- Walking and driving minutes per route, each labelled with the mode. Rush-hour times only if the provider supplies them.
- The existing straight-line lines stay as the fallback and as the "as the crow flies" view.

## Needs
1. A routing provider (for example OSRM self-hosted on OpenStreetMap data, or a paid API) with a licence that allows showing
   results on a public site. The public OSM demo server must not be used for production traffic.
2. A cache: routes from a building to its five nearest places do not change often, so compute once per building and store.
3. Wording: "about 8 min walk" only for walking routes; never mix straight-line km and route minutes in one number.

## Not planned (no data, would be invented)
Building photos or 3D house models, per-floor or per-unit highlighting, Walk/Transit/Bike Score (trademarked), flood and fire
risk, days on market, price cuts, population by radius, "request a tour" or agent contact.
