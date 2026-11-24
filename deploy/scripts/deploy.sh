#!/usr/bin/env bash
# Deploy the latest code from GitHub. Run on the server:  bash ~/some_project/deploy/scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
git -C .. fetch origin main && git -C .. merge --ff-only origin/main
PROFILE=""; [ "${ROUTING_ENABLED:-$(grep -oP '(?<=^ROUTING_ENABLED=).*' .env || echo 0)}" = "1" ] && PROFILE="--profile routing"
docker compose $PROFILE up -d --build
docker image prune -f >/dev/null
docker compose ps
