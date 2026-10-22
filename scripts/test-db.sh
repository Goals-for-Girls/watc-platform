#!/usr/bin/env bash
# Run the database tests on a throwaway PostgreSQL database.
# Usage: PGHOST=... PGPORT=... PGUSER=postgres scripts/test-db.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB="watc_test_$$"
createdb "$DB"
trap 'dropdb --if-exists "$DB"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" \
  -f supabase/tests/00_local_supabase_shim.sql \
  $(for f in supabase/migrations/*.sql; do echo "-f $f"; done) \
  -f supabase/tests/10_access_and_gates_test.sql
