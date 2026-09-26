-- ============================================================
-- Rising Edge Technologies — Indexes v2.0
-- ============================================================

-- Users
CREATE INDEX idx_users_email          ON users(email);
CREATE INDEX idx_users_status         ON users(status);
CREATE INDEX idx_users_role           ON users(role);
CREATE INDEX idx_users_created_at     ON users(created_at DESC);

-- Auth
CREATE INDEX idx_refresh_token_hash   ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_user         ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_expires      ON refresh_tokens(expires_at);
CREATE INDEX idx_login_history_user   ON login_history(user_id);
CREATE INDEX idx_login_history_time   ON login_history(created_at DESC);

-- Subscriptions
CREATE INDEX idx_usub_user            ON user_subscriptions(user_id);
CREATE INDEX idx_usub_plan            ON user_subscriptions(plan_id);
CREATE INDEX idx_usub_status          ON user_subscriptions(status);

-- Payments
CREATE INDEX idx_orders_user          ON payment_orders(user_id);
CREATE INDEX idx_orders_status        ON payment_orders(status);
CREATE INDEX idx_orders_gateway       ON payment_orders(gateway_order_id);
CREATE INDEX idx_payments_order       ON payments(order_id);
CREATE INDEX idx_payments_user        ON payments(user_id);
CREATE INDEX idx_payments_payment_id  ON payments(payment_id);
CREATE INDEX idx_invoices_user        ON invoices(user_id);
CREATE INDEX idx_invoices_order       ON invoices(order_id);
CREATE UNIQUE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_tool_sub_user        ON tool_subscriptions(user_id);
CREATE INDEX idx_tool_sub_status      ON tool_subscriptions(status);
CREATE INDEX idx_tool_pay_order       ON tool_payments(order_id);
CREATE INDEX idx_tool_pay_user        ON tool_payments(user_id);

-- Courses
CREATE INDEX idx_courses_status       ON courses(status);
CREATE INDEX idx_courses_category     ON courses(category);
CREATE INDEX idx_courses_plan         ON courses(required_plan);
CREATE UNIQUE INDEX idx_courses_slug  ON courses(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_page_views_path      ON page_views(path);
CREATE INDEX idx_modules_course       ON course_modules(course_id);
CREATE INDEX idx_lessons_module       ON lessons(module_id);
CREATE INDEX idx_lessons_course       ON lessons(course_id);

-- Enrollments & Progress
CREATE INDEX idx_enroll_user          ON course_enrollments(user_id);
CREATE INDEX idx_enroll_course        ON course_enrollments(course_id);
CREATE INDEX idx_enroll_status        ON course_enrollments(status);
CREATE INDEX idx_lesson_prog_user     ON lesson_progress(user_id);
CREATE INDEX idx_lesson_prog_course   ON lesson_progress(course_id);

-- Certificates
CREATE INDEX idx_certs_user           ON certificate_issues(user_id);
CREATE INDEX idx_certs_course         ON certificate_issues(course_id);
CREATE UNIQUE INDEX idx_certs_number  ON certificate_issues(cert_number);

-- Tools & Resources
CREATE INDEX idx_tools_status         ON tools(status);
CREATE INDEX idx_tools_plan           ON tools(plan);
CREATE INDEX idx_resources_plan       ON resources(plan);
CREATE INDEX idx_tool_usage_user      ON tool_usage(user_id);
CREATE INDEX idx_tool_usage_tool      ON tool_usage(tool_id);

-- Hardware Review
CREATE INDEX idx_review_proj_user     ON review_projects(user_id);
CREATE INDEX idx_review_proj_status   ON review_projects(status);
CREATE INDEX idx_findings_review      ON findings(review_id);
CREATE INDEX idx_findings_severity    ON findings(severity);
CREATE INDEX idx_findings_status      ON findings(status);

-- Community
CREATE INDEX idx_topics_forum         ON topics(forum_id);
CREATE INDEX idx_topics_user          ON topics(user_id);
CREATE INDEX idx_posts_topic          ON posts(topic_id);
CREATE INDEX idx_posts_user           ON posts(user_id);

-- Notifications
CREATE INDEX idx_notif_user           ON notifications(user_id);
CREATE INDEX idx_notif_read           ON notifications(user_id, read);
CREATE INDEX idx_email_queue_status   ON email_queue(status);

-- Audit & Admin
CREATE INDEX idx_audit_user           ON audit_logs(user_id);
CREATE INDEX idx_audit_entity         ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created        ON audit_logs(created_at DESC);

-- Contact
CREATE INDEX idx_contact_status       ON contact_requests(status);
CREATE INDEX idx_contact_email        ON contact_requests(email);

-- Analytics
CREATE INDEX idx_page_views_path      ON page_views(path);
CREATE INDEX idx_page_views_user      ON page_views(user_id);
CREATE INDEX idx_page_views_time      ON page_views(created_at DESC);

-- Coupons
CREATE UNIQUE INDEX idx_coupons_code  ON coupons(code);
