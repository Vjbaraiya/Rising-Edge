-- ============================================================
-- Rising Edge Technologies — Functions & Triggers v2.0
-- ============================================================

-- ── updated_at auto-update function ─────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Apply updated_at trigger to all relevant tables ──────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','user_subscriptions','subscription_plans',
    'payment_orders','payments','refunds',
    'tool_subscriptions','tool_payments',
    'courses','course_modules','lessons',
    'course_enrollments','lesson_progress',
    'certificate_templates','certificate_issues',
    'tools','resources',
    'review_projects','review_results','findings',
    'review_comments','topics','posts',
    'contact_requests','announcements'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at ON %I;
       CREATE TRIGGER trg_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      t, t
    );
  END LOOP;
END;
$$;

-- ── Enroll user in basic plan on registration ────────────────
CREATE OR REPLACE FUNCTION auto_subscribe_basic()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, 'basic', 'ACTIVE')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_subscribe ON users;
CREATE TRIGGER trg_auto_subscribe
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION auto_subscribe_basic();

-- ── Update course modules_count on module insert/delete ──────
CREATE OR REPLACE FUNCTION sync_modules_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE courses SET modules_count = modules_count + 1 WHERE id = NEW.course_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE courses SET modules_count = GREATEST(modules_count - 1, 0) WHERE id = OLD.course_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_modules_count ON course_modules;
CREATE TRIGGER trg_modules_count
  AFTER INSERT OR DELETE ON course_modules
  FOR EACH ROW EXECUTE FUNCTION sync_modules_count();

-- ── Update topic post_count on post insert/delete ────────────
CREATE OR REPLACE FUNCTION sync_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE topics SET
      post_count = post_count + 1,
      last_post_at = NOW()
    WHERE id = NEW.topic_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE topics SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.topic_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_post_count ON posts;
CREATE TRIGGER trg_post_count
  AFTER INSERT OR DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION sync_post_count();

-- ── Audit log helper function ────────────────────────────────
CREATE OR REPLACE FUNCTION log_audit(
  p_user_id    TEXT,
  p_action     TEXT,
  p_entity     TEXT,
  p_entity_id  TEXT,
  p_old        JSONB DEFAULT NULL,
  p_new        JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (p_user_id, p_action, p_entity, p_entity_id, p_old, p_new);
END;
$$ LANGUAGE plpgsql;

-- ── Get user's active plan ────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_plan(p_user_id TEXT)
RETURNS TEXT AS $$
  SELECT COALESCE(us.plan_id, 'basic')
  FROM users u
  LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.status = 'ACTIVE'
  WHERE u.id = p_user_id
  LIMIT 1;
$$ LANGUAGE sql STABLE;
