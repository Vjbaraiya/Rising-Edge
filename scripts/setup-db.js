/**
 * Rising Edge — Database Setup & Seed Script
 * Run once: node scripts/setup-db.js
 *
 * Creates tables:
 *   subscription_plans · courses · plan_course_access · course_enrollments
 *
 * Seeds:
 *   - 3 subscription plans (Basic / Advanced / Premium)
 *   - 4 courses (SI Academy, PCB Design, Embedded & RTOS, EMC)
 *   - Plan → course access rules
 */

'use strict';

require('dotenv').config();
const { Pool } = require('pg');

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ─────────────────────────────────────────────────────────
// 1. Schema
// ─────────────────────────────────────────────────────────

async function createTables() {
  await db.query(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    -- ── Core auth tables (idempotent) ──────────────────────
    CREATE TABLE IF NOT EXISTS users (
      id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      full_name             TEXT NOT NULL,
      email                 TEXT UNIQUE NOT NULL,
      password_hash         TEXT NOT NULL,
      role                  TEXT NOT NULL DEFAULT 'USER',
      status                TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
      email_verified        BOOLEAN NOT NULL DEFAULT FALSE,
      email_verify_token    TEXT,
      email_verify_expiry   TIMESTAMPTZ,
      password_reset_token  TEXT,
      password_reset_expiry TIMESTAMPTZ,
      avatar_url            TEXT,
      failed_login_attempts INT NOT NULL DEFAULT 0,
      locked_until          TIMESTAMPTZ,
      last_login_at         TIMESTAMPTZ,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash  TEXT UNIQUE NOT NULL,
      ip_address  TEXT,
      device_info TEXT,
      expires_at  TIMESTAMPTZ NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS login_history (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ip_address TEXT,
      user_agent TEXT,
      success    BOOLEAN NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ── Subscription plans ─────────────────────────────────
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      price_monthly   NUMERIC(10,2) NOT NULL DEFAULT 0,
      price_yearly    NUMERIC(10,2) NOT NULL DEFAULT 0,
      description     TEXT,
      features        JSONB NOT NULL DEFAULT '[]',
      max_courses     INT NOT NULL DEFAULT 0,
      badge_color     TEXT NOT NULL DEFAULT 'gray',
      is_popular      BOOLEAN NOT NULL DEFAULT FALSE,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ── User subscriptions ─────────────────────────────────
    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id    TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id    TEXT NOT NULL DEFAULT 'basic' REFERENCES subscription_plans(id),
      status     TEXT NOT NULL DEFAULT 'ACTIVE',
      start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      end_date   TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ── Courses ────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS courses (
      id             TEXT PRIMARY KEY,
      title          TEXT NOT NULL,
      category       TEXT NOT NULL,
      description    TEXT,
      status         TEXT NOT NULL DEFAULT 'draft',
      modules_count  INT NOT NULL DEFAULT 0,
      href           TEXT,
      gradient       TEXT,
      badge_color    TEXT,
      required_plan  TEXT NOT NULL DEFAULT 'basic' REFERENCES subscription_plans(id),
      price_inr      NUMERIC(10,2) NOT NULL DEFAULT 0,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ── Plan → course access ───────────────────────────────
    CREATE TABLE IF NOT EXISTS plan_course_access (
      plan_id   TEXT NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      PRIMARY KEY (plan_id, course_id)
    );

    -- ── User course enrollments ────────────────────────────
    CREATE TABLE IF NOT EXISTS course_enrollments (
      id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id    TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      status       TEXT NOT NULL DEFAULT 'active',
      progress     INT NOT NULL DEFAULT 0,
      enrolled_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      UNIQUE(user_id, course_id)
    );

    -- ── Indexes ────────────────────────────────────────────
    CREATE INDEX IF NOT EXISTS idx_users_email         ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_status        ON users(status);
    CREATE INDEX IF NOT EXISTS idx_refresh_token_hash  ON refresh_tokens(token_hash);
    CREATE INDEX IF NOT EXISTS idx_refresh_user        ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_user    ON course_enrollments(user_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_course  ON course_enrollments(course_id);
    CREATE INDEX IF NOT EXISTS idx_usub_user           ON user_subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_usub_plan           ON user_subscriptions(plan_id);
  `);

  console.log('✅  Tables created (idempotent)');
}

// ─────────────────────────────────────────────────────────
// 2. Seed: Subscription Plans
// ─────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price_monthly: 0,
    price_yearly: 0,
    description: 'Free access to the Signal Integrity Academy and community resources.',
    badge_color: 'gray',
    is_popular: false,
    max_courses: 1,
    features: JSON.stringify([
      'Signal Integrity Academy (full access)',
      'Community discussion forum',
      '4 free engineering tools',
      'Public whitepapers & guides',
      'Email support (72 h response)',
    ]),
  },
  {
    id: 'advanced',
    name: 'Advanced',
    price_monthly: 1999,
    price_yearly: 19990,
    description: 'Unlock PCB Design Mastery + SI Academy with priority support.',
    badge_color: 'blue',
    is_popular: true,
    max_courses: 2,
    features: JSON.stringify([
      'Everything in Basic',
      'PCB Design Mastery (full access)',
      'All engineering tools (unlimited)',
      'Reference design downloads',
      'Priority email support (24 h)',
      'Monthly live Q&A session',
      'Course completion certificate',
    ]),
  },
  {
    id: 'premium',
    name: 'Premium',
    price_monthly: 3999,
    price_yearly: 39990,
    description: 'All courses, 1-on-1 mentoring, and custom training for teams.',
    badge_color: 'purple',
    is_popular: false,
    max_courses: 0,
    features: JSON.stringify([
      'Everything in Advanced',
      'Embedded Systems & RTOS (full access)',
      'EMC & Compliance (full access)',
      'Unlimited course access (all future courses)',
      '2× monthly 1-on-1 mentoring sessions',
      'Custom team training (up to 5 seats)',
      'Slack community (private channel)',
      'Priority Slack support (4 h response)',
      'Early access to new content',
    ]),
  },
];

async function seedPlans() {
  for (const p of PLANS) {
    await db.query(
      `INSERT INTO subscription_plans
         (id, name, price_monthly, price_yearly, description, features, max_courses, badge_color, is_popular)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
         name=EXCLUDED.name,
         price_monthly=EXCLUDED.price_monthly,
         price_yearly=EXCLUDED.price_yearly,
         description=EXCLUDED.description,
         features=EXCLUDED.features,
         max_courses=EXCLUDED.max_courses,
         badge_color=EXCLUDED.badge_color,
         is_popular=EXCLUDED.is_popular`,
      [
        p.id,
        p.name,
        p.price_monthly,
        p.price_yearly,
        p.description,
        p.features,
        p.max_courses,
        p.badge_color,
        p.is_popular,
      ]
    );
  }
  console.log('✅  Subscription plans seeded (basic / advanced / premium)');
}

// ─────────────────────────────────────────────────────────
// 3. Seed: Courses
// ─────────────────────────────────────────────────────────

const COURSES = [
  {
    id: 'si',
    title: 'Signal Integrity Academy',
    category: 'si',
    description:
      'Master SI from fundamentals to advanced simulation techniques. Covers eye diagrams, impedance, via modelling, and DDR/SerDes analysis.',
    status: 'published',
    modules_count: 18,
    href: 'Trainings/SI/',
    gradient: 'linear-gradient(135deg,#0f2040,#0e3a5c)',
    badge_color: 'cyan',
    required_plan: 'basic',
    price_inr: 0,
  },
  {
    id: 'hw',
    title: 'PCB Design Mastery',
    category: 'hw',
    description:
      'High-density multi-layer PCB design from schematic capture to Gerber release. DFM, DFT, power delivery, and thermal management.',
    status: 'draft',
    modules_count: 0,
    href: 'Trainings/trainings.html',
    gradient: 'linear-gradient(135deg,#1a0a30,#2d1060)',
    badge_color: 'blue',
    required_plan: 'advanced',
    price_inr: 1999,
  },
  {
    id: 'fw',
    title: 'Embedded Systems & RTOS',
    category: 'fw',
    description:
      'Bare-metal and RTOS development for industrial embedded systems. Covers FreeRTOS, task scheduling, memory safety, and bootloaders.',
    status: 'draft',
    modules_count: 0,
    href: 'Trainings/trainings.html',
    gradient: 'linear-gradient(135deg,#012010,#033a1a)',
    badge_color: 'green',
    required_plan: 'premium',
    price_inr: 3999,
  },
];

async function seedCourses() {
  for (const c of COURSES) {
    await db.query(
      `INSERT INTO courses
         (id, title, category, description, status, modules_count,
          href, gradient, badge_color, required_plan, price_inr)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         title=EXCLUDED.title,
         category=EXCLUDED.category,
         description=EXCLUDED.description,
         status=EXCLUDED.status,
         modules_count=EXCLUDED.modules_count,
         href=EXCLUDED.href,
         gradient=EXCLUDED.gradient,
         badge_color=EXCLUDED.badge_color,
         required_plan=EXCLUDED.required_plan,
         price_inr=EXCLUDED.price_inr,
         updated_at=NOW()`,
      [
        c.id,
        c.title,
        c.category,
        c.description,
        c.status,
        c.modules_count,
        c.href,
        c.gradient,
        c.badge_color,
        c.required_plan,
        c.price_inr,
      ]
    );
  }
  console.log('✅  Courses seeded (si / hw / fw / emc)');
}

// ─────────────────────────────────────────────────────────
// 4. Seed: Plan → Course Access
// ─────────────────────────────────────────────────────────

const PLAN_ACCESS = [
  // Basic: SI Academy only
  { plan_id: 'basic', course_id: 'si' },
  // Advanced: SI + PCB Design
  { plan_id: 'advanced', course_id: 'si' },
  { plan_id: 'advanced', course_id: 'hw' },
  // Premium: all courses
  { plan_id: 'premium', course_id: 'si' },
  { plan_id: 'premium', course_id: 'hw' },
  { plan_id: 'premium', course_id: 'fw' },
];

async function seedPlanAccess() {
  for (const a of PLAN_ACCESS) {
    await db.query(
      `INSERT INTO plan_course_access (plan_id, course_id)
       VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [a.plan_id, a.course_id]
    );
  }
  console.log('✅  Plan → course access rules seeded');
}

// ─────────────────────────────────────────────────────────
// 5. Migrate: existing user_subscriptions (old plan TEXT → plan_id FK)
// ─────────────────────────────────────────────────────────

async function migrateExistingSubscriptions() {
  // Add plan_id column if the old table only had plan TEXT
  await db
    .query(
      `
    ALTER TABLE user_subscriptions
      ADD COLUMN IF NOT EXISTS plan_id TEXT REFERENCES subscription_plans(id);
  `
    )
    .catch(() => {});

  // Sync plan_id from old plan column where possible
  await db
    .query(
      `
    UPDATE user_subscriptions
       SET plan_id = LOWER(COALESCE(plan_id, plan, 'basic'))
     WHERE plan_id IS NULL OR plan_id = ''
  `
    )
    .catch(() => {});

  // Set NOT NULL default now that data is populated
  await db
    .query(
      `
    ALTER TABLE user_subscriptions
      ALTER COLUMN plan_id SET DEFAULT 'basic'
  `
    )
    .catch(() => {});

  console.log('✅  Existing subscriptions migrated to plan_id FK');
}

// ─────────────────────────────────────────────────────────
// 6. Print summary
// ─────────────────────────────────────────────────────────

async function printSummary() {
  const [plans, courses, access] = await Promise.all([
    db.query('SELECT id, name, price_monthly FROM subscription_plans ORDER BY price_monthly'),
    db.query('SELECT id, title, status, required_plan FROM courses ORDER BY created_at'),
    db.query(`
      SELECT p.name AS plan, c.title AS course
        FROM plan_course_access a
        JOIN subscription_plans p ON p.id = a.plan_id
        JOIN courses c ON c.id = a.course_id
       ORDER BY p.price_monthly, c.created_at
    `),
  ]);

  console.log('\n📦  Subscription Plans:');
  plans.rows.forEach(p =>
    console.log(`   ${p.id.padEnd(10)} ${p.name.padEnd(12)} ₹${p.price_monthly}/mo`)
  );

  console.log('\n🎓  Courses:');
  courses.rows.forEach(c =>
    console.log(
      `   ${c.id.padEnd(6)} ${c.title.padEnd(35)} [${c.status}]  requires: ${c.required_plan}`
    )
  );

  console.log('\n🔑  Plan → Course Access:');
  access.rows.forEach(r => console.log(`   ${r.plan.padEnd(12)} → ${r.course}`));
}

// ─────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────

(async () => {
  try {
    console.log('🔌  Connecting to Neon.tech…');
    await db.query('SELECT 1');
    console.log('✅  Connected\n');

    await createTables();
    await seedPlans();
    await seedCourses();
    await seedPlanAccess();
    await migrateExistingSubscriptions();
    await printSummary();

    console.log('\n🎉  Database setup complete!\n');
  } catch (err) {
    console.error('❌  Error:', err.message);
    process.exit(1);
  } finally {
    await db.end();
  }
})();
