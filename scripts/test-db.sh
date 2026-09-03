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

# Migrations are globbed rather than listed, so a new one is exercised here the
# moment it is added — a hardcoded list silently stops testing the newest file.
shopt -s nullglob
MIGRATIONS=("$ROOT"/supabase/migrations/*.sql)

echo "==> 00_local_harness.sql"
psql "$TEST_URL" -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/tests/00_local_harness.sql"

for f in "${MIGRATIONS[@]}"; do
  echo "==> $(basename "$f")"
  psql "$TEST_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done

# Apply every migration a SECOND time. These get pasted into the Supabase SQL
# editor by hand, which tracks nothing, so re-running one is a matter of when —
# and "column already exists" mid-way through leaves a half-applied schema.
# Every migration must be idempotent, and this is what proves it.
for f in "${MIGRATIONS[@]}"; do
  echo "==> $(basename "$f") (re-run)"
  psql "$TEST_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done

for f in "$ROOT/supabase/tests/01_rls_test.sql" "$ROOT/supabase/tests/02_constraint_test.sql"; do
  echo "==> $(basename "$f")"
  psql "$TEST_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done

echo "==> all database tests passed (migrations applied twice)"
