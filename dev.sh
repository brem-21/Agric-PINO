#!/usr/bin/env bash
#
# dev.sh — set up and run the Lorgric/Agrictech app for local development.
#
# What it does:
#   1. Makes sure it's being run from the project root (the dir containing
#      package.json + src/), regardless of where it was invoked from.
#   2. Installs npm dependencies if node_modules is missing.
#   3. Makes sure a .env(.local) file exists.
#   4. Brings up the dockerized Postgres database if it isn't already running,
#      and waits until it reports healthy.
#   5. Runs `npm run dev`.
#
# Usage:
#   ./dev.sh
#
set -euo pipefail

# ---------------------------------------------------------------------------
# 0. Colors / logging helpers
# ---------------------------------------------------------------------------
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}==>${NC} $*"; }
warn()  { echo -e "${YELLOW}==>${NC} $*"; }
error() { echo -e "${RED}==>${NC} $*" >&2; }

# ---------------------------------------------------------------------------
# 1. Resolve the project root and make sure we're in the right place.
#
# The script lives at the project root (next to package.json and src/), so
# we cd to the script's own directory first. This lets you run
# `./dev.sh` or `path/to/dev.sh` from anywhere and still land in the
# right place.
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ ! -f "package.json" || ! -d "src" ]]; then
  error "This doesn't look like the project root (expected package.json and a src/ dir here: $SCRIPT_DIR)."
  error "Move dev.sh back to the project root, or run it from there."
  exit 1
fi

info "Project root confirmed: $SCRIPT_DIR (package.json + src/ present)"

# ---------------------------------------------------------------------------
# 2. Check required tooling
# ---------------------------------------------------------------------------
command -v node >/dev/null 2>&1 || { error "node is not installed. Install Node.js first."; exit 1; }
command -v npm  >/dev/null 2>&1 || { error "npm is not installed. Install Node.js/npm first."; exit 1; }
command -v docker >/dev/null 2>&1 || { error "docker is not installed. Install Docker first."; exit 1; }

if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE=(docker-compose)
else
  error "Neither 'docker compose' nor 'docker-compose' is available."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  error "Docker daemon isn't running. Start Docker and try again."
  exit 1
fi

# ---------------------------------------------------------------------------
# 3. Install dependencies if needed
# ---------------------------------------------------------------------------
if [[ ! -d "node_modules" ]]; then
  info "node_modules not found, running npm install..."
  npm install
else
  info "node_modules already present, skipping npm install."
fi

# ---------------------------------------------------------------------------
# 4. Make sure an env file exists
# ---------------------------------------------------------------------------
if [[ ! -f ".env" && ! -f ".env.local" ]]; then
  if [[ -f ".env.example" ]]; then
    warn "No .env or .env.local found. Copying .env.example -> .env.local"
    cp .env.example .env.local
    warn "Review .env.local and update values (DATABASE_URL, secrets, etc.) as needed."
  else
    warn "No .env, .env.local, or .env.example found. Make sure DATABASE_URL is set before continuing."
  fi
fi

# ---------------------------------------------------------------------------
# 5. Make sure the dockerized database is up
# ---------------------------------------------------------------------------
DB_SERVICE="postgres"
DB_CONTAINER="agrictech_db"

is_db_healthy() {
  local status
  status="$(docker inspect --format '{{.State.Health.Status}}' "$DB_CONTAINER" 2>/dev/null || true)"
  [[ "$status" == "healthy" ]]
}

is_db_running() {
  docker inspect --format '{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null | grep -q "true"
}

if is_db_running && is_db_healthy; then
  info "Docker database ('$DB_CONTAINER') is already up and healthy."
else
  if is_db_running; then
    info "Docker database container '$DB_CONTAINER' is running but not yet healthy, waiting..."
  else
    info "Docker database is not running. Starting it with: ${DOCKER_COMPOSE[*]} up -d $DB_SERVICE"
    "${DOCKER_COMPOSE[@]}" up -d "$DB_SERVICE"
  fi

  info "Waiting for '$DB_CONTAINER' to become healthy..."
  ATTEMPTS=0
  MAX_ATTEMPTS=30 # ~60s at 2s intervals
  until is_db_healthy; do
    ATTEMPTS=$((ATTEMPTS + 1))
    if [[ $ATTEMPTS -ge $MAX_ATTEMPTS ]]; then
      error "Database did not become healthy in time. Check with: docker logs $DB_CONTAINER"
      exit 1
    fi
    sleep 2
  done
  info "Docker database is up and healthy."
fi

# ---------------------------------------------------------------------------
# 6. Run the dev server
# ---------------------------------------------------------------------------
info "Starting the app with: npm run dev"
exec npm run dev
