-- ============================================================
-- Rising Edge Technologies — Migration
-- NOTE: this file was originally drafted for a `course_likes` table that
-- was superseded by the existing `training_likes` / `training_feedback`
-- system (self-migrated at server boot in server.js — see the "Training
-- likes & feedback" block there). No new table is needed for likes.
--
-- The only thing actually still needed for the trainings.html
-- views/visitors feature is an index on page_views.path, used by
-- GET /api/trainings/views. server.js also creates this automatically at
-- boot (CREATE INDEX IF NOT EXISTS), so running this file is optional —
-- it's here only for environments that apply db/*.sql by hand instead of
-- just starting the server.
--
-- Safe to run against a live database (idempotent):
--   psql $DATABASE_URL < db/007_course_likes.sql
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);
