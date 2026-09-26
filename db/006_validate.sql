-- ============================================================
-- Rising Edge Technologies — Validation Script v2.0
-- Run after rebuild to verify schema integrity.
-- ============================================================

-- 1. List all application tables
SELECT
  tablename AS "Table",
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS "Size"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Verify expected core tables exist
SELECT
  t.name AS "Expected Table",
  CASE WHEN p.tablename IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END AS "Status"
FROM (VALUES
  ('users'),('refresh_tokens'),('login_history'),
  ('subscription_plans'),('user_subscriptions'),
  ('payment_orders'),('payments'),('invoices'),('refunds'),('coupons'),
  ('tool_subscriptions'),('tool_payments'),
  ('courses'),('course_categories'),('course_modules'),('lessons'),
  ('course_enrollments'),('lesson_progress'),('bookmarks'),
  ('certificate_templates'),('certificate_issues'),
  ('tools'),('resources'),('tool_usage'),
  ('review_projects'),('schematics'),('pcb_layouts'),
  ('review_results'),('findings'),('recommendations'),('review_comments'),
  ('forums'),('topics'),('posts'),
  ('notifications'),('email_queue'),
  ('audit_logs'),('system_settings'),('announcements'),('feature_flags'),
  ('contact_requests'),('newsletter_subscribers'),
  ('uploaded_files'),('page_views')
) AS t(name)
LEFT JOIN pg_tables p ON p.tablename = t.name AND p.schemaname = 'public'
ORDER BY "Status" DESC, t.name;

-- 3. Foreign key integrity check
SELECT
  conname AS "Constraint",
  conrelid::regclass AS "Table",
  confrelid::regclass AS "References"
FROM pg_constraint
WHERE contype = 'f' AND connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text;

-- 4. Verify indexes
SELECT
  indexname AS "Index",
  tablename AS "Table"
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 5. Verify seed data
SELECT 'subscription_plans' AS "Table", COUNT(*)::text AS "Rows" FROM subscription_plans
UNION ALL SELECT 'courses',          COUNT(*)::text FROM courses
UNION ALL SELECT 'course_categories', COUNT(*)::text FROM course_categories
UNION ALL SELECT 'system_settings',  COUNT(*)::text FROM system_settings
UNION ALL SELECT 'feature_flags',    COUNT(*)::text FROM feature_flags
UNION ALL SELECT 'forums',           COUNT(*)::text FROM forums
UNION ALL SELECT 'plan_course_access', COUNT(*)::text FROM plan_course_access;

-- 6. Check for orphaned enrollments
SELECT COUNT(*) AS "Orphaned Enrollments (should be 0)"
FROM course_enrollments ce
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ce.user_id)
   OR NOT EXISTS (SELECT 1 FROM courses c WHERE c.id = ce.course_id);

-- 7. Trigger list
SELECT trigger_name, event_object_table, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 8. Functions list
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
