#!/usr/bin/env bash
# Applies the schema to a scratch database and runs the RLS + duration tests.
#
#   ./scripts/test-db.sh                      # uses a local postgres
#   DATABASE_URL=postgres://... ./scripts/test-db.sh
#
# Point this at a throwaway database, never at your real Supabase project —
# it drops and recreates the target database.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ADMIN_URL="${DATABASE_URL:-postgresql://postgres@localhost/postgres}"
TEST_DB="${TEST_DB:-cashout_test}"

# Swap the database name on the connection string for the scratch DB.
TEST_URL="$(printf '%s' "$ADMIN_URL" | sed -E "s#(://[^/]*)/[^?]*#\1/${TEST_DB}#")"

echo "==> recreating ${TEST_DB}"
psql "$ADMIN_URL" -qc "drop database if exists ${TEST_DB};" -c "create database ${TEST_DB};" >/dev/null

for f in \
  "$ROOT/supabase/tests/00_local_harness.sql" \
  "$ROOT/supabase/migrations/0001_initial_schema.sql" \
  "$ROOT/supabase/tests/01_rls_test.sql"
do
  echo "==> $(basename "$f")"
  psql "$TEST_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done

echo "==> all database tests passed"
