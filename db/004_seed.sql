-- ============================================================
-- Rising Edge Technologies — Seed Data v2.0
-- ============================================================

-- ── Subscription Plans ──────────────────────────────────────
INSERT INTO subscription_plans
  (id, name, price_monthly, price_yearly, description, features, max_courses, badge_color, is_popular, sort_order)
VALUES
  ('basic', 'Basic', 0, 0,
   'Free access to Signal Integrity Academy and community resources.',
   '["Signal Integrity Academy (full access)","Community discussion forum","4 free engineering tools","Public whitepapers & guides","Email support (72 h response)"]'::jsonb,
   1, 'gray', false, 1),

  ('advanced', 'Advanced', 1999, 19990,
   'Unlock PCB Design Mastery + SI Academy with priority support.',
   '["Everything in Basic","PCB Design Mastery (full access)","All engineering tools (unlimited)","Reference design downloads","Priority email support (24 h)","Monthly live Q&A session","Course completion certificate"]'::jsonb,
   2, 'blue', true, 2),

  ('premium', 'Premium', 3999, 39990,
   'All courses, 1-on-1 mentoring, and custom training for teams.',
   '["Everything in Advanced","Embedded Systems & RTOS (full access)","EMC & Compliance (full access)","Unlimited course access (all future courses)","2x monthly 1-on-1 mentoring sessions","Custom team training (up to 5 seats)","Priority Slack support (4 h response)","Early access to new content"]'::jsonb,
   0, 'purple', false, 3)

ON CONFLICT (id) DO UPDATE SET
  name            = EXCLUDED.name,
  price_monthly   = EXCLUDED.price_monthly,
  price_yearly    = EXCLUDED.price_yearly,
  description     = EXCLUDED.description,
  features        = EXCLUDED.features,
  max_courses     = EXCLUDED.max_courses,
  badge_color     = EXCLUDED.badge_color,
  is_popular      = EXCLUDED.is_popular,
  sort_order      = EXCLUDED.sort_order,
  updated_at      = NOW();

-- ── Course Categories ────────────────────────────────────────
INSERT INTO course_categories (id, name, slug, description, sort_order)
VALUES
  ('si',  'Signal Integrity',      'signal-integrity',   'Signal integrity, high-speed design, SI simulation',         1),
  ('hw',  'PCB Design',            'pcb-design',         'PCB layout, routing, DFM, DFT, power delivery',              2),
  ('fw',  'Embedded Systems',      'embedded-systems',   'Bare-metal and RTOS development for embedded systems',        3),
  ('emc', 'EMC & Compliance',      'emc-compliance',     'Emissions, immunity, FCC/CE pre-compliance, shielding',       4),
  ('pi',  'Power Integrity',       'power-integrity',    'PDN design, decoupling, VRM characterisation',               5),
  ('rf',  'RF & Microwave',        'rf-microwave',       'RF circuit design, antenna, matching networks',               6)
ON CONFLICT (id) DO NOTHING;

-- ── Courses ──────────────────────────────────────────────────
INSERT INTO courses
  (id, title, slug, category, description, status, modules_count, href, gradient, badge_color, required_plan, price_inr)
VALUES
  ('si', 'Signal Integrity Academy', 'signal-integrity-academy', 'si',
   'Master SI from fundamentals to advanced simulation. Eye diagrams, impedance, via modelling, DDR/SerDes.',
   'published', 18, 'Trainings/SI/',
   'linear-gradient(135deg,#0f2040,#0e3a5c)', 'cyan', 'basic', 0),

  ('hw', 'PCB Design Mastery', 'pcb-design-mastery', 'hw',
   'High-density multi-layer PCB design from schematic capture to Gerber. DFM, DFT, power delivery.',
   'draft', 0, 'Trainings/trainings.html',
   'linear-gradient(135deg,#1a0a30,#2d1060)', 'blue', 'advanced', 1999),

  ('fw', 'Embedded Systems & RTOS', 'embedded-systems-rtos', 'fw',
   'Bare-metal and RTOS development for industrial embedded systems. FreeRTOS, memory safety, bootloaders.',
   'draft', 0, 'Trainings/trainings.html',
   'linear-gradient(135deg,#012010,#033a1a)', 'green', 'premium', 3999)

ON CONFLICT (id) DO UPDATE SET
  title         = EXCLUDED.title,
  slug          = EXCLUDED.slug,
  description   = EXCLUDED.description,
  status        = EXCLUDED.status,
  modules_count = EXCLUDED.modules_count,
  href          = EXCLUDED.href,
  gradient      = EXCLUDED.gradient,
  badge_color   = EXCLUDED.badge_color,
  required_plan = EXCLUDED.required_plan,
  price_inr     = EXCLUDED.price_inr,
  updated_at    = NOW();

-- ── Plan → Course Access ─────────────────────────────────────
INSERT INTO plan_course_access (plan_id, course_id) VALUES
  ('basic',    'si'),
  ('advanced', 'si'),
  ('advanced', 'hw'),
  ('premium',  'si'),
  ('premium',  'hw'),
  ('premium',  'fw')
ON CONFLICT DO NOTHING;

-- ── System Settings ──────────────────────────────────────────
INSERT INTO system_settings (key, value, description, is_public) VALUES
  ('site_name',           'Rising Edge Technologies',  'Platform display name',            true),
  ('site_tagline',        'Hardware Design Excellence', 'Site tagline',                    true),
  ('support_email',       'support@risingedgetech.com', 'Support email address',           true),
  ('gst_rate',            '18',                         'GST percentage applied to payments', false),
  ('maintenance_mode',    'false',                      'Enable maintenance mode',          false),
  ('registration_open',   'true',                       'Allow new user registrations',     false),
  ('cashfree_env',        'production',                 'Cashfree environment',             false)
ON CONFLICT (key) DO UPDATE SET
  value      = EXCLUDED.value,
  updated_at = NOW();

-- ── Feature Flags ────────────────────────────────────────────
INSERT INTO feature_flags (key, enabled, description) VALUES
  ('hw_review_tools',     true,  'Hardware design review tool suite'),
  ('community_forums',    false, 'Community discussion forums'),
  ('ai_review',           false, 'AI-powered design review'),
  ('certificates',        true,  'Course completion certificates'),
  ('referral_program',    false, 'User referral programme')
ON CONFLICT (key) DO UPDATE SET
  enabled    = EXCLUDED.enabled,
  updated_at = NOW();

-- ── Forum Categories ─────────────────────────────────────────
INSERT INTO forums (name, slug, description, sort_order) VALUES
  ('Signal Integrity',    'signal-integrity',  'Discuss SI concepts, simulations, and tools', 1),
  ('PCB Design',          'pcb-design',        'PCB routing, layout best practices, DFM',     2),
  ('Embedded Systems',    'embedded-systems',  'RTOS, bare-metal, microcontrollers',           3),
  ('EMC & Compliance',    'emc-compliance',    'EMI/EMC testing, pre-compliance, regulations', 4),
  ('General Discussion',  'general',           'Off-topic and community chat',                 5)
ON CONFLICT (slug) DO NOTHING;
