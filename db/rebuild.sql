-- ============================================================
-- Rising Edge Technologies — MASTER REBUILD SCRIPT v2.0
-- ============================================================
-- STOP. Before running this script:
--   1. Create a backup:
--      pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M).sql
--   2. Verify the backup file is non-empty.
--   3. Only then run:
--      psql $DATABASE_URL < db/rebuild.sql
-- ============================================================

\echo '=== STEP 1: Dropping existing tables ==='
\i db/001_drop.sql

\echo '=== STEP 2: Creating new schema ==='
\i db/002_schema.sql

\echo '=== STEP 3: Creating indexes ==='
\i db/003_indexes.sql

\echo '=== STEP 4: Inserting seed data ==='
\i db/004_seed.sql

\echo '=== STEP 5: Creating functions and triggers ==='
\i db/005_functions_triggers.sql

\echo '=== STEP 6: Validating rebuild ==='
\i db/006_validate.sql

\echo '=== REBUILD COMPLETE ==='
