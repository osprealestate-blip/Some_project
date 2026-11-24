#!/usr/bin/env bash
# Builds walking and driving route data for Dubai from OpenStreetMap (one time, ~15-30 min on 1 vCPU).
# Run on the server from deploy/:  bash scripts/prepare-routing.sh
# Then set ROUTING_ENABLED=1 in .env and start with:  docker compose --profile routing up -d
set -euo pipefail
cd "$(dirname "$0")/../.."
D="$PWD/routing-data"; mkdir -p "$D/foot" "$D/car"; cd "$D"
[ -f gcc.osm.pbf ] || curl -fL -o gcc.osm.pbf https://download.geofabrik.de/asia/gcc-states-latest.osm.pbf
# Cut the Dubai area out first so OSRM needs little memory (a little wider than the app's own Dubai box).
osmium extract -b 54.70,24.50,55.80,25.60 gcc.osm.pbf -o dubai.osm.pbf --overwrite
IMG=osrm/osrm-backend:v5.27.1
for M in foot car; do
  cp dubai.osm.pbf "$M/dubai.osm.pbf"
  docker run --rm -v "$D/$M:/data" $IMG osrm-extract -p /opt/$M.lua /data/dubai.osm.pbf
  docker run --rm -v "$D/$M:/data" $IMG osrm-partition /data/dubai.osrm
  docker run --rm -v "$D/$M:/data" $IMG osrm-customize /data/dubai.osrm
  rm "$M/dubai.osm.pbf"
done
rm -f gcc.osm.pbf
echo "Routing data ready in $D"
