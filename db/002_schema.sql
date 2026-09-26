-- ============================================================
-- Rising Edge Technologies — Complete Database Schema v2.0
-- PostgreSQL 15+ / Neon
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sequence for human-readable invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000;

-- ============================================================
-- SECTION 1: AUTHENTICATION & USERS
-- ============================================================

CREATE TABLE users (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  full_name             TEXT NOT NULL,
  email                 TEXT UNIQUE NOT NULL,
  password_hash         TEXT NOT NULL,
  role                  TEXT NOT NULL DEFAULT 'USER'
                          CHECK (role IN ('USER','INSTRUCTOR','RECRUITER','ADMIN','SUPER_ADMIN')),
  status                TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION'
                          CHECK (status IN ('PENDING_VERIFICATION','ACTIVE','SUSPENDED','DELETED')),
  email_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url            TEXT,
  mobile                TEXT,
  location              TEXT,
  "current_role"        TEXT,
  org                   TEXT,
  job_title             TEXT,
  linkedin_url          TEXT,
  bio                   TEXT,
  website               TEXT,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until          TIMESTAMPTZ,
  last_login_at         TIMESTAMPTZ,
  email_verify_token    TEXT,
  email_verify_expiry   TIMESTAMPTZ,
  password_reset_token  TEXT,
  password_reset_expiry TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT UNIQUE NOT NULL,
  ip_address  TEXT,
  device_info TEXT,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE login_history (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  success    BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 2: SUBSCRIPTION PLANS
-- ============================================================

CREATE TABLE subscription_plans (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  price_monthly  NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly   NUMERIC(10,2) NOT NULL DEFAULT 0,
  description    TEXT,
  features       JSONB NOT NULL DEFAULT '[]',
  max_courses    INT NOT NULL DEFAULT 0,
  badge_color    TEXT NOT NULL DEFAULT 'gray',
  is_popular     BOOLEAN NOT NULL DEFAULT FALSE,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order     INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_subscriptions (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id        TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id        TEXT NOT NULL DEFAULT 'basic' REFERENCES subscription_plans(id),
  status         TEXT NOT NULL DEFAULT 'ACTIVE'
                   CHECK (status IN ('ACTIVE','EXPIRED','CANCELLED','PENDING')),
  billing_cycle  TEXT NOT NULL DEFAULT 'monthly'
                   CHECK (billing_cycle IN ('monthly','yearly','lifetime')),
  start_date     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date       TIMESTAMPTZ,
  cancelled_at   TIMESTAMPTZ,
  cancel_reason  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 3: PAYMENTS
-- ============================================================

CREATE TABLE coupons (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code        TEXT UNIQUE NOT NULL,
  type        TEXT NOT NULL DEFAULT 'percent' CHECK (type IN ('percent','fixed')),
  val         NUMERIC(10,2) NOT NULL DEFAULT 0,
  used        INT NOT NULL DEFAULT 0,
  limit_count INT NOT NULL DEFAULT 100,
  expires     TEXT NOT NULL DEFAULT 'No expiry',
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_orders (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id       TEXT UNIQUE NOT NULL,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id        TEXT REFERENCES subscription_plans(id),
  coupon_id      TEXT REFERENCES coupons(id),
  product_type   TEXT NOT NULL DEFAULT 'subscription'
                   CHECK (product_type IN ('subscription','course','tool','one_time')),
  product_id     TEXT,
  billing_cycle  TEXT NOT NULL DEFAULT 'monthly',
  amount         NUMERIC(10,2) NOT NULL,
  gst_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'INR',
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','paid','failed','refunded','cancelled')),
  gateway        TEXT NOT NULL DEFAULT 'cashfree',
  gateway_order_id TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id         TEXT NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id       TEXT UNIQUE,
  gateway          TEXT NOT NULL DEFAULT 'cashfree',
  amount           NUMERIC(10,2) NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'INR',
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','success','failed','refunded')),
  payment_method   TEXT,
  gateway_response JSONB,
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoices (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  invoice_number TEXT UNIQUE NOT NULL DEFAULT ('INV-' || LPAD(nextval('invoice_number_seq')::text, 6, '0')),
  order_id       TEXT NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount         NUMERIC(10,2) NOT NULL,
  gst_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  total          NUMERIC(10,2) NOT NULL,
  status         TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','void')),
  issued_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refunds (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  payment_id  TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL,
  reason      TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','processed','failed')),
  gateway_ref TEXT,
  processed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Legacy tool payment tables (kept for backward compatibility)
CREATE TABLE tool_subscriptions (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id           TEXT NOT NULL,
  billing_cycle     TEXT NOT NULL DEFAULT 'monthly',
  status            TEXT NOT NULL DEFAULT 'active',
  start_date        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiry_date       TIMESTAMPTZ,
  auto_renew        BOOLEAN NOT NULL DEFAULT TRUE,
  remaining_credits INT NOT NULL DEFAULT 10,
  credits_used      INT NOT NULL DEFAULT 0,
  transaction_id    TEXT,
  payment_id        TEXT,
  cashfree_order_id TEXT,
  amount            NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tool_payments (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id       TEXT UNIQUE NOT NULL,
  payment_id     TEXT,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id        TEXT NOT NULL,
  billing_cycle  TEXT NOT NULL,
  amount         NUMERIC(10,2) NOT NULL,
  gst_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'pending',
  gateway        TEXT NOT NULL DEFAULT 'cashfree',
  invoice_number TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 4: LEARNING PLATFORM
-- ============================================================

CREATE TABLE course_categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE instructors (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  bio         TEXT,
  avatar_url  TEXT,
  linkedin_url TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE courses (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  slug           TEXT UNIQUE,
  category       TEXT NOT NULL,
  category_id    TEXT REFERENCES course_categories(id),
  instructor_id  TEXT REFERENCES instructors(id),
  description    TEXT,
  short_desc     TEXT,
  thumbnail_url  TEXT,
  trailer_url    TEXT,
  status         TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','published','archived')),
  modules_count  INT NOT NULL DEFAULT 0,
  total_duration INT NOT NULL DEFAULT 0,
  href           TEXT,
  gradient       TEXT,
  badge_color    TEXT,
  required_plan  TEXT NOT NULL DEFAULT 'basic',
  price_inr      NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE plan_course_access (
  plan_id    TEXT NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  course_id  TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  PRIMARY KEY (plan_id, course_id)
);

-- NOTE: per-training likes/feedback (training_likes, training_feedback) are
-- self-migrated at server boot in server.js (see "Training likes & feedback"
-- block), matching this codebase's existing convention for that feature —
-- no table added here to avoid a second, conflicting definition.

CREATE TABLE course_modules (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  course_id    TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  sort_order   INT NOT NULL DEFAULT 0,
  duration     INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lessons (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  module_id    TEXT NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  course_id    TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'video' CHECK (type IN ('video','article','quiz','live')),
  content_url  TEXT,
  duration     INT NOT NULL DEFAULT 0,
  is_preview   BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE course_enrollments (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id        TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','completed','dropped')),
  progress         INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  last_accessed_at TIMESTAMPTZ,
  enrolled_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);

CREATE TABLE lesson_progress (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id    TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id    TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  completed    BOOLEAN NOT NULL DEFAULT FALSE,
  watch_time   INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

CREATE TABLE bookmarks (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id  TEXT REFERENCES lessons(id) ON DELETE CASCADE,
  course_id  TEXT REFERENCES courses(id) ON DELETE CASCADE,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- ============================================================
-- SECTION 5: CERTIFICATES
-- ============================================================

CREATE TABLE certificate_templates (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  course_id    TEXT REFERENCES courses(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  template_url TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE certificate_issues (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id     TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  template_id   TEXT REFERENCES certificate_templates(id),
  cert_number   TEXT UNIQUE NOT NULL DEFAULT ('CERT-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8))),
  issued_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  revoked       BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at    TIMESTAMPTZ,
  revoke_reason TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 6: ENGINEERING TOOLS & RESOURCES
-- ============================================================

CREATE TABLE tools (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'calculator',
  plan        TEXT NOT NULL DEFAULT 'basic',
  description TEXT,
  url         TEXT NOT NULL DEFAULT '#',
  icon        TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','beta')),
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE resources (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'guide'
                CHECK (type IN ('guide','whitepaper','design','case-study','myth-buster','template','video','dataset','other')),
  plan        TEXT NOT NULL DEFAULT 'basic',
  description TEXT,
  url         TEXT NOT NULL DEFAULT '#',
  file_size   TEXT,
  downloads   INT NOT NULL DEFAULT 0,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tool_usage (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  tool_id    TEXT REFERENCES tools(id) ON DELETE SET NULL,
  session_id TEXT,
  duration   INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 7: HARDWARE DESIGN REVIEW
-- ============================================================

CREATE TABLE review_projects (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  project_type TEXT NOT NULL DEFAULT 'pcb'
                 CHECK (project_type IN ('pcb','schematic','full_design','emc','thermal','si','pi')),
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','in_review','completed','archived')),
  priority    TEXT NOT NULL DEFAULT 'normal'
                CHECK (priority IN ('low','normal','high','urgent')),
  due_date    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE schematics (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id  TEXT NOT NULL REFERENCES review_projects(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  file_size   BIGINT,
  version     INT NOT NULL DEFAULT 1,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pcb_layouts (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id  TEXT NOT NULL REFERENCES review_projects(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  file_size   BIGINT,
  layer_count INT NOT NULL DEFAULT 2,
  version     INT NOT NULL DEFAULT 1,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE review_results (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id     TEXT NOT NULL REFERENCES review_projects(id) ON DELETE CASCADE,
  review_type    TEXT NOT NULL
                   CHECK (review_type IN ('schematic','pcb','emi','thermal','si','pi','dfx','safety','reliability')),
  reviewer_id    TEXT REFERENCES users(id),
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','in_progress','completed','needs_revision')),
  overall_score  INT CHECK (overall_score >= 0 AND overall_score <= 100),
  summary        TEXT,
  report_url     TEXT,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE findings (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  review_id    TEXT NOT NULL REFERENCES review_results(id) ON DELETE CASCADE,
  project_id   TEXT NOT NULL REFERENCES review_projects(id) ON DELETE CASCADE,
  severity     TEXT NOT NULL DEFAULT 'warning'
                 CHECK (severity IN ('critical','major','warning','info')),
  category     TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  location     TEXT,
  status       TEXT NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open','acknowledged','resolved','wont_fix')),
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recommendations (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  finding_id  TEXT REFERENCES findings(id) ON DELETE CASCADE,
  review_id   TEXT NOT NULL REFERENCES review_results(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  reference   TEXT,
  priority    TEXT NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low','medium','high')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE review_comments (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id  TEXT NOT NULL REFERENCES review_projects(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  finding_id  TEXT REFERENCES findings(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 8: COMMUNITY / FORUMS
-- ============================================================

CREATE TABLE forums (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE topics (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  forum_id   TEXT NOT NULL REFERENCES forums(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  is_pinned  BOOLEAN NOT NULL DEFAULT FALSE,
  is_locked  BOOLEAN NOT NULL DEFAULT FALSE,
  views      INT NOT NULL DEFAULT 0,
  post_count INT NOT NULL DEFAULT 0,
  last_post_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE posts (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  topic_id   TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  is_answer  BOOLEAN NOT NULL DEFAULT FALSE,
  likes      INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 9: NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT,
  data       JSONB,
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE email_queue (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  to_email     TEXT NOT NULL,
  to_name      TEXT,
  subject      TEXT NOT NULL,
  body_html    TEXT NOT NULL,
  body_text    TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','sent','failed','cancelled')),
  attempts     INT NOT NULL DEFAULT 0,
  last_attempt TIMESTAMPTZ,
  sent_at      TIMESTAMPTZ,
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 10: ADMIN & AUDIT
-- ============================================================

CREATE TABLE audit_logs (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE system_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  description TEXT,
  is_public   BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE announcements (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info'
                CHECK (type IN ('info','warning','success','critical')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  created_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE feature_flags (
  key         TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 11: CONTACT / CRM
-- ============================================================

CREATE TABLE contact_requests (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  company    TEXT,
  subject    TEXT,
  message    TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'general'
               CHECK (type IN ('general','support','sales','partnership','consultancy')),
  status     TEXT NOT NULL DEFAULT 'new'
               CHECK (status IN ('new','in_progress','resolved','spam')),
  assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE newsletter_subscribers (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','unsubscribed','bounced')),
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);

-- ============================================================
-- SECTION 12: FILE STORAGE
-- ============================================================

CREATE TABLE uploaded_files (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
  filename     TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type    TEXT,
  file_size    BIGINT,
  storage_path TEXT NOT NULL,
  public_url   TEXT,
  entity_type  TEXT,
  entity_id    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 13: ANALYTICS
-- ============================================================

CREATE TABLE page_views (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,
  path       TEXT NOT NULL,
  referrer   TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
