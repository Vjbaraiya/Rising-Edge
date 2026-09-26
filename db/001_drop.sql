-- ============================================================
-- Rising Edge Technologies — DROP ALL APPLICATION TABLES
-- Run this ONLY after verifying your backup.
-- Backup command (run locally before executing this file):
--   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M).sql
-- ============================================================

-- Drop in reverse dependency order (CASCADE handles remaining FKs)

DROP TABLE IF EXISTS ai_responses              CASCADE;
DROP TABLE IF EXISTS ai_prompts               CASCADE;
DROP TABLE IF EXISTS ai_conversations         CASCADE;
DROP TABLE IF EXISTS embeddings               CASCADE;

DROP TABLE IF EXISTS push_notifications       CASCADE;
DROP TABLE IF EXISTS sms_queue                CASCADE;
DROP TABLE IF EXISTS email_queue              CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notifications            CASCADE;

DROP TABLE IF EXISTS page_views               CASCADE;
DROP TABLE IF EXISTS tool_usage               CASCADE;
DROP TABLE IF EXISTS course_statistics        CASCADE;
DROP TABLE IF EXISTS user_statistics          CASCADE;
DROP TABLE IF EXISTS payment_statistics       CASCADE;

DROP TABLE IF EXISTS audit_logs               CASCADE;
DROP TABLE IF EXISTS activity_logs            CASCADE;
DROP TABLE IF EXISTS system_settings          CASCADE;
DROP TABLE IF EXISTS feature_flags            CASCADE;
DROP TABLE IF EXISTS announcements            CASCADE;

DROP TABLE IF EXISTS newsletter_subscribers   CASCADE;
DROP TABLE IF EXISTS contact_requests         CASCADE;
DROP TABLE IF EXISTS leads                    CASCADE;

DROP TABLE IF EXISTS uploaded_files           CASCADE;
DROP TABLE IF EXISTS file_versions            CASCADE;

DROP TABLE IF EXISTS resource_categories      CASCADE;
DROP TABLE IF EXISTS documents                CASCADE;

DROP TABLE IF EXISTS posts                    CASCADE;
DROP TABLE IF EXISTS topics                   CASCADE;
DROP TABLE IF EXISTS forums                   CASCADE;

DROP TABLE IF EXISTS consultancy_reports      CASCADE;
DROP TABLE IF EXISTS meetings                 CASCADE;
DROP TABLE IF EXISTS deliverables             CASCADE;
DROP TABLE IF EXISTS milestones               CASCADE;
DROP TABLE IF EXISTS consultancy_projects     CASCADE;

DROP TABLE IF EXISTS review_comments          CASCADE;
DROP TABLE IF EXISTS review_history           CASCADE;
DROP TABLE IF EXISTS recommendations          CASCADE;
DROP TABLE IF EXISTS findings                 CASCADE;
DROP TABLE IF EXISTS signal_integrity_reviews CASCADE;
DROP TABLE IF EXISTS power_integrity_reviews  CASCADE;
DROP TABLE IF EXISTS thermal_reviews          CASCADE;
DROP TABLE IF EXISTS emi_reviews              CASCADE;
DROP TABLE IF EXISTS pcb_reviews              CASCADE;
DROP TABLE IF EXISTS schematic_reviews        CASCADE;
DROP TABLE IF EXISTS dfx_reviews              CASCADE;
DROP TABLE IF EXISTS safety_reviews           CASCADE;
DROP TABLE IF EXISTS reliability_reviews      CASCADE;
DROP TABLE IF EXISTS simulations              CASCADE;
DROP TABLE IF EXISTS stackups                 CASCADE;
DROP TABLE IF EXISTS gerbers                  CASCADE;
DROP TABLE IF EXISTS pcb_layouts              CASCADE;
DROP TABLE IF EXISTS schematics               CASCADE;
DROP TABLE IF EXISTS review_projects          CASCADE;

DROP TABLE IF EXISTS certificate_logs         CASCADE;
DROP TABLE IF EXISTS certificate_issues       CASCADE;
DROP TABLE IF EXISTS certificate_templates    CASCADE;

DROP TABLE IF EXISTS quiz_results             CASCADE;
DROP TABLE IF EXISTS quiz_attempts            CASCADE;
DROP TABLE IF EXISTS options                  CASCADE;
DROP TABLE IF EXISTS quiz_questions           CASCADE;
DROP TABLE IF EXISTS quizzes                  CASCADE;

DROP TABLE IF EXISTS lesson_progress          CASCADE;
DROP TABLE IF EXISTS completed_lessons        CASCADE;
DROP TABLE IF EXISTS learning_history         CASCADE;
DROP TABLE IF EXISTS bookmarks                CASCADE;
DROP TABLE IF EXISTS course_enrollments       CASCADE;

DROP TABLE IF EXISTS lesson_resources         CASCADE;
DROP TABLE IF EXISTS lesson_pages             CASCADE;
DROP TABLE IF EXISTS lessons                  CASCADE;
DROP TABLE IF EXISTS modules                  CASCADE;
DROP TABLE IF EXISTS course_modules           CASCADE;

DROP TABLE IF EXISTS plan_course_access       CASCADE;
DROP TABLE IF EXISTS learning_paths           CASCADE;
DROP TABLE IF EXISTS tags                     CASCADE;
DROP TABLE IF EXISTS course_categories        CASCADE;
DROP TABLE IF EXISTS courses                  CASCADE;
DROP TABLE IF EXISTS instructors              CASCADE;

DROP TABLE IF EXISTS resources                CASCADE;
DROP TABLE IF EXISTS tools                    CASCADE;
DROP TABLE IF EXISTS tool_usage_log           CASCADE;
DROP TABLE IF EXISTS tool_payments            CASCADE;
DROP TABLE IF EXISTS tool_subscriptions       CASCADE;

DROP TABLE IF EXISTS coupons                  CASCADE;
DROP TABLE IF EXISTS payment_logs             CASCADE;
DROP TABLE IF EXISTS refunds                  CASCADE;
DROP TABLE IF EXISTS invoices                 CASCADE;
DROP TABLE IF EXISTS payments                 CASCADE;
DROP TABLE IF EXISTS payment_orders           CASCADE;
DROP TABLE IF EXISTS user_subscriptions       CASCADE;
DROP TABLE IF EXISTS subscription_plans       CASCADE;

DROP TABLE IF EXISTS invitations              CASCADE;
DROP TABLE IF EXISTS teams                    CASCADE;
DROP TABLE IF EXISTS departments              CASCADE;
DROP TABLE IF EXISTS companies                CASCADE;

DROP TABLE IF EXISTS social_links             CASCADE;
DROP TABLE IF EXISTS profile_images           CASCADE;
DROP TABLE IF EXISTS preferences              CASCADE;
DROP TABLE IF EXISTS addresses                CASCADE;
DROP TABLE IF EXISTS profiles                 CASCADE;

DROP TABLE IF EXISTS login_history            CASCADE;
DROP TABLE IF EXISTS password_reset_tokens    CASCADE;
DROP TABLE IF EXISTS email_verifications      CASCADE;
DROP TABLE IF EXISTS refresh_tokens           CASCADE;
DROP TABLE IF EXISTS role_permissions         CASCADE;
DROP TABLE IF EXISTS user_roles               CASCADE;
DROP TABLE IF EXISTS permissions              CASCADE;
DROP TABLE IF EXISTS roles                    CASCADE;
DROP TABLE IF EXISTS users                    CASCADE;

-- Drop sequences if any
DROP SEQUENCE IF EXISTS invoice_number_seq CASCADE;

-- Verify nothing left
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
