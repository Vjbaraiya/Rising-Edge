/**
 * Rising Edge Technologies â€” Express Server
 * Stack: Express Â· PostgreSQL (pg) Â· bcrypt Â· JWT Â· Nodemailer
 */

'use strict';

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const multer = require('multer');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const FRONTEND_URL = process.env.FRONTEND_URL || `http://localhost:${PORT}`;
const BCRYPT_ROUNDS = 12;
const ACCESS_TTL = '15m';
const REFRESH_TTL_DAYS = 7;

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

db.on('error', err => console.error('[pg] unexpected pool error', err));

async function initDB() {
  // â”€â”€ Extensions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await db.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`).catch(() => {});
  await db.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`).catch(() => {});
  await db.query(`CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000`).catch(() => {});

  // â”€â”€ Core auth tables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      full_name             TEXT NOT NULL,
      email                 TEXT UNIQUE NOT NULL,
      password_hash         TEXT NOT NULL,
      role                  TEXT NOT NULL DEFAULT 'USER',
      status                TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
      email_verified        BOOLEAN NOT NULL DEFAULT FALSE,
      avatar_url            TEXT,
      mobile                TEXT,
      location              TEXT,
      "current_role"        TEXT,
      org                   TEXT,
      job_title             TEXT,
      linkedin_url          TEXT,
      bio                   TEXT,
      failed_login_attempts INT NOT NULL DEFAULT 0,
      locked_until          TIMESTAMPTZ,
      last_login_at         TIMESTAMPTZ,
      email_verify_token    TEXT,
      email_verify_expiry   TIMESTAMPTZ,
      password_reset_token  TEXT,
      password_reset_expiry TIMESTAMPTZ,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash  TEXT UNIQUE NOT NULL,
      ip_address  TEXT,
      device_info TEXT,
      expires_at  TIMESTAMPTZ NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS login_history (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ip_address TEXT,
      user_agent TEXT,
      success    BOOLEAN NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // â”€â”€ Subscription & payments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await db.query(`
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
      price_yearly  NUMERIC(10,2) NOT NULL DEFAULT 0,
      description   TEXT,
      features      JSONB NOT NULL DEFAULT '[]',
      max_courses   INT NOT NULL DEFAULT 0,
      badge_color   TEXT NOT NULL DEFAULT 'gray',
      is_popular    BOOLEAN NOT NULL DEFAULT FALSE,
      is_active     BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order    INT NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id       TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id       TEXT NOT NULL DEFAULT 'basic',
      status        TEXT NOT NULL DEFAULT 'ACTIVE',
      billing_cycle TEXT NOT NULL DEFAULT 'monthly',
      start_date    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      end_date      TIMESTAMPTZ,
      cancelled_at  TIMESTAMPTZ,
      cancel_reason TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS coupons (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      code        TEXT UNIQUE NOT NULL,
      type        TEXT NOT NULL DEFAULT 'percent',
      val         NUMERIC(10,2) NOT NULL DEFAULT 0,
      used        INT NOT NULL DEFAULT 0,
      limit_count INT NOT NULL DEFAULT 100,
      expires     TEXT NOT NULL DEFAULT 'No expiry',
      active      BOOLEAN NOT NULL DEFAULT TRUE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Idempotent column additions for coupon scoping & per-user limits
  await db.query(
    `ALTER TABLE coupons ADD COLUMN IF NOT EXISTS applies_to TEXT NOT NULL DEFAULT 'all'`
  );
  await db.query(`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS applicable_ids TEXT[] DEFAULT NULL`);
  await db.query(
    `ALTER TABLE coupons ADD COLUMN IF NOT EXISTS per_user_limit INT NOT NULL DEFAULT 1`
  );
  // Add coupon tracking to tool_payments
  await db.query(
    `ALTER TABLE tool_payments ADD COLUMN IF NOT EXISTS coupon_id TEXT REFERENCES coupons(id)`
  );
  await db.query(
    `ALTER TABLE tool_payments ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0`
  );

  await db.query(`
    CREATE TABLE IF NOT EXISTS coupon_usage (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      coupon_id  TEXT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      order_id   TEXT,
      used_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_usage_order ON coupon_usage(order_id) WHERE order_id IS NOT NULL`
  );

  await db.query(`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      order_id        TEXT UNIQUE NOT NULL,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id         TEXT,
      product_type    TEXT NOT NULL DEFAULT 'subscription',
      billing_cycle   TEXT NOT NULL DEFAULT 'monthly',
      amount          NUMERIC(10,2) NOT NULL,
      gst_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
      discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      currency        TEXT NOT NULL DEFAULT 'INR',
      status          TEXT NOT NULL DEFAULT 'pending',
      gateway         TEXT NOT NULL DEFAULT 'cashfree',
      gateway_order_id TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      order_id         TEXT NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,
      user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      payment_id       TEXT UNIQUE,
      gateway          TEXT NOT NULL DEFAULT 'cashfree',
      amount           NUMERIC(10,2) NOT NULL,
      currency         TEXT NOT NULL DEFAULT 'INR',
      status           TEXT NOT NULL DEFAULT 'pending',
      payment_method   TEXT,
      gateway_response JSONB,
      paid_at          TIMESTAMPTZ,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      invoice_number TEXT UNIQUE NOT NULL DEFAULT ('INV-' || LPAD(nextval('invoice_number_seq')::text, 6, '0')),
      order_id       TEXT NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,
      user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount         NUMERIC(10,2) NOT NULL,
      gst_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
      total          NUMERIC(10,2) NOT NULL,
      status         TEXT NOT NULL DEFAULT 'issued',
      issued_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // â”€â”€ Legacy tool payment tables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await db.query(`
    CREATE TABLE IF NOT EXISTS tool_subscriptions (
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
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS tool_payments (
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
    )
  `);

  // â”€â”€ Learning platform â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await db.query(`
    CREATE TABLE IF NOT EXISTS course_categories (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      slug        TEXT UNIQUE NOT NULL,
      description TEXT,
      sort_order  INT NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id            TEXT PRIMARY KEY,
      title         TEXT NOT NULL,
      slug          TEXT UNIQUE,
      category      TEXT NOT NULL,
      category_id   TEXT REFERENCES course_categories(id),
      description   TEXT,
      thumbnail_url TEXT,
      status        TEXT NOT NULL DEFAULT 'draft',
      modules_count INT NOT NULL DEFAULT 0,
      href          TEXT,
      gradient      TEXT,
      badge_color   TEXT,
      required_plan TEXT NOT NULL DEFAULT 'basic',
      price_inr     NUMERIC(10,2) NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS plan_course_access (
      plan_id   TEXT NOT NULL,
      course_id TEXT NOT NULL,
      PRIMARY KEY (plan_id, course_id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS course_enrollments (
      id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id        TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      status           TEXT NOT NULL DEFAULT 'active',
      progress         INT NOT NULL DEFAULT 0,
      last_accessed_at TIMESTAMPTZ,
      enrolled_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at     TIMESTAMPTZ,
      UNIQUE(user_id, course_id)
    )
  `);

  // â”€â”€ Certificates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await db.query(`
    CREATE TABLE IF NOT EXISTS certificate_issues (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id     TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      cert_number   TEXT UNIQUE NOT NULL DEFAULT ('CERT-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8))),
      issued_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at    TIMESTAMPTZ,
      revoked       BOOLEAN NOT NULL DEFAULT FALSE,
      revoked_at    TIMESTAMPTZ,
      revoke_reason TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // â”€â”€ Tools & Resources â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await db.query(`
    CREATE TABLE IF NOT EXISTS tools (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      category    TEXT NOT NULL DEFAULT 'calculator',
      plan        TEXT NOT NULL DEFAULT 'basic',
      description TEXT,
      url         TEXT NOT NULL DEFAULT '#',
      status      TEXT NOT NULL DEFAULT 'active',
      sort_order  INT NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS resources (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      type        TEXT NOT NULL DEFAULT 'guide',
      plan        TEXT NOT NULL DEFAULT 'basic',
      description TEXT,
      url         TEXT NOT NULL DEFAULT '#',
      downloads   INT NOT NULL DEFAULT 0,
      sort_order  INT NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // Ensure resources.type check constraint includes all admin form values
  await db.query(`
    ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_type_check
  `);
  await db.query(`
    ALTER TABLE resources ADD CONSTRAINT resources_type_check
      CHECK (type IN ('guide','whitepaper','design','case-study','myth-buster','template','video','dataset','other'))
  `);

  // â”€â”€ Admin & audit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await db.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
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
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS contact_requests (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL,
      phone       TEXT,
      company     TEXT,
      subject     TEXT,
      message     TEXT NOT NULL,
      type        TEXT NOT NULL DEFAULT 'general',
      status      TEXT NOT NULL DEFAULT 'new',
      assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
      resolved_at TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS service TEXT`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type       TEXT NOT NULL,
      title      TEXT NOT NULL,
      message    TEXT,
      data       JSONB,
      read       BOOLEAN NOT NULL DEFAULT FALSE,
      read_at    TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key         TEXT PRIMARY KEY,
      value       TEXT,
      description TEXT,
      is_public   BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // â”€â”€ Indexes (individual, each safe to fail) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ── Course pricing columns (idempotent) ────────────────────────────────
  await db
    .query(
      `ALTER TABLE courses ADD COLUMN IF NOT EXISTS original_price   NUMERIC(10,2) NOT NULL DEFAULT 0`
    )
    .catch(() => {});
  await db
    .query(
      `ALTER TABLE courses ADD COLUMN IF NOT EXISTS discounted_price NUMERIC(10,2) NOT NULL DEFAULT 0`
    )
    .catch(() => {});
  await db
    .query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS demo_link        TEXT`)
    .catch(() => {});

  // ── Module progress table ────────────────────────────────────────────────
  await db
    .query(
      `CREATE TABLE IF NOT EXISTS module_progress (
    id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_slug  TEXT NOT NULL,
    module_id    TEXT NOT NULL,
    quiz_score   INTEGER NOT NULL DEFAULT 0,
    quiz_max     INTEGER NOT NULL DEFAULT 0,
    completed    BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, course_slug, module_id)
  )`
    )
    .catch(() => {});

  // ── Course purchases table ─────────────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS course_purchases (
      id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id         TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      cashfree_order_id TEXT UNIQUE NOT NULL,
      payment_id        TEXT,
      txn_id            TEXT,
      coupon_code       TEXT,
      coupon_id         TEXT REFERENCES coupons(id),
      coupon_discount   NUMERIC(10,2) NOT NULL DEFAULT 0,
      original_price    NUMERIC(10,2) NOT NULL DEFAULT 0,
      discounted_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
      gst_amount        NUMERIC(10,2) NOT NULL DEFAULT 0,
      paid_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
      payment_status    TEXT NOT NULL DEFAULT 'pending',
      purchase_date     TIMESTAMPTZ,
      valid_until       TIMESTAMPTZ,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // ── Weekly Hardware Design Challenge (WHDC) tables ─────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS challenges (
      id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      week_number          INT,
      title                TEXT NOT NULL,
      slug                 TEXT UNIQUE NOT NULL,
      topic                TEXT,
      category_id          TEXT,
      difficulty           TEXT NOT NULL DEFAULT 'Intermediate',
      description          TEXT,
      cover_url            TEXT,
      time_limit_min       INT NOT NULL DEFAULT 20,
      total_points         INT NOT NULL DEFAULT 100,
      scoring_rule_version INT NOT NULL DEFAULT 1,
      linked_course_id     TEXT REFERENCES courses(id),
      opens_at             TIMESTAMPTZ,
      closes_at            TIMESTAMPTZ,
      status               TEXT NOT NULL DEFAULT 'draft',
      created_by           TEXT REFERENCES users(id),
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS challenge_questions (
      id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      challenge_id      TEXT REFERENCES challenges(id) ON DELETE CASCADE,
      type              TEXT NOT NULL,
      prompt            TEXT NOT NULL,
      assets            JSONB,
      options           JSONB,
      answer_key        JSONB NOT NULL,
      points            INT NOT NULL DEFAULT 10,
      negative_marking  NUMERIC(5,2) NOT NULL DEFAULT 0,
      partial_credit    BOOLEAN NOT NULL DEFAULT FALSE,
      numeric_tolerance NUMERIC,
      topic_tag         TEXT,
      difficulty_tag    TEXT,
      explanation       TEXT,
      position          INT NOT NULL DEFAULT 0,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS challenge_attempts (
      id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      challenge_id   TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
      user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status         TEXT NOT NULL DEFAULT 'in_progress',
      started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      submitted_at   TIMESTAMPTZ,
      deadline_at    TIMESTAMPTZ,
      raw_score      NUMERIC(6,2) NOT NULL DEFAULT 0,
      final_score    NUMERIC(8,2) NOT NULL DEFAULT 0,
      time_taken_sec INT,
      correct_count  INT NOT NULL DEFAULT 0,
      question_order JSONB,
      rank           INT,
      is_practice    BOOLEAN NOT NULL DEFAULT FALSE,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS attempt_answers (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      attempt_id    TEXT NOT NULL REFERENCES challenge_attempts(id) ON DELETE CASCADE,
      question_id   TEXT NOT NULL REFERENCES challenge_questions(id) ON DELETE CASCADE,
      response      JSONB,
      is_correct    BOOLEAN,
      points_earned NUMERIC(6,2) NOT NULL DEFAULT 0,
      answered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (attempt_id, question_id)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_points (
      user_id                  TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      lifetime_points          INT NOT NULL DEFAULT 0,
      tier                     TEXT NOT NULL DEFAULT 'Bronze',
      current_streak           INT NOT NULL DEFAULT 0,
      longest_streak           INT NOT NULL DEFAULT 0,
      challenges_played        INT NOT NULL DEFAULT 0,
      last_played_challenge_id TEXT REFERENCES challenges(id),
      updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // Cumulative count of top-3 (podium) finishes across all weeks — separate
  // from the one-time champion/podium badges, this increments every single
  // week the user places top-3, not just the first time.
  await db
    .query(
      `ALTER TABLE user_points ADD COLUMN IF NOT EXISTS podium_finishes INT NOT NULL DEFAULT 0`
    )
    .catch(() => {});
  await db.query(`
    CREATE TABLE IF NOT EXISTS points_ledger (
      id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      challenge_id TEXT REFERENCES challenges(id) ON DELETE SET NULL,
      reason       TEXT NOT NULL,
      points       INT NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS badges (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      code        TEXT UNIQUE NOT NULL,
      name        TEXT NOT NULL,
      description TEXT,
      icon        TEXT,
      criteria    JSONB,
      repeatable  BOOLEAN NOT NULL DEFAULT FALSE,
      active      BOOLEAN NOT NULL DEFAULT TRUE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_badges (
      id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      badge_id     TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
      challenge_id TEXT REFERENCES challenges(id) ON DELETE SET NULL,
      awarded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // Records each top-3 finish exactly once per (user, challenge) — the
  // idempotency guard for awardWhdcTopBadges() so re-running a close (manual
  // + auto lifecycle both call it) never double-increments podium_finishes.
  // Also doubles as a queryable history of weekly podium finishes.
  await db.query(`
    CREATE TABLE IF NOT EXISTS whdc_podium_log (
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
      rank         INT NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, challenge_id)
    )
  `);
  // Reuse the existing certificate engine for WHDC certificates
  await db
    .query(`ALTER TABLE certificate_issues ADD COLUMN IF NOT EXISTS challenge_id TEXT`)
    .catch(() => {});
  await db
    .query(`ALTER TABLE certificate_issues ADD COLUMN IF NOT EXISTS source TEXT`)
    .catch(() => {});
  // course_id on certificate_issues is NOT NULL in the base schema; relax it so
  // challenge certificates (which have no course) can be issued.
  await db
    .query(`ALTER TABLE certificate_issues ALTER COLUMN course_id DROP NOT NULL`)
    .catch(() => {});
  // Tracks when "you haven't submitted yet" reminder emails were last sent
  // for a challenge, so whdcRunLifecycle() can nudge non-submitters every
  // 2 days without re-reading every user's mailbox history.
  await db
    .query(`ALTER TABLE challenges ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ`)
    .catch(() => {});

  // Profile skills — user-entered list shown on the profile page.
  await db
    .query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS skills TEXT[] NOT NULL DEFAULT '{}'`)
    .catch(() => {});

  // Job-seeker fields — surfaced on the profile page and (later) to recruiters.
  await db
    .query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS job_search_status TEXT`)
    .catch(() => {});
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS notice_period TEXT`).catch(() => {});
  await db
    .query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS years_experience NUMERIC(4,1)`)
    .catch(() => {});

  const whdcIndexes = [
    `CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status, opens_at, closes_at)`,
    `CREATE INDEX IF NOT EXISTS idx_questions_challenge ON challenge_questions(challenge_id, position)`,
    `CREATE INDEX IF NOT EXISTS idx_questions_tags ON challenge_questions(topic_tag, difficulty_tag)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS uniq_attempt_scored ON challenge_attempts(challenge_id, user_id) WHERE is_practice = FALSE`,
    `CREATE INDEX IF NOT EXISTS idx_attempts_rank ON challenge_attempts(challenge_id, final_score DESC, time_taken_sec ASC)`,
    `CREATE INDEX IF NOT EXISTS idx_attempts_user ON challenge_attempts(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ledger_user ON points_ledger(user_id, created_at)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_badge ON user_badges(user_id, badge_id)`,
    // Legacy — weekly challenges no longer issue certificates (see
    // awardWhdcTopBadges), but this protects any certificates issued
    // before that change from ever being duplicated.
    `CREATE UNIQUE INDEX IF NOT EXISTS uniq_whdc_cert ON certificate_issues(user_id, challenge_id) WHERE source='whdc'`,
  ];
  for (const sql of whdcIndexes) {
    await db.query(sql).catch(() => {});
  }

  // Seed badge definitions (idempotent)
  const whdcBadges = [
    [
      'first_challenge',
      'First Challenge',
      'Completed your first weekly challenge',
      '🎯',
      { event: 'first_completion' },
    ],
    // Legacy streak/century codes — kept so anyone who already earned one
    // keeps showing it; no longer awarded (see submit handler below, which
    // now uses streak_5/10/25 and played_5/10/25/50 instead).
    ['streak_4', '4-Week Streak', 'Four weeks in a row', '🔥', { streak: 4 }],
    ['streak_8', '8-Week Streak', 'Eight weeks in a row', '🏅', { streak: 8 }],
    ['streak_12', 'Iron Engineer (Legacy)', 'Twelve weeks in a row', '🏆', { streak: 12 }],
    ['century', 'Century', 'Played 100 challenges', '🌟', { played: 100 }],
    // Active streak badges — awarded for continuous weekly submissions.
    ['streak_5', '5-Week Streak', 'Five weeks in a row', '🔥', { streak: 5 }],
    ['streak_10', '10-Week Streak', 'Ten weeks in a row', '🏅', { streak: 10 }],
    ['streak_25', 'Iron Engineer', 'Twenty-five weeks in a row', '🏆', { streak: 25 }],
    // Active participation/milestone badges — awarded to everyone who
    // attempts, based on total (lifetime) challenges played.
    ['played_5', '5 Challenges', 'Completed 5 weekly challenges', '🔹', { played: 5 }],
    ['played_10', '10 Challenges', 'Completed 10 weekly challenges', '🔷', { played: 10 }],
    ['played_25', '25 Challenges', 'Completed 25 weekly challenges', '💠', { played: 25 }],
    ['played_50', '50 Challenges', 'Completed 50 weekly challenges', '🌟', { played: 50 }],
    // Rank-based badges — awarded when a challenge closes and final ranks
    // are known (see awardWhdcTopBadges()).
    ['champion', 'Champion', 'Finished #1 in a week', '🥇', { rank: 1 }],
    ['podium', 'Podium', 'Top-3 finish', '🥉', { rank_lte: 3 }],
    ['perfect', 'Perfect Score', 'Scored 100% in a challenge', '💯', { perfect: true }],
    ['early_bird', 'Early Bird', 'Submitted in the first 24 hours', '⚡', { within_hours: 24 }],
    ['platinum', 'Grandmaster', 'Reached Platinum tier', '👑', { tier: 'Platinum' }],
  ];
  for (const [code, name, description, icon, criteria] of whdcBadges) {
    await db
      .query(
        `INSERT INTO badges (code, name, description, icon, criteria)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (code) DO NOTHING`,
        [code, name, description, icon, JSON.stringify(criteria)]
      )
      .catch(() => {});
  }

  // ── Advertising (ad slots + direct-sold campaigns) ────────────────────────
  // ad_slots is a small static reference table (seeded below) so the admin
  // UI can list valid placements without hardcoding them client-side. Slot
  // ids are plain readable strings (not uuids) because they're referenced
  // directly by data-ad-slot="..." attributes in the front-end.
  await db.query(`
    CREATE TABLE IF NOT EXISTS ad_slots (
      id          TEXT PRIMARY KEY,
      label       TEXT NOT NULL,
      description TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS ad_campaigns (
      id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      slot_id          TEXT NOT NULL REFERENCES ad_slots(id) ON DELETE CASCADE,
      advertiser_name  TEXT NOT NULL,
      image_url        TEXT NOT NULL,
      target_url       TEXT NOT NULL,
      alt_text         TEXT,
      starts_at        TIMESTAMPTZ,
      ends_at          TIMESTAMPTZ,
      active           BOOLEAN NOT NULL DEFAULT TRUE,
      impressions      INT NOT NULL DEFAULT 0,
      clicks           INT NOT NULL DEFAULT 0,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db
    .query(
      `CREATE INDEX IF NOT EXISTS idx_ad_campaigns_slot_active ON ad_campaigns(slot_id, active)`
    )
    .catch(() => {});

  const adSlots = [
    [
      'top-banner',
      'Top-of-page banner',
      '728×90 desktop / 320×50 mobile — Trainings, Tools, Resources, Weekly Challenge hub only',
    ],
    [
      'sticky-bottom-bar',
      'Sticky bottom bar',
      '320×50 mobile / 728×50 desktop — site-wide except attempt/certificate/checkout/admin pages',
    ],
  ];
  for (const [id, label, description] of adSlots) {
    await db
      .query(
        `INSERT INTO ad_slots (id, label, description) VALUES ($1,$2,$3)
         ON CONFLICT (id) DO NOTHING`,
        [id, label, description]
      )
      .catch(() => {});
  }

  // ── Job Board tables (see docs/Job-Board-Requirements.md) ────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      posted_by        TEXT NOT NULL REFERENCES users(id),
      title            TEXT NOT NULL,
      company_name     TEXT NOT NULL,
      company_logo_url TEXT,
      disciplines      TEXT[] NOT NULL DEFAULT '{}',
      employment_type  TEXT NOT NULL DEFAULT 'FULL_TIME',
      experience_level TEXT NOT NULL DEFAULT 'MID',
      location         TEXT,
      work_mode        TEXT NOT NULL DEFAULT 'ONSITE',
      description_md   TEXT NOT NULL,
      skills           TEXT[] NOT NULL DEFAULT '{}',
      salary_min       INTEGER,
      salary_max       INTEGER,
      salary_currency  TEXT DEFAULT 'INR',
      salary_hidden    BOOLEAN NOT NULL DEFAULT FALSE,
      apply_mode       TEXT NOT NULL DEFAULT 'IN_PLATFORM',
      apply_url        TEXT,
      platform_links   JSONB NOT NULL DEFAULT '[]',
      notify_email     TEXT,
      deadline         DATE,
      remove_at        TIMESTAMPTZ,
      status           TEXT NOT NULL DEFAULT 'ACTIVE',
      views_count      INTEGER NOT NULL DEFAULT 0,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS job_applications (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      job_id      TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind        TEXT NOT NULL DEFAULT 'IN_PLATFORM',
      resume_url  TEXT,
      cover_note  TEXT,
      status      TEXT NOT NULL DEFAULT 'SUBMITTED',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (job_id, user_id)
    )
  `);
  // Migrations for DBs created before these columns existed
  await db
    .query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS platform_links JSONB NOT NULL DEFAULT '[]'`)
    .catch(() => {});
  await db.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS notify_email TEXT`).catch(() => {});
  await db.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS remove_at TIMESTAMPTZ`).catch(() => {});
  // Backfill: default removal is 3 weeks after posting
  await db
    .query(`UPDATE jobs SET remove_at = created_at + interval '21 days' WHERE remove_at IS NULL`)
    .catch(() => {});
  // ── Training likes & feedback ────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS training_likes (
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      training_slug TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, training_slug)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS training_feedback (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      training_slug TEXT NOT NULL,
      message       TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db
    .query(`CREATE INDEX IF NOT EXISTS idx_training_likes_slug ON training_likes(training_slug)`)
    .catch(() => {});
  // Speeds up the per-training view/visitor lookup in GET /api/trainings/views
  // (prefix match against page_views.path).
  await db
    .query(`CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path)`)
    .catch(() => {});

  // ── Training progress: per-user, per-lesson completion + resume position ──
  await db.query(`
    CREATE TABLE IF NOT EXISTS training_progress (
      id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id      TEXT NOT NULL,
      lesson_id      TEXT NOT NULL,
      completed      BOOLEAN NOT NULL DEFAULT FALSE,
      completed_at   TIMESTAMPTZ,
      last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, course_id, lesson_id)
    )
  `);
  await db
    .query(
      `CREATE INDEX IF NOT EXISTS idx_training_progress_user_course
         ON training_progress(user_id, course_id)`
    )
    .catch(() => {});

  // ── Content social: likes/feedback/views for resources & tools ───────
  // Generalized version of the training_likes/training_feedback pattern
  // above, keyed by (kind, content_id) instead of a URL-derived slug —
  // resources and tools already have stable DB ids, and unlike trainings
  // they don't all have an in-site page to derive a slug from (some link
  // to external PDFs/sites). "Views" here count click-throughs from the
  // catalogue (resources.html/tools.html), recorded via
  // POST /api/content/:kind/:id/view, so it works the same way whether the
  // target is an internal page or an external link.
  await db.query(`
    CREATE TABLE IF NOT EXISTS content_likes (
      kind        TEXT NOT NULL CHECK (kind IN ('resource','tool')),
      content_id  TEXT NOT NULL,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (kind, content_id, user_id)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS content_feedback (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      kind        TEXT NOT NULL CHECK (kind IN ('resource','tool')),
      content_id  TEXT NOT NULL,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message     TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS content_views (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      kind        TEXT NOT NULL CHECK (kind IN ('resource','tool')),
      content_id  TEXT NOT NULL,
      user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
      session_id  TEXT,
      ip_address  TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db
    .query(
      `CREATE INDEX IF NOT EXISTS idx_content_likes_kind_id ON content_likes(kind, content_id)`
    )
    .catch(() => {});
  await db
    .query(
      `CREATE INDEX IF NOT EXISTS idx_content_feedback_kind_id ON content_feedback(kind, content_id)`
    )
    .catch(() => {});
  await db
    .query(
      `CREATE INDEX IF NOT EXISTS idx_content_views_kind_id ON content_views(kind, content_id)`
    )
    .catch(() => {});

  const jobIndexes = [
    `CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_jobs_disciplines    ON jobs USING GIN (disciplines)`,
    `CREATE INDEX IF NOT EXISTS idx_jobs_posted_by      ON jobs(posted_by)`,
    `CREATE INDEX IF NOT EXISTS idx_job_apps_job        ON job_applications(job_id)`,
    `CREATE INDEX IF NOT EXISTS idx_job_apps_user       ON job_applications(user_id)`,
  ];
  for (const sql of jobIndexes) {
    await db.query(sql).catch(() => {});
  }
  await seedDemoJobs().catch(e => console.error('[jobs/seed]', e.message));

  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email)`,
    `CREATE INDEX IF NOT EXISTS idx_users_status         ON users(status)`,
    `CREATE INDEX IF NOT EXISTS idx_refresh_token_hash   ON refresh_tokens(token_hash)`,
    `CREATE INDEX IF NOT EXISTS idx_refresh_user         ON refresh_tokens(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_usub_user            ON user_subscriptions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_usub_plan            ON user_subscriptions(plan_id)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_user          ON payment_orders(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_payments_order       ON payments(order_id)`,
    // Migrate: add original-price columns to subscription_plans if not present
    `ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS mrp_monthly NUMERIC(10,2) NOT NULL DEFAULT 0`,
    `ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS mrp_yearly  NUMERIC(10,2) NOT NULL DEFAULT 0`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_enroll_user_course ON course_enrollments(user_id, course_id)`,
    `CREATE INDEX IF NOT EXISTS idx_enroll_user          ON course_enrollments(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_enroll_course        ON course_enrollments(course_id)`,
    `CREATE INDEX IF NOT EXISTS idx_tool_sub_user        ON tool_subscriptions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_tool_sub_status      ON tool_subscriptions(status)`,
    `CREATE INDEX IF NOT EXISTS idx_tool_pay_order       ON tool_payments(order_id)`,
    `CREATE INDEX IF NOT EXISTS idx_tool_pay_user        ON tool_payments(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_user           ON audit_logs(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notif_user           ON notifications(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_course_purch_user    ON course_purchases(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_course_purch_course  ON course_purchases(course_id)`,
    `CREATE INDEX IF NOT EXISTS idx_mod_prog_user        ON module_progress(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_mod_prog_course      ON module_progress(course_slug)`,
  ];
  for (const sql of indexes) {
    await db.query(sql).catch(() => {});
  }

  // â”€â”€ updated_at trigger function â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await db
    .query(
      `
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $func$ LANGUAGE plpgsql
  `
    )
    .catch(() => {});

  const triggeredTables = [
    'users',
    'user_subscriptions',
    'subscription_plans',
    'payment_orders',
    'payments',
    'tool_subscriptions',
    'tool_payments',
    'courses',
    'course_enrollments',
    'tools',
    'resources',
    'coupons',
    'challenges',
    'challenge_questions',
    'user_points',
  ];
  for (const t of triggeredTables) {
    await db
      .query(
        `
      DROP TRIGGER IF EXISTS trg_updated_at ON ${t};
      CREATE TRIGGER trg_updated_at BEFORE UPDATE ON ${t}
        FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `
      )
      .catch(() => {});
  }

  console.log('[db] schema ready');

  // â”€â”€ Seed subscription plans â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price_monthly: 0,
      price_yearly: 0,
      badge_color: 'gray',
      is_popular: false,
      max_courses: 1,
      sort_order: 1,
      description: 'Free access to Signal Integrity Academy and community resources.',
      features: [
        'Signal Integrity Academy (full access)',
        'Community discussion forum',
        '4 free engineering tools',
        'Public whitepapers & guides',
        'Email support (72 h response)',
      ],
    },
    {
      id: 'advanced',
      name: 'Advanced',
      price_monthly: 299,
      price_yearly: 2999,
      mrp_monthly: 699,
      mrp_yearly: 6999,
      badge_color: 'blue',
      is_popular: true,
      max_courses: 2,
      sort_order: 2,
      description: 'Unlock PCB Design Mastery + SI Academy with priority support.',
      features: [
        'Everything in Basic',
        'PCB Design Mastery (full access)',
        'All engineering tools (unlimited)',
        'Reference design downloads',
        'Priority email support (24 h)',
        'Monthly live Q&A session',
        'Course completion certificate',
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      price_monthly: 999,
      price_yearly: 9999,
      mrp_monthly: 1999,
      mrp_yearly: 19999,
      badge_color: 'purple',
      is_popular: false,
      max_courses: 0,
      sort_order: 3,
      description: 'All courses, 1-on-1 mentoring, and custom training for teams.',
      features: [
        'Everything in Advanced',
        'Embedded Systems & RTOS (full access)',
        'EMC & Compliance (full access)',
        'Unlimited course access (all future courses)',
        '2x monthly 1-on-1 mentoring sessions',
        'Custom team training (up to 5 seats)',
        'Priority Slack support (4 h response)',
        'Early access to new content',
      ],
    },
  ];
  for (const p of plans) {
    await db.query(
      `INSERT INTO subscription_plans (id,name,price_monthly,price_yearly,mrp_monthly,mrp_yearly,description,features,max_courses,badge_color,is_popular,sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         name=EXCLUDED.name, description=EXCLUDED.description,
         features=EXCLUDED.features, max_courses=EXCLUDED.max_courses,
         badge_color=EXCLUDED.badge_color, is_popular=EXCLUDED.is_popular,
         sort_order=EXCLUDED.sort_order, updated_at=NOW()`,
      [
        p.id,
        p.name,
        p.price_monthly,
        p.price_yearly,
        p.mrp_monthly || 0,
        p.mrp_yearly || 0,
        p.description,
        JSON.stringify(p.features),
        p.max_courses,
        p.badge_color,
        p.is_popular,
        p.sort_order,
      ]
    );
  }

  // â”€â”€ Seed course categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const cats = [
    { id: 'si', name: 'Signal Integrity', slug: 'signal-integrity', sort_order: 1 },
    { id: 'hw', name: 'PCB Design', slug: 'pcb-design', sort_order: 2 },
    { id: 'fw', name: 'Embedded Systems', slug: 'embedded-systems', sort_order: 3 },
  ];
  for (const c of cats) {
    await db.query(
      `INSERT INTO course_categories (id,name,slug,sort_order) VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO NOTHING`,
      [c.id, c.name, c.slug, c.sort_order]
    );
  }

  // â”€â”€ Seed courses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Courses are managed via the admin panel — nothing is force-seeded here so
  // that deletions persist across restarts.
  const courses = [];
  for (const c of courses) {
    await db.query(
      `INSERT INTO courses (id,title,slug,category,description,status,modules_count,href,gradient,badge_color,required_plan,price_inr)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         title=EXCLUDED.title, slug=EXCLUDED.slug, description=EXCLUDED.description,
         status=EXCLUDED.status, modules_count=EXCLUDED.modules_count,
         required_plan=EXCLUDED.required_plan, price_inr=EXCLUDED.price_inr, updated_at=NOW()`,
      [
        c.id,
        c.title,
        c.slug,
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

  // â”€â”€ Seed plan â†’ course access â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const access = [
    ['basic', 'si'],
    ['advanced', 'si'],
    ['advanced', 'hw'],
    ['premium', 'si'],
    ['premium', 'hw'],
    ['premium', 'fw'],
  ];
  for (const [plan_id, course_id] of access) {
    await db.query(
      `INSERT INTO plan_course_access (plan_id,course_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [plan_id, course_id]
    );
  }

  // â”€â”€ Seed system settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const settings = [
    ['site_name', 'Rising Edge Technologies', 'Platform display name', true],
    ['support_email', 'support@risingedgetech.com', 'Support email address', true],
    ['gst_rate', '18', 'GST percentage on payments', false],
    ['maintenance_mode', 'false', 'Enable maintenance mode', false],
    ['registration_open', 'true', 'Allow new registrations', false],
    ['cashfree_env', 'production', 'Cashfree environment', false],
  ];
  for (const [key, value, description, is_public] of settings) {
    await db.query(
      `INSERT INTO system_settings (key,value,description,is_public)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`,
      [key, value, description, is_public]
    );
  }
  // ads_adsense_enabled is admin-toggleable at runtime (see Admin/ads.html),
  // unlike the settings above — DO NOTHING on conflict so a later server
  // restart never silently reverts an admin's choice back to the default.
  await db.query(
    `INSERT INTO system_settings (key,value,description,is_public)
     VALUES ('ads_adsense_enabled','true',
             'Show AdSense fallback ads when no direct campaign is active for a slot', TRUE)
     ON CONFLICT (key) DO NOTHING`
  );

  console.log('[db] seed complete');
}

// ── Job Board: seed demo jobs (idempotent — only when jobs table is empty) ──
async function seedDemoJobs() {
  const { rows: cnt } = await db.query(`SELECT COUNT(*)::int AS n FROM jobs`);
  if (cnt[0].n > 0) return;
  // Post demo jobs as the first SUPER_ADMIN (fallback: any admin, then any user)
  const { rows: posters } = await db.query(
    `SELECT id FROM users WHERE role IN ('SUPER_ADMIN','ADMIN') ORDER BY role DESC, created_at ASC LIMIT 1`
  );
  if (!posters.length) return; // no users yet — seed on next boot
  const uid = posters[0].id;
  const demo = [
    {
      title: 'Senior Hardware Design Engineer',
      company: 'Tesla Power Electronics',
      disciplines: ['HARDWARE_DESIGN'],
      type: 'FULL_TIME',
      exp: 'SENIOR',
      location: 'Bangalore, India',
      mode: 'HYBRID',
      skills: ['Schematic Design', 'Altium Designer', 'DC-DC Converters', 'LTspice'],
      smin: 2500000,
      smax: 4000000,
      apply: 'IN_PLATFORM',
      url: null,
      desc: 'Own end-to-end hardware design of high-voltage power conversion boards: architecture, schematic capture, component selection, worst-case analysis, bring-up and validation. You will work with layout, firmware and test teams to ship automotive-grade electronics.\n\n**Responsibilities**\n- Architect and design DC-DC converter and gate-driver boards\n- Run worst-case circuit analysis and derating reviews\n- Lead board bring-up and design verification testing\n\n**Requirements**\n- 7+ years in power electronics hardware design\n- Strong Altium Designer and LTspice/PSpice skills\n- Experience with automotive standards (ISO 26262 awareness a plus)',
    },
    {
      title: 'PCB Layout Engineer (High-Speed)',
      company: 'Qualcomm India',
      disciplines: ['PCB_DESIGN', 'SI'],
      type: 'FULL_TIME',
      exp: 'MID',
      location: 'Hyderabad, India',
      mode: 'ONSITE',
      skills: ['Cadence Allegro', 'High-Speed Routing', 'DDR4/DDR5', 'PCIe', 'Stackup Design'],
      smin: 1800000,
      smax: 2800000,
      apply: 'IN_PLATFORM',
      url: null,
      desc: 'Layout of 12+ layer HDI boards for mobile and compute platforms. You will own stackup planning, constraint management, length-matched routing for DDR and SerDes interfaces, and collaborate daily with SI/PI engineers.\n\n**Requirements**\n- 3–7 years of high-speed PCB layout with Cadence Allegro\n- DDR4/DDR5 and PCIe Gen4+ routing experience\n- Understanding of impedance control and return-path management',
    },
    {
      title: 'Signal Integrity Engineer',
      company: 'NVIDIA',
      disciplines: ['SI'],
      type: 'FULL_TIME',
      exp: 'SENIOR',
      location: 'Pune, India',
      mode: 'HYBRID',
      skills: ['HFSS', 'ADS', 'IBIS-AMI', 'SerDes', 'S-Parameters'],
      smin: 3500000,
      smax: 5500000,
      apply: 'EXTERNAL',
      url: 'https://www.nvidia.com/en-in/about-nvidia/careers/',
      desc: 'Pre- and post-layout SI analysis for 112G SerDes and DDR interfaces on GPU baseboards. Channel modeling with HFSS/ADS, IBIS-AMI simulation, and correlation with lab measurements (VNA, BERT, high-BW scopes).\n\n**Requirements**\n- 5+ years in signal integrity for high-speed digital systems\n- Hands-on HFSS or equivalent 3D EM solver experience\n- Measurement correlation experience strongly preferred',
    },
    {
      title: 'Power Integrity Engineer',
      company: 'Intel',
      disciplines: ['PI'],
      type: 'FULL_TIME',
      exp: 'MID',
      location: 'Bangalore, India',
      mode: 'ONSITE',
      skills: ['SIwave', 'PowerDC', 'PDN Analysis', 'VRM Design', 'Decap Optimization'],
      smin: 2000000,
      smax: 3200000,
      apply: 'EXTERNAL',
      url: 'https://jobs.intel.com/',
      desc: 'PDN design and analysis for server platforms: target-impedance definition, decoupling strategy, IR-drop and AC analysis with SIwave/PowerDC, and VRM transient validation in the lab.\n\n**Requirements**\n- 3+ years of power integrity analysis\n- Fluency with SIwave, PowerDC, or PowerSI\n- Understanding of VRM control loops and load-line spec',
    },
    {
      title: 'EMC/EMI Design Engineer',
      company: 'Bosch Automotive Electronics',
      disciplines: ['EMC'],
      type: 'FULL_TIME',
      exp: 'MID',
      location: 'Coimbatore, India',
      mode: 'ONSITE',
      skills: ['CISPR 25', 'ISO 11452', 'EMC Pre-compliance', 'Filter Design', 'ESD Protection'],
      smin: 1500000,
      smax: 2400000,
      apply: 'IN_PLATFORM',
      url: null,
      desc: 'EMC design and pre-compliance for automotive ECUs. Define grounding/shielding strategy, design input filters and ESD protection, run CISPR 25 pre-compliance in our in-house chamber, and debug failures to root cause.\n\n**Requirements**\n- 3+ years of EMC design or test experience\n- Working knowledge of CISPR 25, ISO 11452, ISO 10605\n- Near-field probing and spectrum-analyzer debug skills',
    },
    {
      title: 'PCB Design Intern',
      company: 'Rising Edge Technologies',
      disciplines: ['PCB_DESIGN', 'HARDWARE_DESIGN'],
      type: 'INTERNSHIP',
      exp: 'FRESHER',
      location: 'Remote',
      mode: 'REMOTE',
      skills: ['KiCad', 'Schematic Capture', 'Basic Layout'],
      smin: 25000,
      smax: 40000,
      apply: 'IN_PLATFORM',
      url: null,
      desc: 'Six-month remote internship: design training boards and reference layouts used in our courses. You will do schematic capture and 2–4 layer layout in KiCad under mentorship from senior engineers.\n\n**Requirements**\n- Final-year ECE/EEE student or fresh graduate\n- A personal or academic PCB project you can show\n- Familiarity with KiCad or any EDA tool',
    },
    {
      title: 'Hardware Validation Engineer (SI/PI Lab)',
      company: 'Keysight Technologies',
      disciplines: ['SI', 'PI', 'HARDWARE_DESIGN'],
      type: 'CONTRACT',
      exp: 'JUNIOR',
      location: 'Gurgaon, India',
      mode: 'ONSITE',
      skills: ['VNA', 'TDR', 'Oscilloscopes', 'Python Automation', 'S-Parameters'],
      smin: 1200000,
      smax: 1800000,
      apply: 'EXTERNAL',
      url: 'https://jobs.keysight.com/',
      desc: '12-month contract in our customer demo lab: characterize channels with VNA/TDR, automate measurements in Python, and support SI/PI application demos for customers.\n\n**Requirements**\n- 1–3 years of lab measurement experience\n- Comfort with VNA calibration and S-parameter basics\n- Python scripting for instrument control (PyVISA)',
    },
  ];
  for (const j of demo) {
    await db.query(
      `INSERT INTO jobs (posted_by, title, company_name, disciplines, employment_type,
                         experience_level, location, work_mode, description_md, skills,
                         salary_min, salary_max, salary_currency, apply_mode, apply_url, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'INR',$13,$14,'ACTIVE')`,
      [
        uid,
        j.title,
        j.company,
        j.disciplines,
        j.type,
        j.exp,
        j.location,
        j.mode,
        j.desc,
        j.skills,
        j.smin,
        j.smax,
        j.apply,
        j.url,
      ]
    );
  }
  console.log(`[db] seeded ${demo.length} demo jobs`);
}

// Email sending goes through the Resend HTTPS API rather than raw SMTP —
// the hosting environment blocks outbound SMTP ports (465/587) entirely,
// confirmed against both Titan and Gmail's SMTP servers (both hung/timed
// out identically). HTTPS (443) is not subject to that block.
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM =
  process.env.SMTP_FROM || process.env.EMAIL_FROM || 'Rising Edge <no-reply@risingedgetech.com>';

async function sendMail({ to, subject, html, attachments }) {
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — email not sent');
    return;
  }
  const controller = new AbortController();
  // Attachments make the payload larger, so allow more time when present.
  const timeout = setTimeout(
    () => controller.abort(),
    attachments && attachments.length ? 20000 : 8000
  );
  try {
    const payload = { from: FROM, to, subject, html };
    if (attachments && attachments.length) {
      payload.attachments = attachments;
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Resend API ${res.status}: ${body}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

// ── WHDC email templates ─────────────────────────────────────────────────
// The certificate/results/reminder emails are authored as plain-language
// Markdown files (one "Subject: …" line, blank line, then the body) rather
// than hardcoded HTML strings, so non-engineers can edit the copy without
// touching server code. Every send of a given kind re-reads and re-renders
// the same template — nothing is duplicated inline.
const EMAIL_TEMPLATES_DIR = path.join(__dirname, 'Challenge', 'email-templates');
const emailTemplateCache = {};

function loadEmailTemplateRaw(name) {
  if (emailTemplateCache[name]) return emailTemplateCache[name];
  const raw = fs.readFileSync(path.join(EMAIL_TEMPLATES_DIR, `${name}.md`), 'utf8');
  emailTemplateCache[name] = raw;
  return raw;
}

// Minimal Markdown → email-safe HTML: paragraphs, **bold**, [text](url) links
// and "- " bullet lists. Mirrors the admin broadcast composer's client-side
// renderer (Admin/broadcast.html `mdToHtml`) so template authors get the
// same formatting rules in either place.
function emailMarkdownToHtml(src) {
  const raw = String(src == null ? '' : src).trim();
  if (!raw) return '';
  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function inline(s) {
    return esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
        '<a href="$2" style="color:#2563eb;text-decoration:underline">$1</a>'
      );
  }
  const out = [];
  let para = [];
  let list = [];
  function flushPara() {
    if (para.length) {
      out.push(`<p style="margin:0 0 16px">${para.join('<br>')}</p>`);
      para = [];
    }
  }
  function flushList() {
    if (list.length) {
      out.push(
        `<ul style="margin:0 0 16px;padding-left:22px">${list
          .map(li => `<li style="margin:0 0 6px">${li}</li>`)
          .join('')}</ul>`
      );
      list = [];
    }
  }
  raw.split(/\r?\n/).forEach(ln => {
    const t = ln.trim();
    if (!t) {
      flushPara();
      flushList();
      return;
    }
    const m = t.match(/^[-*]\s+(.*)$/);
    if (m) {
      flushPara();
      list.push(inline(m[1]));
    } else {
      flushList();
      para.push(inline(t));
    }
  });
  flushPara();
  flushList();
  return (
    `<div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:15px;` +
    `line-height:1.7;color:#0f172a">${out.join('\n')}</div>`
  );
}

// Loads Challenge/email-templates/<name>.md, substitutes {{placeholders}}
// with `vars`, and returns { subject, html } ready for sendMail(). The first
// line must be "Subject: …"; everything after the following blank line is
// the Markdown body.
function renderEmailTemplate(name, vars) {
  const raw = loadEmailTemplateRaw(name);
  const lines = raw.split(/\r?\n/);
  let subject = '';
  let bodyStart = 0;
  if (lines.length && /^subject:/i.test(lines[0])) {
    subject = lines[0].replace(/^subject:/i, '').trim();
    bodyStart = 1;
    while (bodyStart < lines.length && lines[bodyStart].trim() === '') bodyStart++;
  }
  const body = lines.slice(bodyStart).join('\n');
  const sub = str =>
    String(str).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
      const v = vars ? vars[key] : undefined;
      return v === undefined || v === null ? '' : String(v);
    });
  return { subject: sub(subject), html: emailMarkdownToHtml(sub(body)) };
}

async function sendVerificationEmail({ email, fullName, token }) {
  const link = `${FRONTEND_URL}/Login-pages/verify-email.html?token=${token}`;
  await sendMail({
    to: email,
    subject: 'Verify your Rising Edge account',
    html: `<p>Hi ${fullName},</p><p>Thanks for registering!</p><p><a href="${link}" style="background:#1a56db;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Verify Email</a></p><p>Link expires in 24 hours.</p><p>Rising Edge Team</p>`,
  });
}

async function sendPasswordResetEmail({ email, fullName, token }) {
  const link = `${FRONTEND_URL}/Login-pages/forgot-password.html?token=${token}`;
  await sendMail({
    to: email,
    subject: 'Reset your Rising Edge password',
    html: `<p>Hi ${fullName},</p><p><a href="${link}" style="background:#1a56db;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Reset Password</a></p><p>Link expires in 1 hour.</p><p>Rising Edge Team</p>`,
  });
}

function issueAccessToken(userId, role) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: ACCESS_TTL });
}
function issueRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function verifyAccessToken(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, error: 'Access token required' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const { rows } = await db.query(
      `SELECT u.*, COALESCE(ts.plan_id, us.plan_id, 'basic') AS plan,
              COALESCE(us.status,'ACTIVE') AS sub_status
         FROM users u
         LEFT JOIN user_subscriptions us ON us.user_id = u.id
         LEFT JOIN tool_subscriptions ts ON ts.user_id = u.id AND ts.status = 'active'
         WHERE u.id = $1`,
      [payload.userId]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ success: false, error: 'User not found' });
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ success: false, error: 'Account suspended' });
    }
    if (user.status === 'DEACTIVATED') {
      return res.status(403).json({ success: false, error: 'Account deactivated' });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res
        .status(401)
        .json({ success: false, error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    next();
  };
}

const app = express();
app.set('trust proxy', 1);

// ── Canonical host redirect ────────────────────────────────────────────
// Defense-in-depth for the apex-domain leak: risingedgetech.com (no "www")
// was found redirecting to the raw Railway URL instead of the branded
// domain — that specific hop happens before traffic ever reaches this app
// (DNS/registrar-level forwarding or Railway's own fallback for an
// unregistered custom domain) and must be fixed in the Railway dashboard /
// DNS records, not here. But the raw *.up.railway.app hostname is directly
// reachable and serves full working content on its own, which is a
// duplicate-content path this app *can* close off. Any request that
// reaches this app on a host other than the canonical one gets a 301 to
// it, preserving the path/query. Skipped outside production so local dev
// (localhost, 127.0.0.1) is unaffected.
const CANONICAL_HOST = 'www.risingedgetech.com';
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const host = (req.hostname || '').toLowerCase();
    if (host && host !== CANONICAL_HOST) {
      return res.redirect(301, `https://${CANONICAL_HOST}${req.originalUrl}`);
    }
    if (req.protocol !== 'https') {
      return res.redirect(301, `https://${CANONICAL_HOST}${req.originalUrl}`);
    }
    next();
  });
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
// Serve sw.js with the header that allows it to control all paths under /
app.get('/sw.js', (req, res) => {
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'sw.js'));
});

// Serve manifest.json with correct MIME type
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(__dirname, 'manifest.json'));
});

// home.html used to be a client-side meta-refresh shell pointing at
// index.html — that left three separately-indexable URLs for one
// homepage (/, /index.html, /home.html) with no signal telling search
// engines which was authoritative. Replaced with a real 301 to the
// canonical root URL; registered before express.static so it wins over
// the physical file (still on disk, still self-canonicalizes to / as a
// defense-in-depth fallback, but no longer reachable in normal use).
app.get('/home.html', (req, res) => {
  res.redirect(301, '/');
});

/* ── Dynamic sitemap.xml ───────────────────────────────────────────────
 * Generated on request from the actual file tree + live jobs, so it never
 * goes stale as pages/courses/jobs are added. Registered BEFORE
 * express.static so it takes precedence over any stale sitemap.xml file.
 * A page is included only if robots.txt allows it (longest-match Allow vs
 * Disallow, same rule search engines use) and it isn't in a dev/private
 * directory. ACTIVE job detail pages are appended dynamically. */
const SITEMAP_BASE = (
  process.env.PUBLIC_SITE_URL ||
  process.env.SITEMAP_BASE ||
  'https://www.risingedgetech.com'
).replace(/\/+$/, '');

// Dev/build/private directories that robots.txt doesn't (need to) list but
// must never appear in the public sitemap.
const SITEMAP_DENY_PREFIXES = [
  '/node_modules/',
  '/tests/',
  '/scripts/',
  '/db/',
  '/lib/',
  '/__mocks__/',
  '/Recruiter/',
  '/docs/',
  '/ads/',
];
// Individually private pages that live under otherwise-public folders.
const SITEMAP_DENY_EXACT = new Set([
  '/Jobs/job.html', // bare template — per-job URLs are added dynamically
  '/Jobs/post.html', // recruiter-only
  '/Jobs/my-applications.html', // account page
  '/home.html', // now a 301 to / — not a distinct indexable page
]);

function loadRobotsRules() {
  try {
    const txt = fs.readFileSync(path.join(__dirname, 'robots.txt'), 'utf8');
    const allow = [];
    const disallow = [];
    txt.split(/\r?\n/).forEach(line => {
      const m = line.match(/^\s*(Allow|Disallow)\s*:\s*(\S+)/i);
      if (!m) {
        return;
      }
      const rule = m[2].replace(/\$$/, ''); // treat "…$" as a plain prefix
      if (m[1].toLowerCase() === 'allow') {
        allow.push(rule);
      } else if (rule) {
        disallow.push(rule);
      }
    });
    return { allow, disallow };
  } catch (e) {
    return { allow: [], disallow: [] };
  }
}

// Longest-match wins (Google's rule): a page is blocked only if the longest
// matching Disallow rule is more specific than the longest matching Allow.
function robotsAllows(urlPath, rules) {
  let bestAllow = -1;
  let bestDisallow = -1;
  rules.allow.forEach(p => {
    if (p && urlPath.indexOf(p) === 0) {
      bestAllow = Math.max(bestAllow, p.length);
    }
  });
  rules.disallow.forEach(p => {
    if (p && urlPath.indexOf(p) === 0) {
      bestDisallow = Math.max(bestDisallow, p.length);
    }
  });
  if (bestDisallow === -1) {
    return true;
  }
  return bestAllow >= bestDisallow;
}

function sitemapPriority(u) {
  if (u === '/') {
    return '1.0';
  }
  const top = [
    '/Trainings/trainings.html',
    '/Tools/tools.html',
    '/Jobs/index.html',
    '/about.html',
    '/subscription/plans.html',
    '/resources/resources.html',
  ];
  return top.indexOf(u) !== -1 ? '0.8' : '0.6';
}

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

app.get('/sitemap.xml', async (req, res) => {
  try {
    const rules = loadRobotsRules();
    const pages = walkSiteFiles(__dirname).pages; // relative paths, .html
    const entries = [];
    const seen = new Set();

    const add = (urlPath, lastmod) => {
      if (seen.has(urlPath)) {
        return;
      }
      seen.add(urlPath);
      entries.push({ url: urlPath, lastmod });
    };

    pages.forEach(rel => {
      const urlPath = rel === 'index.html' ? '/' : '/' + rel;
      if (SITEMAP_DENY_EXACT.has(urlPath)) {
        return;
      }
      if (SITEMAP_DENY_PREFIXES.some(p => urlPath.indexOf(p) === 0)) {
        return;
      }
      if (!robotsAllows(urlPath, rules)) {
        return;
      }
      let lastmod = null;
      try {
        lastmod = fs.statSync(path.join(__dirname, rel)).mtime.toISOString().slice(0, 10);
      } catch (e) {
        /* ignore */
      }
      add(urlPath, lastmod);
    });

    // Live ACTIVE job detail pages (best-effort — skip silently if DB is down).
    try {
      const { rows } = await db.query(
        `SELECT id, updated_at FROM jobs WHERE status='ACTIVE' ORDER BY updated_at DESC LIMIT 1000`
      );
      rows.forEach(j => {
        const lm = j.updated_at ? new Date(j.updated_at).toISOString().slice(0, 10) : null;
        add('/Jobs/job.html?id=' + encodeURIComponent(j.id), lm);
      });
    } catch (e) {
      /* DB unavailable — static pages still returned */
    }

    entries.sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));

    const body =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      entries
        .map(e => {
          return (
            '  <url>\n' +
            '    <loc>' +
            xmlEscape(SITEMAP_BASE + e.url) +
            '</loc>\n' +
            (e.lastmod ? '    <lastmod>' + e.lastmod + '</lastmod>\n' : '') +
            '    <priority>' +
            sitemapPriority(e.url) +
            '</priority>\n' +
            '  </url>\n'
          );
        })
        .join('') +
      '</urlset>\n';

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(body);
  } catch (err) {
    console.error('[sitemap.xml]', err);
    res.status(500).type('text/plain').send('Could not generate sitemap.');
  }
});

/* ── JobPosting structured data (Google for Jobs) ──────────────────────
 * The job detail page is a static shell that fetches its data client-side,
 * so search engines wouldn't see JobPosting markup. This route intercepts
 * /Jobs/job.html?id=<id>, injects a server-rendered JSON-LD block built from
 * the live job row, and serves the page. Without an id (or if the job/DB is
 * unavailable) it falls back to serving the static file unchanged. */
function buildJobPostingLd(job) {
  const empMap = {
    FULL_TIME: 'FULL_TIME',
    PART_TIME: 'PART_TIME',
    CONTRACT: 'CONTRACTOR',
    INTERNSHIP: 'INTERN',
  };
  const ld = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description_md || job.title,
    employmentType: empMap[job.employment_type] || 'FULL_TIME',
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company_name,
      logo: job.company_logo_url || undefined,
    },
    identifier: { '@type': 'PropertyValue', name: job.company_name, value: job.id },
    directApply: job.apply_mode !== 'EXTERNAL',
  };
  if (job.created_at) {
    ld.datePosted = new Date(job.created_at).toISOString().slice(0, 10);
  }
  const valid = job.deadline || job.remove_at;
  if (valid) {
    ld.validThrough = new Date(valid).toISOString().slice(0, 10);
  }
  if (job.work_mode === 'REMOTE') {
    ld.jobLocationType = 'TELECOMMUTE';
    ld.applicantLocationRequirements = { '@type': 'Country', name: 'India' };
  }
  if (job.location) {
    ld.jobLocation = {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.location,
        addressCountry: 'IN',
      },
    };
  }
  if (!job.salary_hidden && (job.salary_min || job.salary_max)) {
    const qv = { '@type': 'QuantitativeValue', unitText: 'YEAR' };
    if (job.salary_min && job.salary_max) {
      qv.minValue = job.salary_min;
      qv.maxValue = job.salary_max;
    } else {
      qv.value = job.salary_min || job.salary_max;
    }
    ld.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: job.salary_currency || 'INR',
      value: qv,
    };
  }
  return ld;
}

/* ── Social/Open-Graph meta + JobPosting injection for HTML pages ──────
 * Social scrapers (LinkedIn, WhatsApp, Slack, X) don't run JS, so OG/Twitter
 * tags must be in the served HTML. This middleware serves every .html page
 * itself (before express.static), injecting og and twitter tags derived from
 * the page's own <title>/description + a branded default image — only the
 * tags a page doesn't already declare, so per-page overrides are preserved.
 * For /Jobs/job.html?id it also injects the JobPosting JSON-LD and
 * job-specific share tags. Acts as the "shared header partial" a static site
 * otherwise lacks. */
const OG_SITE = 'https://www.risingedgetech.com';
const OG_IMAGE = OG_SITE + '/assets/og/og-default.png';
const OG_SITE_NAME = 'Rising Edge Technologies';
const _htmlCache = new Map(); // rel -> { mtimeMs, text }

// ── Organization + Course structured data ──────────────────────────────
// Organization goes on the homepage only (one entity per site). Course goes
// on each course's own detail page (required: name, description; recommended:
// provider) — see https://developers.google.com/search/docs/appearance/structured-data/course.
// That same page also requires an accompanying ItemList linking ≥3 course
// detail pages to be eligible for the "course list" rich result, which is
// injected on Trainings/trainings.html (the catalog/summary page) below.
const ORG_LOGO = OG_SITE + '/assets/icons/icon-512x512.png';
const ORG_SAMEAS = [
  'https://www.linkedin.com/in/rising-edge-tech/',
  'https://www.instagram.com/risingedgetech/',
];
function buildOrganizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: OG_SITE_NAME,
    url: OG_SITE + '/',
    logo: ORG_LOGO,
    description:
      'Precision hardware engineering, signal integrity training, and expert consultancy.',
    sameAs: ORG_SAMEAS,
  };
}
const COURSE_PROVIDER = { '@type': 'Organization', name: OG_SITE_NAME, sameAs: OG_SITE + '/' };

// Real, single-subject course detail pages only — excludes
// Trainings/FPGA/index.html, which is a category hub listing multiple FPGA
// courses ("FPGA Academy"), not a course itself.
const COURSE_PAGES = [
  'Trainings/Circuit/DDR4/index.html',
  'Trainings/Circuit/FPGA-Power/index.html',
  'Trainings/Circuit/I2C/index.html',
  'Trainings/Circuit/Interfaces/index.html',
  'Trainings/Circuit/Optocoupler/index.html',
  'Trainings/EMI/CE/index.html',
  'Trainings/EMI/EFT-Burst/index.html',
  'Trainings/EMI/ESD/index.html',
  'Trainings/EMI/Pre-Comp/index.html',
  'Trainings/EMI/RE/index.html',
  'Trainings/EMI/RI/index.html',
  'Trainings/EMI/Surge/index.html',
  'Trainings/FPGA/Fundamentals-and-architecture/index.html',
  'Trainings/HeatSink/index.html',
  'Trainings/SI/index.html',
];
const COURSE_PAGE_SET = new Set(COURSE_PAGES);
function courseNameFromTitle(title) {
  return String(title || '')
    .replace(/\s*\|[^|]*$/, '')
    .trim();
}
let _courseCatalogCache = null;
function getCourseCatalog() {
  if (_courseCatalogCache) {
    return _courseCatalogCache;
  }
  _courseCatalogCache = COURSE_PAGES.map(rel => {
    try {
      const html = fs.readFileSync(path.join(__dirname, rel), 'utf8');
      const title = firstMatch(/<title>([\s\S]*?)<\/title>/i, html);
      const description = firstMatch(
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
        html
      );
      return {
        name: courseNameFromTitle(title),
        description,
        url: OG_SITE + '/' + path.dirname(rel) + '/',
      };
    } catch (e) {
      return null;
    }
  }).filter(Boolean);
  return _courseCatalogCache;
}

// GA4 analytics — injected into every served page's <head> when a Measurement
// ID is configured (env GA_MEASUREMENT_ID, e.g. G-XXXXXXXXXX). Dormant until
// set, so nothing loads/breaks without it. Link the property to the already-
// verified Search Console in the GA4 UI for query-level acquisition data.
const GA_ID = (process.env.GA_MEASUREMENT_ID || '').trim();

// Google Consent Mode v2 bootstrap — injected at the very top of <head> on
// every page (governs both AdSense and GA). Storage-based consent starts
// DENIED; a prior "granted" choice (localStorage) is restored on load, and
// the cookie banner in core.js flips it to granted on Accept. gtag/dataLayer
// are defined here so this works even when GA is not configured.
function consentBootstrap() {
  return (
    '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}' +
    "gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied'," +
    "ad_personalization:'denied',analytics_storage:'denied'," +
    "functionality_storage:'granted',security_storage:'granted',wait_for_update:500});" +
    "try{if(localStorage.getItem('re-consent')==='granted'){gtag('consent','update'," +
    "{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted'," +
    "analytics_storage:'granted'});}}catch(e){}</script>"
  );
}

function gaSnippet() {
  if (!/^G-[A-Z0-9]+$/i.test(GA_ID)) {
    return '';
  }
  // gtag() is already defined by the consent bootstrap above.
  return (
    '<script async src="https://www.googletagmanager.com/gtag/js?id=' +
    GA_ID +
    '"></script>\n' +
    "    <script>gtag('js',new Date());gtag('config','" +
    GA_ID +
    "');</script>"
  );
}

function ogEscape(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function firstMatch(re, s) {
  const m = s.match(re);
  return m ? m[1].trim() : '';
}
function buildMetaBlock(html, opts) {
  const title = opts.title || firstMatch(/<title>([\s\S]*?)<\/title>/i, html) || OG_SITE_NAME;
  const desc =
    opts.description ||
    firstMatch(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i, html) ||
    '';
  const canonical =
    firstMatch(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i, html) || opts.url;
  const image = opts.image || OG_IMAGE;
  const type = opts.type || 'website';
  const want = [
    ['property', 'og:title', title],
    ['property', 'og:description', desc],
    ['property', 'og:type', type],
    ['property', 'og:url', canonical],
    ['property', 'og:site_name', OG_SITE_NAME],
    ['property', 'og:image', image],
    ['property', 'og:image:width', '1200'],
    ['property', 'og:image:height', '630'],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', title],
    ['name', 'twitter:description', desc],
    ['name', 'twitter:image', image],
  ];
  const lines = [];
  want.forEach(t => {
    const attr = t[0];
    const key = t[1];
    const val = t[2];
    if (!val) {
      return;
    }
    // Skip tags the page already declares (respect per-page overrides).
    const present = new RegExp(attr + '=["\']' + key.replace(/:/g, ':') + '["\']').test(html);
    if (present) {
      return;
    }
    // HTML-extracted values are already entity-encoded; only guard quotes.
    // DB-derived values are pre-escaped by ogEscape() before reaching here.
    lines.push(
      '    <meta ' +
        attr +
        '="' +
        key +
        '" content="' +
        String(val).replace(/"/g, '&quot;') +
        '" />'
    );
  });
  return lines.join('\n');
}

function resolveHtmlRel(p) {
  if (p === '/') {
    return 'index.html';
  }
  if (p.charAt(p.length - 1) === '/') {
    return p.slice(1) + 'index.html';
  }
  if (/\.html?$/i.test(p)) {
    return p.slice(1);
  }
  return null;
}

app.get('*', async (req, res, next) => {
  if (req.path.indexOf('/api/') === 0) {
    return next();
  }
  let p = req.path;
  try {
    p = decodeURIComponent(req.path);
  } catch (e) {
    /* keep raw */
  }
  const rel = resolveHtmlRel(p);
  if (!rel || rel.indexOf('..') !== -1) {
    return next();
  }
  const file = path.join(__dirname, rel);
  let stat;
  try {
    stat = fs.statSync(file);
    if (!stat.isFile()) {
      return next();
    }
  } catch (e) {
    return next(); // not a real file — let static/404 handle
  }
  try {
    const cached = _htmlCache.get(rel);
    let html;
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      html = cached.text;
    } else {
      html = fs.readFileSync(file, 'utf8');
      _htmlCache.set(rel, { mtimeMs: stat.mtimeMs, text: html });
    }

    // Consent Mode v2 bootstrap must run before AdSense/GA — inject it right
    // after the opening <head> tag (idempotent).
    if (html.indexOf("gtag('consent'") === -1) {
      html = html.replace(/<head(\s[^>]*)?>/i, m => m + '\n    ' + consentBootstrap());
    }

    const inserts = [];
    const ogOpts = {
      url: OG_SITE + p,
      type: /^Trainings\/|^resources\//.test(rel) ? 'article' : 'website',
    };

    // GA4 first so it's high in <head>.
    const ga = gaSnippet();
    if (ga && html.indexOf('googletagmanager.com/gtag/js') === -1) {
      inserts.push(ga);
    }

    // Job detail: unique <title>/description + JobPosting JSON-LD + share card.
    if (rel === 'Jobs/job.html' && req.query && req.query.id) {
      try {
        const { rows } = await db.query(
          `SELECT j.*, u.full_name AS posted_by_name
             FROM jobs j JOIN users u ON u.id = j.posted_by
            WHERE j.id = $1 AND j.status = 'ACTIVE'`,
          [req.query.id]
        );
        if (rows.length) {
          const job = rows[0];
          const descSnippet = String(job.description_md || '')
            .replace(/[#*_`>]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 155);
          const pageTitle =
            job.title +
            ' at ' +
            job.company_name +
            (job.location ? ' — ' + job.location : '') +
            ' | Rising Edge Jobs';
          const pageDesc =
            (job.location ? job.location + ' · ' : '') +
            (job.work_mode || '').replace(/_/g, ' ').toLowerCase() +
            ' · ' +
            descSnippet;
          // Rewrite the static duplicate <title> and description with per-job text.
          html = html.replace(
            /<title>[\s\S]*?<\/title>/i,
            '<title>' + ogEscape(pageTitle) + '</title>'
          );
          if (/<meta[^>]+name=["']description["'][^>]*>/i.test(html)) {
            html = html.replace(
              /(<meta[^>]+name=["']description["'][^>]+content=)(["'])[\s\S]*?\2/i,
              '$1$2' + ogEscape(pageDesc) + '$2'
            );
          } else {
            html = html.replace(
              '</head>',
              '<meta name="description" content="' + ogEscape(pageDesc) + '" />\n  </head>'
            );
          }
          const jjson = JSON.stringify(buildJobPostingLd(job)).replace(/</g, '\\u003c');
          inserts.push('<script type="application/ld+json">' + jjson + '</script>');
          ogOpts.type = 'website';
          ogOpts.title = ogEscape(pageTitle);
          ogOpts.description = ogEscape(pageDesc);
        }
      } catch (e) {
        /* DB down — still inject default OG below */
      }
    }

    // Fallback <meta name="description"> for pages that ship without one, so
    // search engines never fall back to a scraped snippet. Derived from the
    // page's own H1/title; per-page written descriptions always take priority.
    if (!/<meta[^>]+name=["']description["']/i.test(html)) {
      const hh = firstMatch(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html)
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const tt = firstMatch(/<title>([\s\S]*?)<\/title>/i, html)
        .replace(/\s*[|·-].*Rising Edge.*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      const lead = hh || tt || OG_SITE_NAME;
      const fallbackDesc = (
        lead +
        ' — Rising Edge Technologies: hardware engineering training, tools and jobs across signal integrity, power integrity, EMC and FPGA.'
      ).slice(0, 200);
      html = html.replace(
        '</head>',
        '<meta name="description" content="' + ogEscape(fallbackDesc) + '" />\n  </head>'
      );
    }

    // Organization schema — homepage only.
    if (rel === 'index.html') {
      const orgJson = JSON.stringify(buildOrganizationLd()).replace(/</g, '\\u003c');
      inserts.push('<script type="application/ld+json">' + orgJson + '</script>');
    }

    // Course schema — each course's own detail page.
    if (COURSE_PAGE_SET.has(rel)) {
      const courseTitle = firstMatch(/<title>([\s\S]*?)<\/title>/i, html);
      const courseDesc = firstMatch(
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
        html
      );
      const courseLd = {
        '@context': 'https://schema.org',
        '@type': 'Course',
        name: courseNameFromTitle(courseTitle),
        description: courseDesc,
        provider: COURSE_PROVIDER,
        url: OG_SITE + '/' + path.dirname(rel) + '/',
      };
      const courseJson = JSON.stringify(courseLd).replace(/</g, '\\u003c');
      inserts.push('<script type="application/ld+json">' + courseJson + '</script>');
    }

    // Course list (ItemList) — the catalog/summary page. Required alongside
    // the individual Course markup above for the course-list rich result:
    // Google needs an ItemList linking at least 3 course detail pages.
    if (rel === 'Trainings/trainings.html') {
      const catalog = getCourseCatalog();
      const itemListLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: catalog.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: c.url,
          item: {
            '@type': 'Course',
            name: c.name,
            description: c.description,
            url: c.url,
            provider: COURSE_PROVIDER,
          },
        })),
      };
      const itemListJson = JSON.stringify(itemListLd).replace(/</g, '\\u003c');
      inserts.push('<script type="application/ld+json">' + itemListJson + '</script>');
    }

    const metaBlock = buildMetaBlock(html, ogOpts);
    if (metaBlock) {
      inserts.push(metaBlock.trim());
    }
    if (inserts.length) {
      html = html.replace('</head>', inserts.join('\n    ') + '\n  </head>');
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    console.error('[html-meta]', err.message);
    return next();
  }
});

/* ── Block internal source/config/data files from being served ─────────
 * express.static below serves the whole repo root, so without this guard any
 * source, config, schema, or working file would be publicly downloadable
 * (server.js, *.bak, db/*.sql, package.json, stray *.xlsx, etc.). This 404s
 * any request that resolves to a non-public file BEFORE it reaches static. */
const STATIC_DENY_DIRS = [
  '/db/',
  '/scripts/',
  '/tests/',
  '/__mocks__/',
  '/lib/',
  '/architecture/',
  '/docs/',
];
const STATIC_DENY_EXTS = new Set([
  '.bak',
  '.bin',
  '.sql',
  '.sh',
  '.toml',
  '.cjs',
  '.yml',
  '.yaml',
  '.lock',
  '.md',
  '.xlsx',
  '.xls',
]);
const STATIC_DENY_FILES = new Set([
  '/server.js',
  '/server.js.bak',
  '/package.json',
  '/package-lock.json',
  '/dockerfile',
  '/project_summary.txt',
  '/tmp_test_crosstalk.js',
  '/playwright.config.js',
]);
function isBlockedStaticPath(p) {
  const lower = p.toLowerCase();
  const base = lower.slice(lower.lastIndexOf('/') + 1);
  if (base.indexOf('~$') === 0) {
    return true; // Office lock files (~$foo.xlsx)
  }
  if (STATIC_DENY_FILES.has(lower)) {
    return true;
  }
  const dot = base.lastIndexOf('.');
  if (dot >= 0 && STATIC_DENY_EXTS.has(base.slice(dot))) {
    return true;
  }
  return STATIC_DENY_DIRS.some(d => lower.indexOf(d) === 0);
}
app.use((req, res, next) => {
  if (req.path.indexOf('/api/') === 0) {
    return next(); // API routes are handled by their own handlers below
  }
  let p = req.path;
  try {
    p = decodeURIComponent(req.path);
  } catch (e) {
    /* keep raw path */
  }
  if (isBlockedStaticPath(p)) {
    return res.status(404).type('text/plain').send('Not found');
  }
  next();
});

// .well-known must stay reachable (e.g. assetlinks.json, ACME, security.txt)
// even though the main static handler denies dotfiles.
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));

app.use(express.static(path.join(__dirname, '.'), { dotfiles: 'deny' }));

/* ── Site Health: full-site file discovery ─────────────────────────────
 * Powers Admin/site-health's "Run Audit" button — walks the same tree
 * express.static serves above, so the health tool auto-discovers every
 * page/CSS/JS/image file instead of relying on a hand-maintained list
 * that silently goes stale as new pages get added. Read-only, and every
 * path it returns is already publicly fetchable as a static file, so
 * this is intentionally left ungated (matches the tool's current
 * unauthenticated usage) rather than requiring an admin bearer token. */
const SITE_SCAN_EXCLUDE_DIRS = new Set(['node_modules', '.git', '.github', '.vscode', '.claude']);
const SITE_SCAN_EXT = {
  page: new Set(['.html', '.htm']),
  css: new Set(['.css']),
  js: new Set(['.js']),
  image: new Set(['.png', '.jpg', '.jpeg', '.svg', '.ico', '.gif', '.webp']),
};

function walkSiteFiles(rootDir) {
  const out = { pages: [], css: [], js: [], images: [] };

  (function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      return; // unreadable directory — skip rather than fail the whole scan
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue; // dotfiles/dotdirs
      if (entry.isDirectory()) {
        if (SITE_SCAN_EXCLUDE_DIRS.has(entry.name)) continue;
        walk(path.join(dir, entry.name));
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      const rel = path.relative(rootDir, path.join(dir, entry.name)).split(path.sep).join('/');
      if (SITE_SCAN_EXT.page.has(ext)) out.pages.push(rel);
      else if (SITE_SCAN_EXT.css.has(ext)) out.css.push(rel);
      else if (SITE_SCAN_EXT.js.has(ext)) out.js.push(rel);
      else if (SITE_SCAN_EXT.image.has(ext)) out.images.push(rel);
    }
  })(rootDir);

  out.pages.sort();
  out.css.sort();
  out.js.sort();
  out.images.sort();
  return out;
}

// Short cache so clicking "Run Audit" a few times in a row doesn't re-walk
// the whole tree from disk each time.
let _siteScanCache = null;
let _siteScanCacheAt = 0;
const SITE_SCAN_CACHE_MS = 30 * 1000;

app.get('/api/site-health/scan', (req, res) => {
  try {
    const now = Date.now();
    if (!_siteScanCache || now - _siteScanCacheAt > SITE_SCAN_CACHE_MS) {
      _siteScanCache = walkSiteFiles(__dirname);
      _siteScanCacheAt = now;
    }
    res.json({ success: true, ..._siteScanCache, scannedAt: _siteScanCacheAt });
  } catch (err) {
    console.error('[site-health/scan]', err);
    res.status(500).json({ success: false, error: 'Could not scan site files.' });
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts.' },
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many registration attempts.' },
});
const forgotPwdLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many reset requests.' },
});
// WHDC: limit attempt start/submit to curb abuse (generous for normal use).
const whdcAttemptLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many challenge requests — please slow down.' },
});

/* ── Refresh-token cookie helpers ────────────────────────────────── */
function setRefreshCookie(res, token) {
  const maxAge = REFRESH_TTL_DAYS * 24 * 60 * 60;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `re_refresh=${token}; HttpOnly; SameSite=Strict; Path=/api/auth; Max-Age=${maxAge}${secure}`
  );
}
function clearRefreshCookie(res) {
  res.setHeader('Set-Cookie', 're_refresh=; HttpOnly; SameSite=Strict; Path=/api/auth; Max-Age=0');
}
function parseRefreshCookie(req) {
  const header = req.headers.cookie || '';
  const match = header.match(/(?:^|;\s*)re_refresh=([^;]+)/);
  return match ? match[1] : null;
}

const auth = express.Router();

auth.post('/register', registerLimiter, async (req, res) => {
  try {
    const { fullName, email, password, mobile, location, currentRole } = req.body;
    if (!fullName || !email || !password) {
      return res
        .status(422)
        .json({ success: false, error: 'fullName, email and password are required.' });
    }
    if (password.length < 8) {
      return res
        .status(422)
        .json({ success: false, error: 'Password must be at least 8 characters.' });
    }
    const existing = await db.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (existing.rows.length) {
      return res.status(409).json({ success: false, error: 'Email already registered.' });
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');
    const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const { rows } = await db.query(
      `INSERT INTO users (full_name,email,password_hash,email_verify_token,email_verify_expiry,mobile,location,"current_role")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [
        fullName,
        email.toLowerCase(),
        passwordHash,
        emailVerifyToken,
        emailVerifyExpiry,
        mobile || null,
        location || null,
        currentRole || null,
      ]
    );
    await db.query(
      `INSERT INTO user_subscriptions (user_id,plan_id) VALUES ($1,'basic') ON CONFLICT DO NOTHING`,
      [rows[0].id]
    );
    if (!RESEND_API_KEY) {
      // No email server — auto-verify immediately
      await db.query(
        `UPDATE users SET email_verified=true, status='ACTIVE', email_verify_token=NULL, email_verify_expiry=NULL WHERE id=$1`,
        [rows[0].id]
      );
      return res
        .status(201)
        .json({ success: true, message: 'Account created. You can now sign in.' });
    }
    // Try to send verification email; if SMTP fails, auto-verify so user isn't locked out
    try {
      await sendVerificationEmail({
        email: email.toLowerCase(),
        fullName,
        token: emailVerifyToken,
      });
      res
        .status(201)
        .json({ success: true, message: 'Account created. Check your email to verify.' });
    } catch (emailErr) {
      console.warn('[register] SMTP failed, auto-verifying:', emailErr.message);
      await db.query(
        `UPDATE users SET email_verified=true, status='ACTIVE', email_verify_token=NULL, email_verify_expiry=NULL WHERE id=$1`,
        [rows[0].id]
      );
      res.status(201).json({ success: true, message: 'Account created. You can now sign in.' });
    }
  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ success: false, error: 'Registration failed.' });
  }
});

auth.post('/login', loginLimiter, async (req, res) => {
  const ip = req.ip;
  const ua = req.headers['user-agent'] || '';
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(422).json({ success: false, error: 'Email and password are required.' });
    }
    const { rows } = await db.query(
      `SELECT u.*, COALESCE(ts.plan_id, us.plan_id, 'basic') AS plan
         FROM users u
         LEFT JOIN user_subscriptions us ON us.user_id = u.id
         LEFT JOIN tool_subscriptions ts ON ts.user_id = u.id AND ts.status = 'active'
         WHERE u.email = $1`,
      [email.toLowerCase()]
    );
    const user = rows[0];
    // Check account lock before running bcrypt — no point hashing if the account is locked.
    // Note: we only short-circuit for existing locked accounts; non-existent users still fall
    // through to the dummy bcrypt.compare below to prevent timing-based account enumeration.
    if (user && user.locked_until && new Date(user.locked_until) > new Date()) {
      const mins = Math.ceil((new Date(user.locked_until) - Date.now()) / 60000);
      return res
        .status(429)
        .json({ success: false, error: `Account locked. Try again in ${mins} minute(s).` });
    }
    const hashToCompare = user?.password_hash || '$2b$12$invalid.hash.for.timing.attack.prevention';
    const match = await bcrypt.compare(password, hashToCompare);
    if (!user || !match) {
      if (user) {
        const attempts = (user.failed_login_attempts || 0) + 1;
        const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
        await db.query('UPDATE users SET failed_login_attempts=$1,locked_until=$2 WHERE id=$3', [
          attempts,
          lockUntil,
          user.id,
        ]);
        await db.query(
          'INSERT INTO login_history (user_id,ip_address,user_agent,success) VALUES ($1,$2,$3,false)',
          [user.id, ip, ua]
        );
      }
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }
    if (!user.email_verified) {
      return res.status(403).json({
        success: false,
        error: 'Please verify your email address before signing in.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ success: false, error: 'Account suspended.' });
    }
    const accessToken = issueAccessToken(user.id, user.role);
    const refreshToken = issueRefreshToken();
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86400 * 1000);
    await db.query(
      `INSERT INTO refresh_tokens (user_id,token_hash,ip_address,device_info,expires_at) VALUES ($1,$2,$3,$4,$5)`,
      [user.id, tokenHash, ip, ua, expiresAt]
    );
    await db.query(
      'UPDATE users SET failed_login_attempts=0,locked_until=NULL,last_login_at=NOW() WHERE id=$1',
      [user.id]
    );
    await db.query(
      'INSERT INTO login_history (user_id,ip_address,user_agent,success) VALUES ($1,$2,$3,true)',
      [user.id, ip, ua]
    );
    setRefreshCookie(res, refreshToken);
    res.json({
      success: true,
      accessToken,
      expiresIn: 15 * 60,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        plan: user.plan || 'basic',
        avatarUrl: user.avatar_url,
      },
    });
  } catch (err) {
    console.error('[login]', err);
    // Never expose raw DB / infra error messages (e.g. quota limits) to users.
    const userMsg =
      err.message &&
      (err.message.toLowerCase().includes('quota') ||
        err.message.toLowerCase().includes('connection') ||
        err.message.toLowerCase().includes('compute'))
        ? 'Service temporarily unavailable. Please try again in a few minutes.'
        : 'Something went wrong. Please try again.';
    res.status(500).json({ success: false, error: userMsg });
  }
});

auth.post('/refresh', async (req, res) => {
  try {
    const refreshToken = parseRefreshCookie(req) || req.body.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, error: 'Refresh token required.' });
    }
    const tokenHash = hashToken(refreshToken);
    const { rows } = await db.query(
      `SELECT rt.*, u.role, u.status, u.full_name, u.email,
              COALESCE(ts.plan_id, us.plan_id, 'basic') AS plan
         FROM refresh_tokens rt
         JOIN users u ON u.id=rt.user_id
         LEFT JOIN user_subscriptions us ON us.user_id=u.id
         LEFT JOIN tool_subscriptions ts ON ts.user_id=u.id AND ts.status='active'
         WHERE rt.token_hash=$1`,
      [tokenHash]
    );
    const record = rows[0];
    if (!record || new Date(record.expires_at) < new Date()) {
      if (record) await db.query('DELETE FROM refresh_tokens WHERE token_hash=$1', [tokenHash]);
      return res
        .status(401)
        .json({ success: false, error: 'Session expired.', code: 'SESSION_EXPIRED' });
    }
    if (record.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, error: 'Account is no longer active.' });
    }
    const newRefreshToken = issueRefreshToken();
    const newHash = hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86400 * 1000);
    await db.query('DELETE FROM refresh_tokens WHERE token_hash=$1', [tokenHash]);
    await db.query(
      `INSERT INTO refresh_tokens (user_id,token_hash,ip_address,device_info,expires_at) VALUES ($1,$2,$3,$4,$5)`,
      [record.user_id, newHash, req.ip, req.headers['user-agent'] || '', expiresAt]
    );
    const accessToken = issueAccessToken(record.user_id, record.role);
    setRefreshCookie(res, newRefreshToken);
    res.json({
      success: true,
      accessToken,
      expiresIn: 15 * 60,
      user: {
        id: record.user_id,
        fullName: record.full_name,
        email: record.email,
        role: record.role,
        plan: record.plan || 'basic',
      },
    });
  } catch (err) {
    console.error('[refresh]', err);
    res.status(500).json({ success: false, error: 'Could not refresh session.' });
  }
});

auth.post('/logout', async (req, res) => {
  try {
    const refreshToken = parseRefreshCookie(req) || req.body.refreshToken;
    if (refreshToken) {
      await db.query('DELETE FROM refresh_tokens WHERE token_hash=$1', [hashToken(refreshToken)]);
    }
    clearRefreshCookie(res);
    res.json({ success: true, message: 'Logged out.' });
  } catch (err) {
    console.error('[logout]', err);
    res.status(500).json({ success: false, error: 'Logout failed.' });
  }
});

auth.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(422).json({ success: false, error: 'Token required.' });
    const { rows } = await db.query(
      `SELECT id FROM users WHERE email_verify_token=$1 AND email_verify_expiry > NOW()`,
      [token]
    );
    if (!rows.length) {
      return res
        .status(400)
        .json({ success: false, error: 'Verification link is invalid or expired.' });
    }
    await db.query(
      `UPDATE users SET email_verified=true, status='ACTIVE', email_verify_token=NULL, email_verify_expiry=NULL, updated_at=NOW() WHERE id=$1`,
      [rows[0].id]
    );
    res.json({ success: true, message: 'Email verified. You can now log in.' });
  } catch (err) {
    console.error('[verifyEmail]', err);
    res.status(500).json({ success: false, error: 'Verification failed.' });
  }
});

auth.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    const { rows } = await db.query('SELECT * FROM users WHERE email=$1', [email?.toLowerCase()]);
    const user = rows[0];
    if (!user || user.email_verified) {
      return res.json({ success: true, message: 'If registered, a new link has been sent.' });
    }
    if (!RESEND_API_KEY) {
      await db.query(
        `UPDATE users SET email_verified=true, status='ACTIVE', email_verify_token=NULL, email_verify_expiry=NULL, updated_at=NOW() WHERE id=$1`,
        [user.id]
      );
      return res.json({ success: true, message: 'Email verified. You can now log in.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.query(
      'UPDATE users SET email_verify_token=$1,email_verify_expiry=$2,updated_at=NOW() WHERE id=$3',
      [token, expiry, user.id]
    );
    await sendVerificationEmail({ email: user.email, fullName: user.full_name, token });
    res.json({ success: true, message: 'If registered, a new link has been sent.' });
  } catch (err) {
    console.error('[resendVerification]', err);
    res.status(500).json({ success: false, error: 'Could not resend verification.' });
  }
});

auth.post('/forgot-password', forgotPwdLimiter, async (req, res) => {
  const silentOK = { success: true, message: 'If registered, a reset link has been sent.' };
  try {
    const { email } = req.body;
    const { rows } = await db.query('SELECT * FROM users WHERE email=$1', [email?.toLowerCase()]);
    const user = rows[0];
    if (!user) return res.json(silentOK);
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000);
    await db.query(
      'UPDATE users SET password_reset_token=$1,password_reset_expiry=$2,updated_at=NOW() WHERE id=$3',
      [token, expiry, user.id]
    );
    await sendPasswordResetEmail({ email: user.email, fullName: user.full_name, token });
    res.json(silentOK);
  } catch (err) {
    console.error('[forgotPassword]', err);
    res.status(500).json({ success: false, error: 'Request failed.' });
  }
});

auth.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(422).json({ success: false, error: 'Token and newPassword required.' });
    }
    if (newPassword.length < 8) {
      return res
        .status(422)
        .json({ success: false, error: 'Password must be at least 8 characters.' });
    }
    const { rows } = await db.query(
      `SELECT id FROM users WHERE password_reset_token=$1 AND password_reset_expiry > NOW()`,
      [token]
    );
    if (!rows.length) {
      return res.status(400).json({ success: false, error: 'Reset link is invalid or expired.' });
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await db.query(
      `UPDATE users SET password_hash=$1,password_reset_token=NULL,password_reset_expiry=NULL,updated_at=NOW() WHERE id=$2`,
      [passwordHash, rows[0].id]
    );
    await db.query('DELETE FROM refresh_tokens WHERE user_id=$1', [rows[0].id]);
    res.json({ success: true, message: 'Password reset. Please log in.' });
  } catch (err) {
    console.error('[resetPassword]', err);
    res.status(500).json({ success: false, error: 'Password reset failed.' });
  }
});

auth.post('/change-password', verifyAccessToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res
        .status(422)
        .json({ success: false, error: 'currentPassword and newPassword required.' });
    }
    const match = await bcrypt.compare(currentPassword, req.user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect.' });
    }
    if (newPassword.length < 8) {
      return res
        .status(422)
        .json({ success: false, error: 'New password must be at least 8 characters.' });
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await db.query('UPDATE users SET password_hash=$1,updated_at=NOW() WHERE id=$2', [
      passwordHash,
      req.user.id,
    ]);
    res.json({ success: true, message: 'Password changed.' });
  } catch (err) {
    console.error('[changePassword]', err);
    res.status(500).json({ success: false, error: 'Password change failed.' });
  }
});

auth.get('/me', verifyAccessToken, (req, res) => {
  const u = req.user;
  res.json({
    success: true,
    user: {
      id: u.id,
      fullName: u.full_name,
      email: u.email,
      role: u.role,
      plan: u.plan || 'basic',
      avatarUrl: u.avatar_url,
      status: u.status,
      mobile: u.mobile || null,
      location: u.location || null,
      currentRole: u.current_role || null,
      org: u.org || null,
      jobTitle: u.job_title || null,
      linkedinUrl: u.linkedin_url || null,
      skills: u.skills || [],
      jobSearchStatus: u.job_search_status || null,
      noticePeriod: u.notice_period || null,
      yearsExperience: u.years_experience != null ? Number(u.years_experience) : null,
      lastLoginAt: u.last_login_at || null,
    },
  });
});

const JOB_SEARCH_STATUSES = ['NOT_LOOKING', 'OPEN', 'ACTIVELY_LOOKING'];
const NOTICE_PERIODS = [
  'IMMEDIATE',
  '15_DAYS',
  '1_MONTH',
  '2_MONTHS',
  '3_MONTHS',
  'MORE_THAN_3_MONTHS',
];

auth.put('/profile', verifyAccessToken, async (req, res) => {
  const {
    fullName,
    org,
    jobTitle,
    linkedinUrl,
    mobile,
    location,
    currentRole,
    skills,
    jobSearchStatus,
    noticePeriod,
    yearsExperience,
  } = req.body;
  // Normalise skills into a clean string array (accepts array or comma string)
  let skillsArr = null;
  if (Array.isArray(skills)) {
    skillsArr = skills;
  } else if (typeof skills === 'string') {
    skillsArr = skills.split(',');
  }
  if (skillsArr) {
    skillsArr = skillsArr
      .map(s => String(s).trim())
      .filter(Boolean)
      .slice(0, 40);
  }
  // Job-seeker fields — validate against the allowed enums / a sane numeric range
  // rather than trusting the client, since these will eventually be recruiter-facing.
  const jobStatusVal = JOB_SEARCH_STATUSES.includes(jobSearchStatus) ? jobSearchStatus : null;
  const noticePeriodVal = NOTICE_PERIODS.includes(noticePeriod) ? noticePeriod : null;
  let yearsExpVal = null;
  if (yearsExperience !== undefined && yearsExperience !== null && yearsExperience !== '') {
    const n = Number(yearsExperience);
    if (Number.isFinite(n) && n >= 0 && n <= 60) yearsExpVal = n;
  }
  try {
    const { rows } = await db.query(
      `UPDATE users SET
         full_name    = COALESCE(NULLIF($1,''), full_name),
         org          = $2,
         job_title    = $3,
         linkedin_url = $4,
         mobile       = COALESCE(NULLIF($5,''), mobile),
         location     = COALESCE(NULLIF($6,''), location),
         "current_role" = COALESCE(NULLIF($7,''), "current_role"),
         skills       = COALESCE($8, skills),
         job_search_status = $9,
         notice_period      = $10,
         years_experience   = $11,
         updated_at   = NOW()
       WHERE id=$12
       RETURNING id,full_name,email,role,org,job_title,linkedin_url,mobile,location,"current_role",
                 skills,job_search_status,notice_period,years_experience`,
      [
        fullName || null,
        org || null,
        jobTitle || null,
        linkedinUrl || null,
        mobile || null,
        location || null,
        currentRole || null,
        skillsArr,
        jobStatusVal,
        noticePeriodVal,
        yearsExpVal,
        req.user.id,
      ]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'User not found.' });
    const u = rows[0];
    res.json({
      success: true,
      user: {
        id: u.id,
        fullName: u.full_name,
        email: u.email,
        role: u.role,
        org: u.org || null,
        jobTitle: u.job_title || null,
        linkedinUrl: u.linkedin_url || null,
        mobile: u.mobile || null,
        location: u.location || null,
        currentRole: u.current_role || null,
        skills: u.skills || [],
        jobSearchStatus: u.job_search_status || null,
        noticePeriod: u.notice_period || null,
        yearsExperience: u.years_experience != null ? Number(u.years_experience) : null,
      },
    });
  } catch (err) {
    console.error('[auth/profile]', err);
    res.status(500).json({ success: false, error: 'Could not update profile.' });
  }
});

app.use('/api/auth', auth);

/* ── User activity & profile overview ─────────────────────────────────
 * Powers the redesigned dashboard (visit counts + last login) and the
 * profile / certificates-and-badges pages (profile fields, skills, earned
 * course certificates, earned badges). Admins, super-admins and recruiters
 * can view any user's overview; everyone else only their own. */

// GET /api/me/activity — total page-view counts by area + last login (self)
app.get('/api/me/activity', verifyAccessToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE path ILIKE '/Trainings/%' OR path ILIKE 'Trainings/%')  AS trainings,
         COUNT(*) FILTER (WHERE path ILIKE '/resources/%' OR path ILIKE 'resources/%')  AS resources,
         COUNT(*) FILTER (WHERE path ILIKE '/Tools/%'     OR path ILIKE 'Tools/%')      AS tools
       FROM page_views WHERE user_id = $1`,
      [req.user.id]
    );
    const c = rows[0] || {};
    res.json({
      success: true,
      data: {
        trainings: Number(c.trainings || 0),
        resources: Number(c.resources || 0),
        tools: Number(c.tools || 0),
        lastLoginAt: req.user.last_login_at || null,
      },
    });
  } catch (err) {
    console.error('[me/activity]', err);
    res.status(500).json({ success: false, error: 'Could not load activity.' });
  }
});

// GET /api/me/training-summary — per-course module completion counts + dates
// Merges the two training-progress systems in use across the site:
//  - module_progress: older system, powers FPGA/Fundamentals-and-architecture + SI/*
//  - training_progress: newer system (course_id like "Circuit/DDR4"), powers all
//    other lesson-based courses (DDR4, FPGA-Power, I2C, Interfaces, Optocoupler,
//    EMI/CE, EMI/ESD, EMI/RE, EMI/Surge, HeatSink)
app.get('/api/me/training-summary', verifyAccessToken, async (req, res) => {
  try {
    const [{ rows: oldRows }, { rows: newRows }] = await Promise.all([
      db.query(
        // module_progress has no created_at column (only updated_at/completed_at),
        // so first_activity is approximated from the earliest updated_at instead.
        `SELECT
           course_slug,
           COUNT(*)                            AS modules_started,
           COUNT(*) FILTER (WHERE completed)   AS modules_completed,
           MAX(updated_at)                     AS last_activity,
           MIN(updated_at)                     AS first_activity
         FROM module_progress
         WHERE user_id = $1
         GROUP BY course_slug`,
        [req.user.id]
      ),
      db.query(
        `SELECT
           course_id                                        AS course_slug,
           COUNT(*) FILTER (WHERE lesson_id <> 'index')      AS modules_started,
           COUNT(*) FILTER (WHERE completed)                 AS modules_completed,
           MAX(last_viewed_at)                                AS last_activity,
           MIN(created_at)                                    AS first_activity
         FROM training_progress
         WHERE user_id = $1
         GROUP BY course_id`,
        [req.user.id]
      ),
    ]);
    // Also fetch total page views
    const { rows: pvRows } = await db.query(
      `SELECT COUNT(*) AS total FROM page_views WHERE user_id = $1`,
      [req.user.id]
    );
    const courses = [...oldRows, ...newRows]
      .map(r => ({
        courseSlug: r.course_slug,
        modulesStarted: Number(r.modules_started),
        modulesCompleted: Number(r.modules_completed),
        lastActivity: r.last_activity || null,
        firstActivity: r.first_activity || null,
      }))
      .sort((a, b) => new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0));
    res.json({
      success: true,
      courses,
      totalPageViews: Number((pvRows[0] || {}).total || 0),
    });
  } catch (err) {
    console.error('[me/training-summary]', err);
    res.status(500).json({ success: false, error: 'Could not load training summary.' });
  }
});

// Shared builder: profile + skills + earned certificates + earned badges.
async function buildUserOverview(userId, includePrivate) {
  const { rows: urows } = await db.query(
    `SELECT id, full_name, email, role, avatar_url, "current_role", org, job_title,
            linkedin_url, location, bio, skills, created_at, last_login_at,
            job_search_status, notice_period, years_experience
       FROM users WHERE id = $1`,
    [userId]
  );
  if (!urows.length) return null;
  const u = urows[0];

  const { rows: certs } = await db.query(
    `SELECT ci.id, ci.cert_number, ci.issued_at, ci.source, ci.challenge_id,
            c.title AS course_title, ci.course_id
       FROM certificate_issues ci
       LEFT JOIN courses c ON c.id = ci.course_id
      WHERE ci.user_id = $1 AND ci.revoked = FALSE
      ORDER BY ci.issued_at DESC`,
    [userId]
  );

  const { rows: badges } = await db.query(
    `SELECT b.code, b.name, b.description, b.icon, ub.awarded_at
       FROM user_badges ub JOIN badges b ON b.id = ub.badge_id
      WHERE ub.user_id = $1
      ORDER BY ub.awarded_at DESC`,
    [userId]
  );

  return {
    user: {
      id: u.id,
      fullName: u.full_name,
      email: includePrivate ? u.email : undefined,
      role: u.role,
      avatarUrl: u.avatar_url || null,
      currentRole: u.current_role || null,
      org: u.org || null,
      jobTitle: u.job_title || null,
      linkedinUrl: u.linkedin_url || null,
      location: u.location || null,
      bio: u.bio || null,
      skills: u.skills || [],
      jobSearchStatus: includePrivate ? u.job_search_status || null : undefined,
      noticePeriod: includePrivate ? u.notice_period || null : undefined,
      yearsExperience: includePrivate
        ? u.years_experience != null
          ? Number(u.years_experience)
          : null
        : undefined,
      memberSince: u.created_at || null,
      lastLoginAt: includePrivate ? u.last_login_at || null : undefined,
    },
    certificates: certs.map(c => ({
      id: c.id,
      certNumber: c.cert_number,
      issuedAt: c.issued_at,
      title: c.course_title || (c.challenge_id ? 'Weekly Challenge' : c.source || 'Certificate'),
      courseId: c.course_id || null,
    })),
    badges: badges.map(b => ({
      code: b.code,
      name: b.name,
      description: b.description,
      icon: b.icon,
      awardedAt: b.awarded_at,
    })),
  };
}

// GET /api/me/overview — the signed-in user's own overview
app.get('/api/me/overview', verifyAccessToken, async (req, res) => {
  try {
    const data = await buildUserOverview(req.user.id, true);
    if (!data) return res.status(404).json({ success: false, error: 'User not found.' });
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[me/overview]', err);
    res.status(500).json({ success: false, error: 'Could not load overview.' });
  }
});

// GET /api/users/:id/overview — self, or ADMIN / SUPER_ADMIN / RECRUITER
app.get('/api/users/:id/overview', verifyAccessToken, async (req, res) => {
  const targetId = req.params.id;
  const privileged = ['ADMIN', 'SUPER_ADMIN', 'RECRUITER'].includes(req.user.role);
  const isSelf = req.user.id === targetId;
  if (!privileged && !isSelf) {
    return res.status(403).json({ success: false, error: 'Not authorised to view this profile.' });
  }
  try {
    const data = await buildUserOverview(targetId, privileged || isSelf);
    if (!data) return res.status(404).json({ success: false, error: 'User not found.' });
    res.json({ success: true, viewerRole: req.user.role, ...data });
  } catch (err) {
    console.error('[users/:id/overview]', err);
    res.status(500).json({ success: false, error: 'Could not load profile.' });
  }
});

// GET /api/users/:id/activity — page-view counts by area + last login for
// another user. Gated to ADMIN / SUPER_ADMIN (same tier that can reach the
// Admin > Users panel this is linked from) — mirrors /api/me/activity but
// for an arbitrary target user instead of the caller.
app.get('/api/users/:id/activity', verifyAccessToken, async (req, res) => {
  if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Admin access required.' });
  }
  try {
    const targetId = req.params.id;
    const { rows } = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE path ILIKE '/Trainings/%' OR path ILIKE 'Trainings/%')  AS trainings,
         COUNT(*) FILTER (WHERE path ILIKE '/resources/%' OR path ILIKE 'resources/%')  AS resources,
         COUNT(*) FILTER (WHERE path ILIKE '/Tools/%'     OR path ILIKE 'Tools/%')      AS tools
       FROM page_views WHERE user_id = $1`,
      [targetId]
    );
    const { rows: userRows } = await db.query(`SELECT last_login_at FROM users WHERE id = $1`, [
      targetId,
    ]);
    if (!userRows.length) return res.status(404).json({ success: false, error: 'User not found.' });
    const c = rows[0] || {};
    res.json({
      success: true,
      data: {
        trainings: Number(c.trainings || 0),
        resources: Number(c.resources || 0),
        tools: Number(c.tools || 0),
        lastLoginAt: userRows[0].last_login_at || null,
      },
    });
  } catch (err) {
    console.error('[users/:id/activity]', err);
    res.status(500).json({ success: false, error: 'Could not load activity.' });
  }
});

// GET /api/users/:id/training-summary — per-course progress for any user.
// Gated to ADMIN / SUPER_ADMIN. Mirrors /api/me/training-summary for
// privileged profile views (e.g. Admin > Users > view profile).
app.get('/api/users/:id/training-summary', verifyAccessToken, async (req, res) => {
  if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Admin access required.' });
  }
  try {
    const targetId = req.params.id;
    const [{ rows: oldRows }, { rows: newRows }] = await Promise.all([
      db.query(
        `SELECT
           course_slug,
           COUNT(*)                            AS modules_started,
           COUNT(*) FILTER (WHERE completed)   AS modules_completed,
           MAX(updated_at)                     AS last_activity,
           MIN(updated_at)                     AS first_activity
         FROM module_progress
         WHERE user_id = $1
         GROUP BY course_slug`,
        [targetId]
      ),
      db.query(
        `SELECT
           course_id                                          AS course_slug,
           COUNT(*) FILTER (WHERE lesson_id <> 'index')      AS modules_started,
           COUNT(*) FILTER (WHERE completed)                 AS modules_completed,
           MAX(last_viewed_at)                               AS last_activity,
           MIN(created_at)                                   AS first_activity
         FROM training_progress
         WHERE user_id = $1
         GROUP BY course_id`,
        [targetId]
      ),
    ]);
    const courses = [...oldRows, ...newRows]
      .map(r => ({
        courseSlug: r.course_slug,
        modulesStarted: Number(r.modules_started),
        modulesCompleted: Number(r.modules_completed),
        lastActivity: r.last_activity || null,
        firstActivity: r.first_activity || null,
      }))
      .sort((a, b) => new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0));
    res.json({ success: true, courses });
  } catch (err) {
    console.error('[users/:id/training-summary]', err);
    res.status(500).json({ success: false, error: 'Could not load training summary.' });
  }
});

// GET /api/recruiter/candidates — recruiter directory of user profiles.
// Lists every non-deleted user with their status, role/title and LinkedIn so
// recruiters can browse talent. Gated to RECRUITER / ADMIN / SUPER_ADMIN.
app.get('/api/recruiter/candidates', verifyAccessToken, async (req, res) => {
  if (!['RECRUITER', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Recruiter access required.' });
  }
  try {
    const { rows } = await db.query(
      `SELECT id, full_name, email, role, status, "current_role", job_title, org,
              location, linkedin_url, skills, last_login_at, created_at
         FROM users
        WHERE status <> 'DELETED'
        ORDER BY created_at DESC
        LIMIT 1000`
    );
    res.json({
      success: true,
      data: rows.map(u => ({
        id: u.id,
        fullName: u.full_name,
        email: u.email,
        role: u.role,
        status: u.status,
        currentRole: u.current_role || null,
        jobTitle: u.job_title || null,
        org: u.org || null,
        location: u.location || null,
        linkedinUrl: u.linkedin_url || null,
        skills: u.skills || [],
        lastLoginAt: u.last_login_at || null,
        createdAt: u.created_at || null,
      })),
    });
  } catch (err) {
    console.error('[recruiter/candidates]', err);
    res.status(500).json({ success: false, error: 'Could not load candidates.' });
  }
});

/* ── Public certificate verification ──────────────────────────────────────
 * Powers Certificate/verify.html (CertAPI.verify → GET this route). Looks up
 * an issued certificate by its cert_number and returns a JSON verdict. Public
 * on purpose — anyone with a certificate number can confirm authenticity. */
app.get('/api/v1/certificates/verify/:id', async (req, res) => {
  const num = String(req.params.id || '').trim();
  if (!num) {
    return res.json({
      success: true,
      valid: false,
      status: 'invalid',
      message: 'No certificate number provided.',
    });
  }
  try {
    const { rows } = await db.query(
      `SELECT ci.cert_number, ci.issued_at, ci.expires_at, ci.revoked, ci.source, ci.challenge_id,
              u.full_name,
              COALESCE(c.title, ch.title) AS course_title,
              a.rank AS challenge_rank
         FROM certificate_issues ci
         JOIN users u ON u.id = ci.user_id
         LEFT JOIN courses c ON c.id = ci.course_id
         LEFT JOIN challenges ch ON ch.id = ci.challenge_id
         LEFT JOIN challenge_attempts a
                ON a.challenge_id = ci.challenge_id
               AND a.user_id = ci.user_id
               AND a.is_practice = FALSE
        WHERE UPPER(ci.cert_number) = UPPER($1)
        LIMIT 1`,
      [num]
    );
    if (!rows.length) {
      return res.json({
        success: true,
        valid: false,
        status: 'invalid',
        message: 'Certificate not found. Check the number and try again.',
      });
    }
    const r = rows[0];
    let status = 'active';
    let valid = true;
    if (r.revoked) {
      status = 'revoked';
      valid = false;
    } else if (r.expires_at && new Date(r.expires_at) < new Date()) {
      status = 'expired';
      valid = false;
    }
    const isChallenge = r.source === 'whdc' || !!r.challenge_id;
    res.json({
      success: true,
      valid,
      status,
      type: isChallenge ? 'challenge' : 'course',
      message: valid ? undefined : 'This certificate is ' + status + '.',
      certificate: {
        certificateNumber: r.cert_number,
        candidateName: r.full_name,
        courseName: r.course_title || 'Rising Edge Programme',
        completionDate: r.issued_at,
        issueDate: r.issued_at,
        rank: r.challenge_rank || null,
        kind: isChallenge ? 'challenge' : 'course',
        verificationUrl: `${FRONTEND_URL}/Certificate/verify.html?id=${encodeURIComponent(r.cert_number)}`,
      },
    });
  } catch (err) {
    console.error('[certificates/verify]', err);
    res.status(500).json({ success: false, error: 'Verification service error.' });
  }
});

// ── Contact form ────────────────────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  try {
    const { firstName, lastName, email, company, service, message } = req.body;
    if (!firstName || !lastName || !email || !message) {
      return res.status(400).json({ success: false, error: 'Required fields missing.' });
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email address.' });
    }

    // Save to DB
    await db.query(
      `INSERT INTO contact_requests (name, email, company, service, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        `${firstName.trim()} ${lastName.trim()}`,
        email.trim().toLowerCase(),
        company || null,
        service || null,
        message.trim(),
      ]
    );

    // Respond to the client as soon as the enquiry is safely saved. Email
    // notifications are fired off afterward (not awaited) so a slow or
    // unreachable SMTP server can never hang or fail the client-facing request.
    res.json({ success: true, message: 'Message sent.' });

    sendMail({
      to: 'info@risingedgetech.com',
      subject: `New contact enquiry from ${firstName} ${lastName}`,
      html: `
        <h2 style="font-family:sans-serif;margin-bottom:16px">New Contact Enquiry</h2>
        <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap"><strong>Name</strong></td><td>${firstName} ${lastName}</td></tr>
          <tr><td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap"><strong>Email</strong></td><td><a href="mailto:${email}">${email}</a></td></tr>
          ${company ? `<tr><td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap"><strong>Company</strong></td><td>${company}</td></tr>` : ''}
          ${service ? `<tr><td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap"><strong>Service</strong></td><td>${service}</td></tr>` : ''}
        </table>
        <h3 style="font-family:sans-serif;margin-top:20px;margin-bottom:8px">Message</h3>
        <p style="font-family:sans-serif;font-size:14px;line-height:1.6;white-space:pre-wrap">${message}</p>
      `,
    }).catch(mailErr => {
      console.error('[contact] admin notification email failed (enquiry still saved)', mailErr);
    });

    sendMail({
      to: email,
      subject: "We've received your message — Rising Edge Technologies",
      html: `
        <p style="font-family:sans-serif;font-size:14px">Hi ${firstName},</p>
        <p style="font-family:sans-serif;font-size:14px;line-height:1.6">
          Thanks for reaching out! We've received your message and will get back to you within 1–2 business days.
        </p>
        <p style="font-family:sans-serif;font-size:14px">— The Rising Edge Technologies Team</p>
      `,
    }).catch(mailErr => {
      console.error('[contact] auto-reply email failed (enquiry still saved)', mailErr);
    });
  } catch (err) {
    console.error('[contact]', err);
    res.status(500).json({ success: false, error: 'Could not send message. Please try again.' });
  }
});

// Public catalogue
app.get('/api/plans', async (_req, res) => {
  try {
    const { rows: plans } = await db.query(
      `SELECT id,name,price_monthly,price_yearly,description,features,max_courses,badge_color,is_popular FROM subscription_plans ORDER BY price_monthly`
    );
    const { rows: access } = await db.query(
      `SELECT a.plan_id,c.id,c.title,c.category,c.status,c.badge_color FROM plan_course_access a JOIN courses c ON c.id=a.course_id ORDER BY c.price_inr`
    );
    plans.forEach(p => {
      p.courses = access
        .filter(a => a.plan_id === p.id)
        .map(a => ({
          id: a.id,
          title: a.title,
          category: a.category,
          status: a.status,
          badge_color: a.badge_color,
        }));
    });
    res.json({ success: true, data: plans });
  } catch (err) {
    console.error('[api/plans]', err);
    res.status(500).json({ success: false, error: 'Could not fetch plans.' });
  }
});

app.get('/api/tools', async (_req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM tools ORDER BY sort_order, created_at`);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[tools/get]', err);
    res.status(500).json({ success: false, error: err.message || 'Could not fetch tools.' });
  }
});

app.get('/api/resources', async (_req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM resources ORDER BY sort_order, created_at`);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[resources/get]', err);
    res.status(500).json({ success: false, error: err.message || 'Could not fetch resources.' });
  }
});

app.get('/api/coupons/active', async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id,code,type,val,expires FROM coupons WHERE active=true ORDER BY created_at`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not fetch coupons.' });
  }
});

// GET /api/popup-settings — public; returns current homepage popup config
app.get('/api/popup-settings', async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT key, value FROM system_settings WHERE key LIKE 'site.popup.%'`
    );
    const cfg = {};
    for (const r of rows) cfg[r.key.replace('site.popup.', '')] = r.value;
    res.json({
      success: true,
      enabled: cfg.enabled === 'true',
      imageUrl: cfg.imageUrl || '',
      linkUrl: cfg.linkUrl || '',
      altText: cfg.altText || '',
    });
  } catch (err) {
    console.error('[popup-settings GET]', err);
    res.status(500).json({ success: false, error: 'Could not load popup settings.' });
  }
});

/* POST /api/coupons/validate
   Validates a coupon for a given context without consuming it.
   Body: { code, context: 'subscription'|'course'|'tool', contextId, amount }
   Requires: Bearer token (user must be logged in) */
app.post('/api/coupons/validate', verifyAccessToken, async (req, res) => {
  try {
    const { code, context, contextId, amount } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Coupon code required.' });

    const { rows } = await db.query(`SELECT * FROM coupons WHERE code=$1`, [
      code.toUpperCase().trim(),
    ]);
    if (!rows.length) return res.json({ success: false, error: 'Invalid coupon code.' });
    const c = rows[0];

    if (!c.active) return res.json({ success: false, error: 'This coupon is no longer active.' });

    // Expiry check
    if (c.expires && c.expires !== 'No expiry') {
      if (new Date(c.expires) < new Date()) {
        return res.json({ success: false, error: 'This coupon has expired.' });
      }
    }

    // Global usage limit
    if (c.used >= c.limit_count) {
      return res.json({ success: false, error: 'This coupon has reached its usage limit.' });
    }

    // Context check
    if (c.applies_to !== 'all') {
      const contextMap = {
        subscription: 'subscriptions',
        subscriptions: 'subscriptions',
        course: 'courses',
        courses: 'courses',
        tool: 'tools',
        tools: 'tools',
      };
      const mapped = contextMap[context] || context;
      if (c.applies_to !== mapped) {
        return res.json({
          success: false,
          error: `This coupon is only valid for ${c.applies_to}.`,
        });
      }
      // Specific ID check
      if (c.applicable_ids && c.applicable_ids.length && contextId) {
        if (!c.applicable_ids.includes(String(contextId))) {
          return res.json({
            success: false,
            error: 'This coupon is not valid for the selected item.',
          });
        }
      }
    }

    // Per-user limit check
    const { rows: usageRows } = await db.query(
      `SELECT COUNT(*) as cnt FROM coupon_usage WHERE coupon_id=$1 AND user_id=$2`,
      [c.id, req.user.id]
    );
    const userUsed = parseInt(usageRows[0].cnt) || 0;
    if (userUsed >= (c.per_user_limit || 1)) {
      return res.json({
        success: false,
        error: 'You have already used this coupon the maximum number of times.',
      });
    }

    // Calculate discount
    const base = parseFloat(amount) || 0;
    let discount = 0;
    if (c.type === 'percent') {
      discount = Math.round(base * (parseFloat(c.val) / 100) * 100) / 100;
    } else {
      discount = Math.min(parseFloat(c.val), base);
    }
    const discountedAmount = Math.max(0, Math.round((base - discount) * 100) / 100);

    res.json({
      success: true,
      coupon: { id: c.id, code: c.code, type: c.type, val: c.val, applies_to: c.applies_to },
      discount,
      discountedAmount,
    });
  } catch (err) {
    console.error('[coupons/validate]', err);
    res.status(500).json({ success: false, error: 'Could not validate coupon.' });
  }
});

app.get('/api/courses', async (_req, res) => {
  try {
    // LEFT JOIN + GROUP BY c.id so every course gets a real `enrolled` count
    // (previously absent from this response, which silently left every
    // "enrolled" display driven by this endpoint — e.g. Admin > Analytics'
    // "Top Courses by Enrollment" — stuck at 0 regardless of actual data).
    const { rows } = await db.query(
      `SELECT c.id,c.title,c.category,c.description,c.status,c.modules_count,c.href,c.gradient,
              c.badge_color,c.original_price,c.discounted_price,c.demo_link,c.slug,c.created_at,
              COUNT(e.id)::int AS enrolled
         FROM courses c
         LEFT JOIN course_enrollments e ON e.course_id = c.id
        GROUP BY c.id
        ORDER BY c.discounted_price, c.created_at`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[api/courses]', err);
    res.status(500).json({ success: false, error: 'Could not fetch courses.' });
  }
});

app.get('/api/courses/my-purchases', verifyAccessToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT cp.id, cp.course_id, cp.cashfree_order_id, cp.paid_amount,
              cp.purchase_date, cp.valid_until, cp.payment_status,
              c.title, c.category, c.gradient, c.badge_color, c.href, c.modules_count
         FROM course_purchases cp
         JOIN courses c ON c.id = cp.course_id
        WHERE cp.user_id=$1 AND cp.payment_status='paid'
        ORDER BY cp.purchase_date DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[courses/my-purchases]', err);
    res.status(500).json({ success: false, error: 'Could not fetch purchases.' });
  }
});

/* POST /api/modules/progress — save/update module completion */
app.post('/api/modules/progress', verifyAccessToken, async (req, res) => {
  const userId = req.user.id;
  const { course_slug, module_id, quiz_score, quiz_max, completed } = req.body;
  if (!course_slug || !module_id) {
    return res.status(400).json({ error: 'course_slug and module_id required' });
  }
  try {
    await db.query(
      `INSERT INTO module_progress (user_id, course_slug, module_id, quiz_score, quiz_max, completed, completed_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,CASE WHEN $6 THEN NOW() ELSE NULL END,NOW())
       ON CONFLICT (user_id, course_slug, module_id) DO UPDATE
         SET quiz_score   = EXCLUDED.quiz_score,
             quiz_max     = EXCLUDED.quiz_max,
             completed    = EXCLUDED.completed,
             completed_at = CASE WHEN EXCLUDED.completed AND module_progress.completed_at IS NULL
                            THEN NOW() ELSE module_progress.completed_at END,
             updated_at   = NOW()`,
      [userId, course_slug, module_id, quiz_score || 0, quiz_max || 0, !!completed]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[modules/progress POST]', err);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

/* GET /api/modules/progress/:courseSlug — get all module completions for a course */
app.get('/api/modules/progress/:courseSlug', verifyAccessToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const { rows } = await db.query(
      `SELECT module_id, quiz_score, quiz_max, completed, completed_at
       FROM module_progress WHERE user_id=$1 AND course_slug=$2`,
      [userId, req.params.courseSlug]
    );
    res.json(rows);
  } catch (err) {
    console.error('[modules/progress GET]', err);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Enrollment
app.get('/api/enroll', verifyAccessToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT e.id,e.course_id,c.title,c.category,c.badge_color,c.href,c.gradient,e.status,e.progress,e.enrolled_at,e.completed_at
         FROM course_enrollments e JOIN courses c ON c.id=e.course_id WHERE e.user_id=$1 ORDER BY e.enrolled_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[enroll/get]', err);
    res.status(500).json({ success: false, error: 'Could not fetch enrollments.' });
  }
});

app.post('/api/enroll', verifyAccessToken, async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) return res.status(422).json({ success: false, error: 'courseId required.' });
    const { rows: subRows } = await db.query(
      `SELECT plan_id FROM user_subscriptions WHERE user_id=$1`,
      [req.user.id]
    );
    const planId = subRows[0]?.plan_id || 'basic';
    const { rows: accessRows } = await db.query(
      `SELECT 1 FROM plan_course_access WHERE plan_id=$1 AND course_id=$2`,
      [planId, courseId]
    );
    if (!accessRows.length) {
      return res.status(403).json({
        success: false,
        error: 'Your plan does not include this course. Please upgrade.',
        code: 'PLAN_UPGRADE_REQUIRED',
      });
    }
    await db.query(
      `INSERT INTO course_enrollments (user_id,course_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [req.user.id, courseId]
    );
    const { rows } = await db.query(
      `SELECT e.*,c.title,c.href FROM course_enrollments e JOIN courses c ON c.id=e.course_id WHERE e.user_id=$1 AND e.course_id=$2`,
      [req.user.id, courseId]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[enroll/post]', err);
    res.status(500).json({ success: false, error: 'Enrollment failed.' });
  }
});

app.patch('/api/enroll/:courseId/progress', verifyAccessToken, async (req, res) => {
  try {
    const { progress } = req.body;
    if (progress === undefined || progress < 0 || progress > 100) {
      return res.status(422).json({ success: false, error: 'progress must be 0-100.' });
    }
    const completedAt = progress === 100 ? new Date() : null;
    const status = progress === 100 ? 'completed' : 'active';
    const { rows } = await db.query(
      `UPDATE course_enrollments SET progress=$1,status=$2,completed_at=$3 WHERE user_id=$4 AND course_id=$5 RETURNING *`,
      [progress, status, completedAt, req.user.id, req.params.courseId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Enrollment not found.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[enroll/progress]', err);
    res.status(500).json({ success: false, error: 'Could not update progress.' });
  }
});

// ── Weekly Hardware Design Challenge (WHDC) API ─────────────────────────────
const WHDC_TIER = pts =>
  pts >= 6000 ? 'Platinum' : pts >= 3000 ? 'Gold' : pts >= 1500 ? 'Silver' : 'Bronze';
const WHDC_DIFF_MULT = { Beginner: 1.0, Intermediate: 1.25, Advanced: 1.5, Mixed: 1.25 };

async function whdcGetOwnedAttempt(id, userId) {
  const { rows } = await db.query(`SELECT * FROM challenge_attempts WHERE id=$1 AND user_id=$2`, [
    id,
    userId,
  ]);
  return rows[0] || null;
}

async function whdcLoadPublicQuestions(challengeId, order) {
  const { rows } = await db.query(
    `SELECT id,type,prompt,assets,options,points FROM challenge_questions WHERE challenge_id=$1`,
    [challengeId]
  );
  const byId = {};
  rows.forEach(q => (byId[q.id] = q));
  const seq = order && order.length ? order : rows.map(r => r.id);
  return seq.map(id => byId[id]).filter(Boolean); // answer_key/explanation intentionally omitted
}

// Grades one response against a question's server-side answer_key.
function whdcGrade(q, response) {
  const key = q.answer_key || {};
  const neg = -Number(q.negative_marking || 0);
  if (response == null) return { correct: false, points: 0 };
  if (q.type === 'mcq' || q.type === 'truefalse' || q.type === 'svg') {
    const ok = Number(response.choice) === Number(key.correct);
    return { correct: ok, points: ok ? q.points : neg };
  }
  if (q.type === 'multi') {
    const sel = (response.choices || []).map(Number).sort((a, b) => a - b);
    const cor = (key.correct || []).map(Number).sort((a, b) => a - b);
    const exact = sel.length === cor.length && sel.every((v, i) => v === cor[i]);
    if (exact) return { correct: true, points: q.points };
    if (q.partial_credit && cor.length) {
      const right = sel.filter(v => cor.includes(v)).length;
      const wrong = sel.filter(v => !cor.includes(v)).length;
      const frac = Math.max(0, (right - wrong) / cor.length);
      return { correct: false, points: Math.round(q.points * frac * 100) / 100 };
    }
    return { correct: false, points: 0 };
  }
  if (q.type === 'numeric' || q.type === 'mathjax') {
    const val = parseFloat(response.value);
    const tol = q.numeric_tolerance != null ? Number(q.numeric_tolerance) : 0;
    const ok = !Number.isNaN(val) && Math.abs(val - Number(key.value)) <= tol;
    return { correct: ok, points: ok ? q.points : 0 };
  }
  if (q.type === 'short') {
    const norm = s =>
      String(s || '')
        .trim()
        .toLowerCase();
    const ok = norm(response.value) === norm(key.value);
    return { correct: ok, points: ok ? q.points : 0 };
  }
  return { correct: false, points: 0 };
}

// Recognized WHDC tracks/categories. `null`/unset category_id is treated as
// the legacy/uncategorized track so existing challenges keep working.
const WHDC_CATEGORIES = [
  { id: 'BASIC_HW', label: 'Basic Hardware Design' },
  { id: 'ADVANCED_HW', label: 'Advanced Hardware Design' },
  { id: 'PCB_DESIGN', label: 'PCB Design' },
];

// GET the list of selectable tracks (public, static — used to render the
// category selector without hardcoding it client-side).
app.get('/api/challenges/categories', (_req, res) => {
  res.json({ success: true, data: WHDC_CATEGORIES });
});

// GET the current live challenge (public metadata only — no answer keys).
// Optional `?category=` filters to a specific track (BASIC_HW / ADVANCED_HW /
// PCB_DESIGN); omitted keeps the old behavior of the single most-recent
// challenge across all/uncategorized tracks.
app.get('/api/challenges/current', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const catFilter = category ? 'AND category_id=$1' : '';
    const catParams = category ? [category] : [];
    let { rows } = await db.query(
      `SELECT * FROM challenges WHERE status='live' ${catFilter} ORDER BY opens_at DESC NULLS LAST LIMIT 1`,
      catParams
    );
    if (!rows.length) {
      rows = (
        await db.query(
          `SELECT * FROM challenges WHERE status IN ('closed','archived') ${catFilter}
             ORDER BY closes_at DESC NULLS LAST LIMIT 1`,
          catParams
        )
      ).rows;
    }
    const ch = rows[0];
    if (!ch) return res.json({ success: true, data: null });
    const qc = await db.query(
      `SELECT COUNT(*)::int AS n FROM challenge_questions WHERE challenge_id=$1`,
      [ch.id]
    );
    res.json({ success: true, data: { ...ch, question_count: qc.rows[0].n } });
  } catch (err) {
    console.error('[whdc/current]', err);
    res.status(500).json({ success: false, error: 'Could not load challenge.' });
  }
});

// GET the next SCHEDULED challenge (public) — powers the "next challenge"
// announcement on the hub. Returns the soonest-opening challenge whose status
// is 'scheduled' with a future opens_at (optionally per category), or null.
app.get('/api/challenges/next', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const catFilter = category ? 'AND category_id=$1' : '';
    const catParams = category ? [category] : [];
    const { rows } = await db.query(
      `SELECT id, title, description, week_number, difficulty, category_id,
              opens_at, closes_at, status, total_points
         FROM challenges
        WHERE status='scheduled' AND opens_at IS NOT NULL AND opens_at > NOW() ${catFilter}
        ORDER BY opens_at ASC
        LIMIT 1`,
      catParams
    );
    const ch = rows[0];
    if (!ch) {
      return res.json({ success: true, data: null });
    }
    const qc = await db.query(
      `SELECT COUNT(*)::int AS n FROM challenge_questions WHERE challenge_id=$1`,
      [ch.id]
    );
    res.json({ success: true, data: { ...ch, question_count: qc.rows[0].n } });
  } catch (err) {
    console.error('[whdc/next]', err);
    res.status(500).json({ success: false, error: 'Could not load upcoming challenge.' });
  }
});

// Public leaderboards are served from an in-memory cache that refreshes once a
// day, so page views do not hit the database. Ranks from new submissions show
// up at the next daily refresh (or after a server restart/deploy).
const LEADERBOARD_TTL_MS = 24 * 60 * 60 * 1000;
const leaderboardCache = new Map(); // key -> { at, data }
async function cachedLeaderboard(key, load) {
  const hit = leaderboardCache.get(key);
  if (hit && Date.now() - hit.at < LEADERBOARD_TTL_MS) return hit.data;
  const data = await load();
  leaderboardCache.set(key, { at: Date.now(), data });
  if (leaderboardCache.size > 500) leaderboardCache.delete(leaderboardCache.keys().next().value);
  return data;
}

// GET per-challenge leaderboard (public, refreshed daily)
app.get('/api/challenges/:id/leaderboard', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  try {
    const rows = await cachedLeaderboard('challenge:' + req.params.id, async () => {
      const { rows } = await db.query(
        `SELECT u.full_name, u."current_role" AS role, a.final_score AS score, a.time_taken_sec,
              RANK() OVER (ORDER BY a.final_score DESC, a.time_taken_sec ASC) AS rank
         FROM challenge_attempts a JOIN users u ON u.id=a.user_id
        WHERE a.challenge_id=$1 AND a.is_practice=FALSE AND a.status<>'in_progress'
          AND u.role <> 'SUPER_ADMIN'
        ORDER BY rank LIMIT 100`,
        [req.params.id]
      );
      return rows;
    });
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[whdc/leaderboard]', err);
    res.status(500).json({ success: false, error: 'Could not load leaderboard.' });
  }
});

// GET all-time points leaderboard (public)
app.get('/api/leaderboard', async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  try {
    const rows = await cachedLeaderboard('alltime', async () => {
      const { rows } = await db.query(
        `SELECT u.full_name, u."current_role" AS role, p.lifetime_points AS score, p.tier,
                RANK() OVER (ORDER BY p.lifetime_points DESC) AS rank
           FROM user_points p JOIN users u ON u.id=p.user_id
          WHERE u.role <> 'SUPER_ADMIN'
          ORDER BY rank LIMIT 100`
      );
      return rows;
    });
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[whdc/leaderboard-all]', err);
    res.status(500).json({ success: false, error: 'Could not load leaderboard.' });
  }
});

// GET challenge by slug (public metadata) — keep last so it doesn't shadow the routes above
app.get('/api/challenges/:slug', async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM challenges WHERE slug=$1`, [req.params.slug]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[whdc/slug]', err);
    res.status(500).json({ success: false, error: 'Error loading challenge.' });
  }
});

// ── Advertising (public) ────────────────────────────────────────────────
// Site-wide AdSense kill switch, stored in the (previously unused)
// system_settings table. Defaults to enabled if the row is missing or the
// query fails — a settings hiccup should never silently kill ad revenue.
// ── Ads cache ────────────────────────────────────────────────────────────────
// /api/ads is called twice on every page load, so the AdSense flag and each
// slot's active campaign are kept in memory for ADS_CACHE_TTL_MS instead of
// being queried per request. Admin edits clear the cache immediately.
// Impressions and clicks are counted in memory and written in one batch
// (flushAdCounters): once a day with the jobs sweep, before the admin ads list
// loads, and on shutdown — so serving an ad never wakes the database.
const ADS_CACHE_TTL_MS = 15 * 60 * 1000;
const adsCache = { adsense: null, slots: new Map() }; // slots: slot -> { at, campaign }
const pendingAdCounts = new Map(); // campaignId -> { impressions, clicks }

function clearAdsCache() {
  adsCache.adsense = null;
  adsCache.slots.clear();
}

function bumpAdCount(id, field) {
  if (!id) return;
  const c = pendingAdCounts.get(id) || { impressions: 0, clicks: 0 };
  c[field] += 1;
  pendingAdCounts.set(id, c);
}

async function flushAdCounters() {
  if (!pendingAdCounts.size) return;
  const batch = [...pendingAdCounts.entries()];
  pendingAdCounts.clear();
  for (const [id, c] of batch) {
    try {
      await db.query(
        `UPDATE ad_campaigns SET impressions = impressions + $2, clicks = clicks + $3 WHERE id=$1`,
        [id, c.impressions, c.clicks]
      );
    } catch (err) {
      console.error('[ads/flush]', err.message);
    }
  }
}

async function getAdsenseEnabled() {
  if (adsCache.adsense && Date.now() - adsCache.adsense.at < ADS_CACHE_TTL_MS) {
    return adsCache.adsense.value;
  }
  const value = await getAdsenseEnabledFromDb();
  adsCache.adsense = { at: Date.now(), value };
  return value;
}

async function getAdsenseEnabledFromDb() {
  try {
    const { rows } = await db.query(
      `SELECT value FROM system_settings WHERE key='ads_adsense_enabled'`
    );
    if (!rows.length) return true;
    return rows[0].value !== 'false';
  } catch (e) {
    return true;
  }
}

// GET the active direct-sold campaign for a slot, if any, plus whether
// AdSense fallback is currently enabled site-wide — the front-end ad-slot
// module (assets/js/ads.js) calls this first and only renders the AdSense
// unit when there's no campaign AND adsenseEnabled is true. Counts an
// impression server-side (not trusting a client-side ping) whenever a
// campaign is actually served.
app.get('/api/ads', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const slot = req.query.slot;
  const adsenseEnabled = await getAdsenseEnabled();
  if (!slot) return res.json({ success: true, data: null, adsenseEnabled });
  try {
    let cached = adsCache.slots.get(slot);
    if (!cached || Date.now() - cached.at >= ADS_CACHE_TTL_MS) {
      const { rows } = await db.query(
        `SELECT id, slot_id, advertiser_name, image_url, target_url, alt_text
           FROM ad_campaigns
          WHERE slot_id=$1 AND active=TRUE
            AND (starts_at IS NULL OR starts_at <= NOW())
            AND (ends_at IS NULL OR ends_at >= NOW())
          ORDER BY created_at DESC LIMIT 1`,
        [slot]
      );
      cached = { at: Date.now(), campaign: rows[0] || null };
      if (adsCache.slots.size > 100) adsCache.slots.clear();
      adsCache.slots.set(slot, cached);
    }
    const campaign = cached.campaign;
    if (campaign) bumpAdCount(campaign.id, 'impressions');
    res.json({
      success: true,
      data: campaign && {
        id: campaign.id,
        slotId: campaign.slot_id,
        advertiserName: campaign.advertiser_name,
        imageUrl: campaign.image_url,
        targetUrl: campaign.target_url,
        altText: campaign.alt_text,
      },
      adsenseEnabled,
    });
  } catch (err) {
    console.error('[ads/get]', err);
    res.json({ success: true, data: null, adsenseEnabled: true }); // fail open
  }
});

// POST best-effort click counter — fire-and-forget from the front end, never
// blocks navigation to the advertiser's target URL.
app.post('/api/ads/:id/click', async (req, res) => {
  bumpAdCount(String(req.params.id || '').slice(0, 64), 'clicks');
  res.json({ success: true });
});

// POST start (or resume) an attempt
app.post(
  '/api/challenges/:id/attempts',
  whdcAttemptLimiter,
  verifyAccessToken,
  async (req, res) => {
    try {
      const chId = req.params.id;
      const practice = !!(req.body && req.body.practice);
      const { rows: chRows } = await db.query(`SELECT * FROM challenges WHERE id=$1`, [chId]);
      const ch = chRows[0];
      if (!ch) return res.status(404).json({ success: false, error: 'Challenge not found' });
      const now = new Date();
      const isLive = ch.status === 'live' && (!ch.closes_at || new Date(ch.closes_at) > now);
      if (!practice && !isLive) {
        return res
          .status(403)
          .json({ success: false, error: 'Challenge is not live. Use practice mode.' });
      }
      if (!practice) {
        const ex = await db.query(
          `SELECT * FROM challenge_attempts WHERE challenge_id=$1 AND user_id=$2 AND is_practice=FALSE`,
          [chId, req.user.id]
        );
        if (ex.rows.length) {
          const a = ex.rows[0];
          if (a.status !== 'in_progress') {
            return res.status(409).json({
              success: false,
              error: 'You already completed this challenge.',
              code: 'ALREADY_SUBMITTED',
            });
          }
          const qs = await whdcLoadPublicQuestions(chId, a.question_order);
          const saved = await db.query(
            `SELECT question_id, response FROM attempt_answers WHERE attempt_id=$1`,
            [a.id]
          );
          return res.json({
            success: true,
            data: { attempt: a, questions: qs, answers: saved.rows, resumed: true },
          });
        }
      }
      const qIds = (
        await db.query(
          `SELECT id FROM challenge_questions WHERE challenge_id=$1 ORDER BY position`,
          [chId]
        )
      ).rows.map(r => r.id);
      const order = qIds.slice().sort(() => Math.random() - 0.5);
      // Challenges no longer use a fixed per-attempt time limit — the attempt
      // stays open until the challenge itself closes. Practice attempts (on
      // non-live challenges) have no deadline at all.
      const deadline = !practice && ch.closes_at ? new Date(ch.closes_at) : null;
      const { rows } = await db.query(
        `INSERT INTO challenge_attempts (challenge_id,user_id,deadline_at,question_order,is_practice)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [chId, req.user.id, deadline, JSON.stringify(order), practice]
      );
      const qs = await whdcLoadPublicQuestions(chId, order);
      res.status(201).json({
        success: true,
        data: { attempt: rows[0], questions: qs, answers: [], resumed: false },
      });
    } catch (err) {
      console.error('[whdc/start]', err);
      res.status(500).json({ success: false, error: 'Could not start attempt.' });
    }
  }
);

// PATCH autosave one answer
app.patch('/api/attempts/:id/answers', verifyAccessToken, async (req, res) => {
  try {
    const { questionId, response } = req.body || {};
    if (!questionId) return res.status(422).json({ success: false, error: 'questionId required' });
    const a = await whdcGetOwnedAttempt(req.params.id, req.user.id);
    if (!a) return res.status(404).json({ success: false, error: 'Attempt not found' });
    if (a.status !== 'in_progress') {
      return res.status(409).json({ success: false, error: 'Attempt already submitted' });
    }
    await db.query(
      `INSERT INTO attempt_answers (attempt_id,question_id,response)
       VALUES ($1,$2,$3)
       ON CONFLICT (attempt_id,question_id) DO UPDATE SET response=$3, answered_at=NOW()`,
      [a.id, questionId, JSON.stringify(response ?? null)]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[whdc/autosave]', err);
    res.status(500).json({ success: false, error: 'Autosave failed' });
  }
});

// POST submit + grade + settle points/badges/certificate
app.post('/api/attempts/:id/submit', whdcAttemptLimiter, verifyAccessToken, async (req, res) => {
  const bodyAns = req.body && req.body.answers;
  if (bodyAns != null && !Array.isArray(bodyAns)) {
    return res.status(422).json({ success: false, error: 'answers must be an array.' });
  }
  const client = await db.connect();
  let result = null; // filled inside the transaction, used after commit
  try {
    await client.query('BEGIN');
    // Lock the attempt row so two concurrent submits can't both score it.
    const a = (
      await client.query(`SELECT * FROM challenge_attempts WHERE id=$1 AND user_id=$2 FOR UPDATE`, [
        req.params.id,
        req.user.id,
      ])
    ).rows[0];
    if (!a) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Attempt not found' });
    }
    if (a.status !== 'in_progress') {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, error: 'Already submitted' });
    }
    const ch = (await client.query(`SELECT * FROM challenges WHERE id=$1`, [a.challenge_id]))
      .rows[0];
    const questions = (
      await client.query(`SELECT * FROM challenge_questions WHERE challenge_id=$1`, [
        a.challenge_id,
      ])
    ).rows;

    for (const ans of bodyAns || []) {
      if (!ans || !ans.questionId) continue;
      await client.query(
        `INSERT INTO attempt_answers (attempt_id,question_id,response)
         VALUES ($1,$2,$3) ON CONFLICT (attempt_id,question_id) DO UPDATE SET response=$3, answered_at=NOW()`,
        [a.id, ans.questionId, JSON.stringify(ans.response ?? null)]
      );
    }
    const saved = (
      await client.query(`SELECT question_id, response FROM attempt_answers WHERE attempt_id=$1`, [
        a.id,
      ])
    ).rows;
    const respById = {};
    saved.forEach(r => (respById[r.question_id] = r.response));

    let raw = 0;
    let correct = 0;
    for (const q of questions) {
      const g = whdcGrade(q, respById[q.id]);
      raw += g.points;
      if (g.correct) correct++;
      await client.query(
        `UPDATE attempt_answers SET is_correct=$1, points_earned=$2 WHERE attempt_id=$3 AND question_id=$4`,
        [g.correct, g.points, a.id, q.id]
      );
    }
    raw = Math.max(0, Math.round(raw * 100) / 100);
    // Normalize the leaderboard score to the challenge's advertised maximum
    // (total_points, default 100). A challenge's questions can sum to more or
    // less than that, so scaling keeps every challenge on the same "out of N"
    // footing and guarantees a score can never exceed the stated maximum
    // (this is why a raw 103/103 was showing as 103 on a "100-mark" board).
    const maxPossible = questions.reduce(function (s, q) {
      return s + Math.max(0, Number(q.points) || 0);
    }, 0);
    const totalPoints = Number(ch.total_points) || maxPossible || 100;
    let finalScore = raw;
    if (maxPossible > 0) {
      finalScore = Math.round((raw / maxPossible) * totalPoints * 100) / 100;
    }
    finalScore = Math.max(0, Math.min(finalScore, totalPoints));
    const now = new Date();
    const timeTaken = Math.round((now - new Date(a.started_at)) / 1000);
    // No fixed per-attempt time limit anymore — attempts stay open until the
    // challenge closes. Leaderboard ties are still broken by time_taken_sec
    // (see the RANK() OVER queries), so no separate speed bonus is needed.
    const overtime = a.deadline_at && now > new Date(a.deadline_at);
    const status = overtime ? 'auto_submitted' : 'submitted';
    await client.query(
      `UPDATE challenge_attempts
          SET status=$1, submitted_at=NOW(), raw_score=$2, final_score=$3, time_taken_sec=$4, correct_count=$5
        WHERE id=$6`,
      [status, raw, finalScore, timeTaken, correct, a.id]
    );

    let pointsAwarded = 0;
    const newBadges = [];
    let tier = null;
    let streak = null;
    if (!a.is_practice) {
      await client.query(
        `INSERT INTO user_points (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [req.user.id]
      );
      const up = (
        await client.query(`SELECT * FROM user_points WHERE user_id=$1 FOR UPDATE`, [req.user.id])
      ).rows[0];
      const newStreak = (up.current_streak || 0) + 1;
      const longest = Math.max(up.longest_streak || 0, newStreak);
      const mult = WHDC_DIFF_MULT[ch.difficulty] || 1.0;
      const participation = 10;
      const streakBonus = Math.min(newStreak * 5, 50);
      const scorePts = Math.round(finalScore * mult);
      pointsAwarded = scorePts + participation + streakBonus;
      const newLifetime = (up.lifetime_points || 0) + pointsAwarded;
      tier = WHDC_TIER(newLifetime);
      streak = newStreak;
      const played = (up.challenges_played || 0) + 1;
      await client.query(
        `UPDATE user_points
            SET lifetime_points=$1, tier=$2, current_streak=$3, longest_streak=$4,
                challenges_played=$5, last_played_challenge_id=$6, updated_at=NOW()
          WHERE user_id=$7`,
        [newLifetime, tier, newStreak, longest, played, ch.id, req.user.id]
      );
      await client.query(
        `INSERT INTO points_ledger (user_id,challenge_id,reason,points) VALUES
           ($1,$2,'score',$3),($1,$2,'participation',$4),($1,$2,'streak',$5)`,
        [req.user.id, ch.id, scorePts, participation, streakBonus]
      );

      const perfect = maxPossible > 0 && raw >= maxPossible;
      const within24 = ch.opens_at && now - new Date(ch.opens_at) <= 24 * 3600 * 1000;
      const codes = [];
      // Participation/milestone badges — everyone who attempts earns these
      // as their lifetime played-count crosses each threshold.
      if (played === 1) codes.push('first_challenge');
      if (played === 5) codes.push('played_5');
      if (played === 10) codes.push('played_10');
      if (played === 25) codes.push('played_25');
      if (played === 50) codes.push('played_50');
      // Streak badges — continuous weekly submissions.
      if (newStreak >= 5) codes.push('streak_5');
      if (newStreak >= 10) codes.push('streak_10');
      if (newStreak >= 25) codes.push('streak_25');
      if (perfect) codes.push('perfect');
      if (within24) codes.push('early_bird');
      if (tier === 'Platinum') codes.push('platinum');
      for (const code of codes) {
        const b = (await client.query(`SELECT id FROM badges WHERE code=$1`, [code])).rows[0];
        if (!b) continue;
        const ins = await client.query(
          `INSERT INTO user_badges (user_id,badge_id,challenge_id) VALUES ($1,$2,$3)
           ON CONFLICT (user_id,badge_id) DO NOTHING RETURNING id`,
          [req.user.id, b.id, ch.id]
        );
        if (ins.rows.length) newBadges.push(code);
      }
    }

    await client.query('COMMIT');
    result = {
      challenge: ch,
      attemptId: a.id,
      isPractice: a.is_practice,
      rawScore: raw,
      finalScore,
      correctCount: correct,
      totalQuestions: questions.length,
      timeTakenSec: timeTaken,
      status,
      pointsAwarded,
      newBadges,
      tier,
      streak,
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[whdc/submit]', err);
    return res.status(500).json({ success: false, error: 'Submit failed.' });
  } finally {
    client.release();
  }

  // Post-commit, best-effort side effects (do not block or roll back scoring).
  // NOTE: weekly challenges no longer issue certificates at all. The top-3
  // champion/podium badges (and the weekly podium_finishes count) are only
  // known once the challenge closes and final ranks are frozen — see
  // awardWhdcTopBadges(), called from the close handlers below. Everyone who
  // attempts still earns badges immediately (participation/milestone/streak
  // — see codes[] above).
  if (!result.isPractice) {
    db.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1,'results_ready',$2,$3,$4)`,
      [
        req.user.id,
        'Your challenge results are ready',
        `You scored ${result.rawScore} on "${result.challenge.title}".`,
        JSON.stringify({
          challengeId: result.challenge.id,
          attemptId: result.attemptId,
          points: result.pointsAwarded,
        }),
      ]
    ).catch(() => {});
  }

  res.json({
    success: true,
    data: {
      attemptId: result.attemptId,
      rawScore: result.rawScore,
      finalScore: result.finalScore,
      correctCount: result.correctCount,
      totalQuestions: result.totalQuestions,
      timeTakenSec: result.timeTakenSec,
      status: result.status,
      pointsAwarded: result.pointsAwarded,
      newBadges: result.newBadges,
      tier: result.tier,
      streak: result.streak,
    },
  });
});

// GET attempt result + explanations (post-submit)
app.get('/api/attempts/:id/result', verifyAccessToken, async (req, res) => {
  try {
    const a = await whdcGetOwnedAttempt(req.params.id, req.user.id);
    if (!a) return res.status(404).json({ success: false, error: 'Attempt not found' });
    if (a.status === 'in_progress') {
      return res.status(409).json({ success: false, error: 'Not submitted yet' });
    }
    const questions = (
      await db.query(`SELECT * FROM challenge_questions WHERE challenge_id=$1`, [a.challenge_id])
    ).rows;
    const ans = (await db.query(`SELECT * FROM attempt_answers WHERE attempt_id=$1`, [a.id])).rows;
    const ansById = {};
    ans.forEach(x => (ansById[x.question_id] = x));
    const review = questions.map(q => ({
      id: q.id,
      prompt: q.prompt,
      topic: q.topic_tag,
      correct: ansById[q.id]?.is_correct || false,
      pointsEarned: ansById[q.id]?.points_earned || 0,
      explanation: q.explanation,
    }));
    const rankRow = (
      await db.query(
        `SELECT COUNT(*)+1 AS r FROM challenge_attempts
          WHERE challenge_id=$1 AND is_practice=FALSE AND status<>'in_progress' AND final_score > $2`,
        [a.challenge_id, a.final_score]
      )
    ).rows[0];
    res.json({ success: true, data: { attempt: a, review, provisionalRank: Number(rankRow.r) } });
  } catch (err) {
    console.error('[whdc/result]', err);
    res.status(500).json({ success: false, error: 'Could not load result.' });
  }
});

// GET my WHDC profile (points, tier, streak, badges, attempts)
app.get('/api/me/whdc', verifyAccessToken, async (req, res) => {
  try {
    await db.query(
      `INSERT INTO user_points (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      [req.user.id]
    );
    const points = (await db.query(`SELECT * FROM user_points WHERE user_id=$1`, [req.user.id]))
      .rows[0];
    const rankRow = (
      await db.query(`SELECT COUNT(*)+1 AS r FROM user_points WHERE lifetime_points > $1`, [
        points.lifetime_points,
      ])
    ).rows[0];
    const badges = (
      await db.query(
        `SELECT b.code,b.name,b.description,b.icon,ub.awarded_at
           FROM user_badges ub JOIN badges b ON b.id=ub.badge_id
          WHERE ub.user_id=$1 ORDER BY ub.awarded_at DESC`,
        [req.user.id]
      )
    ).rows;
    const attempts = (
      await db.query(
        `SELECT a.id,a.challenge_id,c.title,c.week_number,a.raw_score,a.final_score,a.rank,a.submitted_at
           FROM challenge_attempts a JOIN challenges c ON c.id=a.challenge_id
          WHERE a.user_id=$1 AND a.is_practice=FALSE AND a.status<>'in_progress'
          ORDER BY a.submitted_at DESC LIMIT 20`,
        [req.user.id]
      )
    ).rows;
    res.json({ success: true, data: { points, allTimeRank: Number(rankRow.r), badges, attempts } });
  } catch (err) {
    console.error('[whdc/me]', err);
    res.status(500).json({ success: false, error: 'Could not load profile.' });
  }
});

/* ════════════════════════════════════════════════════════════════════
   JOB BOARD API  (docs/Job-Board-Requirements.md)
   Public: browse/list/detail. Auth: apply. RECRUITER/ADMIN/SUPER_ADMIN: post.
════════════════════════════════════════════════════════════════════ */

const JOB_DISCIPLINES = ['HARDWARE_DESIGN', 'PCB_DESIGN', 'SI', 'PI', 'EMC', 'OTHER'];
const JOB_TYPES = ['FULL_TIME', 'CONTRACT', 'INTERNSHIP'];
const JOB_EXP = ['FRESHER', 'JUNIOR', 'MID', 'SENIOR', 'PRINCIPAL'];
const JOB_MODES = ['ONSITE', 'REMOTE', 'HYBRID'];
const JOB_PLATFORMS = [
  'LINKEDIN',
  'NAUKRI',
  'INDEED',
  'GLASSDOOR',
  'MONSTER',
  'COMPANY_SITE',
  'OTHER',
];
const canPostJobs = requireRole('RECRUITER', 'ADMIN', 'SUPER_ADMIN');

const jobApplyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Daily application limit reached.' },
});

// ── Public: list ACTIVE jobs with filters ──────────────────────────
app.get('/api/jobs', async (req, res) => {
  try {
    const { q, discipline, experience, type, work_mode, page, sort } = req.query;
    const ORDER = {
      newest: 'j.created_at DESC',
      oldest: 'j.created_at ASC',
      salary: 'j.salary_max DESC NULLS LAST, j.salary_min DESC NULLS LAST',
      deadline: 'j.deadline ASC NULLS LAST',
    };
    const orderBy = ORDER[sort] || ORDER.newest;
    const where = [`j.status = 'ACTIVE'`];
    const params = [];
    if (q) {
      params.push(`%${q}%`);
      where.push(
        `(j.title ILIKE $${params.length} OR j.company_name ILIKE $${params.length} OR j.description_md ILIKE $${params.length})`
      );
    }
    if (discipline && JOB_DISCIPLINES.includes(discipline)) {
      params.push(discipline);
      where.push(`$${params.length} = ANY(j.disciplines)`);
    }
    if (experience && JOB_EXP.includes(experience)) {
      params.push(experience);
      where.push(`j.experience_level = $${params.length}`);
    }
    if (type && JOB_TYPES.includes(type)) {
      params.push(type);
      where.push(`j.employment_type = $${params.length}`);
    }
    if (work_mode && JOB_MODES.includes(work_mode)) {
      params.push(work_mode);
      where.push(`j.work_mode = $${params.length}`);
    }
    const pageN = Math.max(1, parseInt(page, 10) || 1);
    const limit = 20;
    const { rows: countRows } = await db.query(
      `SELECT COUNT(*)::int AS n FROM jobs j WHERE ${where.join(' AND ')}`,
      params
    );
    params.push(limit, (pageN - 1) * limit);
    const { rows } = await db.query(
      `SELECT j.id, j.title, j.company_name, j.company_logo_url, j.disciplines,
              j.employment_type, j.experience_level, j.location, j.work_mode, j.skills,
              j.salary_min, j.salary_max, j.salary_currency, j.salary_hidden,
              j.apply_mode, j.deadline, j.created_at, j.posted_by, j.views_count,
              (SELECT COUNT(*)::int FROM job_applications a WHERE a.job_id = j.id) AS applications
         FROM jobs j
        WHERE ${where.join(' AND ')}
        ORDER BY ${orderBy}
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ success: true, data: rows, total: countRows[0].n, page: pageN, per_page: limit });
  } catch (err) {
    console.error('[jobs/list]', err);
    res.status(500).json({ success: false, error: 'Could not load jobs.' });
  }
});

// ── Public: job detail ─────────────────────────────────────────────
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT j.*, u.full_name AS posted_by_name,
              (SELECT COUNT(*)::int FROM job_applications a WHERE a.job_id = j.id) AS applications
         FROM jobs j JOIN users u ON u.id = j.posted_by
        WHERE j.id = $1 AND j.status <> 'DELETED'`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Job not found.' });
    db.query(`UPDATE jobs SET views_count = views_count + 1 WHERE id = $1`, [req.params.id]).catch(
      () => {}
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[jobs/detail]', err);
    res.status(500).json({ success: false, error: 'Could not load job.' });
  }
});

// ── Auth: apply to a job (in-platform) or record external click ────
// Resume uploads for job applications. Held in memory only (memoryStorage):
// the file is emailed to the recruiter as an attachment and then discarded —
// it is never written to disk or persisted in the database.
const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const okType = /pdf|msword|officedocument\.wordprocessingml|application\/octet-stream/i.test(
      file.mimetype
    );
    const okExt = /\.(pdf|doc|docx)$/i.test(file.originalname || '');
    if (okType || okExt) {
      return cb(null, true);
    }
    cb(new Error('Only PDF, DOC or DOCX resumes are allowed.'));
  },
});
// Wrap multer so its errors (size/type) return clean JSON instead of HTML.
function resumeUploadMw(req, res, next) {
  resumeUpload.single('resume')(req, res, err => {
    if (err) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Resume must be under 5 MB.'
          : err.message || 'Resume upload failed.';
      return res.status(422).json({ success: false, error: msg });
    }
    next();
  });
}

app.post(
  '/api/jobs/:id/apply',
  jobApplyLimiter,
  verifyAccessToken,
  resumeUploadMw,
  async (req, res) => {
    try {
      const { rows: jobs } = await db.query(
        `SELECT j.id, j.title, j.company_name, j.apply_mode, j.apply_url, j.status, j.posted_by,
              j.notify_email, u.email AS poster_email
         FROM jobs j JOIN users u ON u.id = j.posted_by
        WHERE j.id = $1`,
        [req.params.id]
      );
      const job = jobs[0];
      if (!job || job.status !== 'ACTIVE') {
        return res
          .status(404)
          .json({ success: false, error: 'This job is no longer accepting applications.' });
      }
      if (job.posted_by === req.user.id) {
        return res.status(422).json({ success: false, error: 'You cannot apply to your own job.' });
      }
      if (job.apply_mode === 'EXTERNAL') {
        await db
          .query(
            `INSERT INTO job_applications (job_id, user_id, kind)
           VALUES ($1,$2,'EXTERNAL_CLICK') ON CONFLICT (job_id, user_id) DO NOTHING`,
            [job.id, req.user.id]
          )
          .catch(() => {});
        return res.json({ success: true, data: { external: true, apply_url: job.apply_url } });
      }
      const cover_note = (req.body && req.body.cover_note) || '';
      const resumeFile = req.file;
      if (!resumeFile) {
        return res.status(422).json({
          success: false,
          error: 'A resume file (PDF, DOC or DOCX, up to 5 MB) is required.',
        });
      }
      if (cover_note && cover_note.length > 2000) {
        return res
          .status(422)
          .json({ success: false, error: 'Cover note must be under 2,000 characters.' });
      }
      // Resume is intentionally NOT stored — resume_url stays NULL. Only the
      // application record (cover note) is persisted; the file is emailed below.
      const { rows } = await db.query(
        `INSERT INTO job_applications (job_id, user_id, kind, cover_note)
       VALUES ($1,$2,'IN_PLATFORM',$3)
       ON CONFLICT (job_id, user_id) DO NOTHING
       RETURNING id, status, created_at`,
        [job.id, req.user.id, cover_note.trim() || null]
      );
      if (!rows.length) {
        return res
          .status(409)
          .json({ success: false, error: 'You have already applied to this job.' });
      }
      // Notify the recruiter (in-app)
      jobNotify(
        job.posted_by,
        'job_application',
        `New applicant: ${job.title}`,
        `${req.user.full_name} applied to ${job.title}.`,
        { job_id: job.id, application_id: rows[0].id }
      );
      // Email the resume (as an attachment) to the address chosen by the poster
      // (fallback: poster's account email). The buffer is discarded after send.
      const notifyTo = job.notify_email || job.poster_email;
      if (notifyTo) {
        const escHtml = s =>
          String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        const noteHtml = cover_note
          ? `<p><strong>Cover note:</strong></p><blockquote style="border-left:3px solid #ccc;margin:0;padding:4px 12px;color:#444">${escHtml(cover_note)}</blockquote>`
          : '';
        sendMail({
          to: notifyTo,
          subject: `New application: ${job.title} — ${req.user.full_name}`,
          html:
            `<p><strong>${escHtml(req.user.full_name)}</strong> (${escHtml(req.user.email)}) ` +
            `applied for <strong>${escHtml(job.title)}</strong> at ${escHtml(job.company_name)}.</p>` +
            `<p style="color:#444">📎 Resume attached: <strong>${escHtml(resumeFile.originalname)}</strong></p>` +
            noteHtml +
            `<p style="color:#888;font-size:12px">Sent by the Rising Edge Jobs Board.</p>`,
          attachments: [
            {
              filename: resumeFile.originalname || 'resume.pdf',
              content: resumeFile.buffer.toString('base64'),
            },
          ],
        }).catch(e => console.error('[jobs/apply-email]', e.message));
      }
      res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
      console.error('[jobs/apply]', err);
      res.status(500).json({ success: false, error: 'Could not submit application.' });
    }
  }
);

// ── Auth: my applications ──────────────────────────────────────────
app.get('/api/me/job-applications', verifyAccessToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT a.id, a.kind, a.status, a.created_at,
              j.id AS job_id, j.title, j.company_name, j.status AS job_status
         FROM job_applications a JOIN jobs j ON j.id = a.job_id
        WHERE a.user_id = $1 ORDER BY a.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[jobs/mine]', err);
    res.status(500).json({ success: false, error: 'Could not load applications.' });
  }
});

// ── Job body validation shared by POST (create) and PATCH (edit) ───
function parseJobBody(b, opts) {
  const errors = [];
  if (!b.title || !b.title.trim()) errors.push('title is required');
  if (!b.company_name || !b.company_name.trim()) errors.push('company_name is required');
  if (!b.description_md || !b.description_md.trim()) errors.push('description is required');
  if (b.description_md && b.description_md.length > 10000) {
    errors.push('description must be under 10,000 characters');
  }
  const disciplines = (Array.isArray(b.disciplines) ? b.disciplines : []).filter(d =>
    JOB_DISCIPLINES.includes(d)
  );
  if (!disciplines.length) errors.push('at least one valid discipline is required');
  if (!JOB_TYPES.includes(b.employment_type)) errors.push('invalid employment_type');
  if (!JOB_EXP.includes(b.experience_level)) errors.push('invalid experience_level');
  if (!JOB_MODES.includes(b.work_mode)) errors.push('invalid work_mode');
  const applyMode = b.apply_mode === 'EXTERNAL' ? 'EXTERNAL' : 'IN_PLATFORM';
  if (applyMode === 'EXTERNAL' && !/^https?:\/\/.+/i.test(b.apply_url || '')) {
    errors.push('apply_url (http/https) is required for external apply');
  }
  // Optional links to the same job on other platforms (LinkedIn, Naukri, …)
  const platformLinks = (Array.isArray(b.platform_links) ? b.platform_links : [])
    .slice(0, 6)
    .map(l => ({
      platform: JOB_PLATFORMS.includes(l && l.platform) ? l.platform : 'OTHER',
      label: String((l && l.label) || '')
        .trim()
        .slice(0, 40),
      url: String((l && l.url) || '').trim(),
    }))
    .filter(l => l.url);
  for (const l of platformLinks) {
    if (!/^https?:\/\/.+/i.test(l.url)) {
      errors.push('platform link URLs must start with http:// or https://');
      break;
    }
  }
  const skills = (Array.isArray(b.skills) ? b.skills : [])
    .map(s => String(s).trim())
    .filter(Boolean)
    .slice(0, 15);
  const notifyEmail = String(b.notify_email || '').trim();
  if (notifyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail)) {
    errors.push('notify_email is not a valid email address');
  }
  // In-platform jobs need a "send resumes to" address so applications reach a
  // real inbox — required for manual posts/edits, but skipped for bulk imports
  // (bulk rows may legitimately omit it; those simply fall back to the poster).
  const isBulk = !!(opts && opts.bulk);
  if (!isBulk && applyMode === 'IN_PLATFORM' && !notifyEmail) {
    errors.push('Send resumes to (email) is required for in-platform applications.');
  }
  const removeDate = String(b.remove_date || '').trim();
  if (removeDate && isNaN(Date.parse(removeDate))) {
    errors.push('remove_date is not a valid date');
  }
  // Ordered values matching the jobs column list used in both routes
  const values = [
    (b.title || '').trim(),
    (b.company_name || '').trim(),
    disciplines,
    b.employment_type,
    b.experience_level,
    (b.location || '').trim() || null,
    b.work_mode,
    (b.description_md || '').trim(),
    skills,
    Number.isFinite(+b.salary_min) && +b.salary_min > 0 ? Math.round(+b.salary_min) : null,
    Number.isFinite(+b.salary_max) && +b.salary_max > 0 ? Math.round(+b.salary_max) : null,
    (b.salary_currency || 'INR').slice(0, 8),
    !!b.salary_hidden,
    applyMode,
    applyMode === 'EXTERNAL' ? b.apply_url.trim() : null,
    JSON.stringify(platformLinks),
    notifyEmail || null,
    b.deadline || null,
    removeDate || null,
  ];
  return { errors, values };
}

function jobNotify(userId, type, title, message, data) {
  return db
    .query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1,$2,$3,$4,$5)`,
      [userId, type, title, message, JSON.stringify(data || {})]
    )
    .catch(() => {});
}

// ── Recruiter/Admin: post a job (publishes immediately) ────────────
app.post('/api/jobs', verifyAccessToken, canPostJobs, async (req, res) => {
  try {
    const { errors, values } = parseJobBody(req.body || {}, {
      bulk: !!(req.body && req.body.bulk),
    });
    if (errors.length) return res.status(422).json({ success: false, error: errors.join('; ') });
    const { rows } = await db.query(
      `INSERT INTO jobs (posted_by, title, company_name, disciplines, employment_type,
                         experience_level, location, work_mode, description_md, skills,
                         salary_min, salary_max, salary_currency, salary_hidden,
                         apply_mode, apply_url, platform_links, notify_email, deadline,
                         remove_at, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
               COALESCE($20::timestamptz, NOW() + interval '21 days'), 'ACTIVE')
       RETURNING id`,
      [req.user.id, ...values]
    );
    res.status(201).json({ success: true, data: { id: rows[0].id } });
  } catch (err) {
    console.error('[jobs/post]', err);
    res.status(500).json({ success: false, error: 'Could not post job.' });
  }
});

// ── Recruiter/Admin: edit a posting (owner or admin) ───────────────
app.patch('/api/jobs/:id', verifyAccessToken, canPostJobs, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    const { errors, values } = parseJobBody(req.body || {}, {
      bulk: !!(req.body && req.body.bulk),
    });
    if (errors.length) return res.status(422).json({ success: false, error: errors.join('; ') });
    const params = [...values, req.params.id];
    if (!isAdmin) params.push(req.user.id);
    const { rows } = await db.query(
      `UPDATE jobs SET
          title=$1, company_name=$2, disciplines=$3, employment_type=$4,
          experience_level=$5, location=$6, work_mode=$7, description_md=$8, skills=$9,
          salary_min=$10, salary_max=$11, salary_currency=$12, salary_hidden=$13,
          apply_mode=$14, apply_url=$15, platform_links=$16, notify_email=$17, deadline=$18,
          remove_at=COALESCE($19::timestamptz, created_at + interval '21 days'),
          updated_at=NOW()
        WHERE id=$20 AND status <> 'DELETED' ${isAdmin ? '' : 'AND posted_by=$21'}
        RETURNING id`,
      params
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Job not found or not yours.' });
    }
    res.json({ success: true, data: { id: rows[0].id } });
  } catch (err) {
    console.error('[jobs/edit]', err);
    res.status(500).json({ success: false, error: 'Could not update job.' });
  }
});

// ── Recruiter/Admin: delete a posting (soft delete) ────────────────
app.delete('/api/jobs/:id', verifyAccessToken, canPostJobs, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    const { rows } = await db.query(
      `UPDATE jobs SET status='DELETED', updated_at=NOW()
        WHERE id=$1 AND status <> 'DELETED' ${isAdmin ? '' : 'AND posted_by=$2'}
        RETURNING id`,
      isAdmin ? [req.params.id] : [req.params.id, req.user.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Job not found or not yours.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[jobs/delete]', err);
    res.status(500).json({ success: false, error: 'Could not delete job.' });
  }
});

// ── Recruiter/Admin: reopen a closed/expired posting ───────────────
app.post('/api/recruiter/jobs/:id/reopen', verifyAccessToken, canPostJobs, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    const { rows } = await db.query(
      `UPDATE jobs SET status='ACTIVE', updated_at=NOW()
        WHERE id=$1 AND status IN ('CLOSED','EXPIRED') ${isAdmin ? '' : 'AND posted_by=$2'}
        RETURNING id`,
      isAdmin ? [req.params.id] : [req.params.id, req.user.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Job not found or not yours.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[jobs/reopen]', err);
    res.status(500).json({ success: false, error: 'Could not reopen job.' });
  }
});

// ── Recruiter/Admin: update an applicant's status ──────────────────
app.patch(
  '/api/recruiter/applications/:id/status',
  verifyAccessToken,
  canPostJobs,
  async (req, res) => {
    try {
      const allowed = ['VIEWED', 'SHORTLISTED', 'REJECTED', 'HIRED'];
      const { status } = req.body || {};
      if (!allowed.includes(status)) {
        return res
          .status(422)
          .json({ success: false, error: `status must be one of: ${allowed.join(', ')}` });
      }
      const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
      const params = [status, req.params.id];
      if (!isAdmin) params.push(req.user.id);
      const { rows } = await db.query(
        `UPDATE job_applications a SET status=$1, updated_at=NOW()
           FROM jobs j
          WHERE a.id=$2 AND j.id=a.job_id ${isAdmin ? '' : 'AND j.posted_by=$3'}
          RETURNING a.id, a.user_id, a.status, j.title, j.company_name, j.id AS job_id`,
        params
      );
      if (!rows.length) {
        return res.status(404).json({ success: false, error: 'Application not found.' });
      }
      const a = rows[0];
      // Notify the candidate (skip the silent VIEWED transition)
      if (status !== 'VIEWED') {
        const nice = { SHORTLISTED: 'shortlisted 🎉', REJECTED: 'not selected', HIRED: 'hired 🎉' };
        jobNotify(
          a.user_id,
          'job_application',
          `Application update: ${a.title}`,
          `Your application for ${a.title} at ${a.company_name} was ${nice[status]}.`,
          { job_id: a.job_id, application_id: a.id, status }
        );
      }
      res.json({ success: true, data: { id: a.id, status: a.status } });
    } catch (err) {
      console.error('[jobs/app-status]', err);
      res.status(500).json({ success: false, error: 'Could not update application.' });
    }
  }
);

// ── Auth: withdraw my application ──────────────────────────────────
app.delete('/api/me/job-applications/:id', verifyAccessToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `DELETE FROM job_applications WHERE id=$1 AND user_id=$2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Application not found.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[jobs/withdraw]', err);
    res.status(500).json({ success: false, error: 'Could not withdraw application.' });
  }
});

// ── Recruiter/Admin: my postings ───────────────────────────────────
app.get('/api/recruiter/jobs', verifyAccessToken, canPostJobs, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    const { rows } = await db.query(
      `SELECT j.id, j.title, j.company_name, j.status, j.apply_mode, j.views_count, j.created_at,
              (SELECT COUNT(*)::int FROM job_applications a WHERE a.job_id = j.id) AS applications
         FROM jobs j
        WHERE j.status <> 'DELETED' ${isAdmin ? '' : 'AND j.posted_by = $1'}
        ORDER BY j.created_at DESC`,
      isAdmin ? [] : [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[jobs/recruiter]', err);
    res.status(500).json({ success: false, error: 'Could not load your jobs.' });
  }
});

// ── Recruiter/Admin: close own job ─────────────────────────────────
app.post('/api/recruiter/jobs/:id/close', verifyAccessToken, canPostJobs, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    const { rows } = await db.query(
      `UPDATE jobs SET status='CLOSED', updated_at=NOW()
        WHERE id = $1 AND status = 'ACTIVE' ${isAdmin ? '' : 'AND posted_by = $2'}
        RETURNING id`,
      isAdmin ? [req.params.id] : [req.params.id, req.user.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Job not found or not yours.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[jobs/close]', err);
    res.status(500).json({ success: false, error: 'Could not close job.' });
  }
});

// ── Recruiter/Admin: applicants for a job ──────────────────────────
app.get(
  '/api/recruiter/jobs/:id/applications',
  verifyAccessToken,
  canPostJobs,
  async (req, res) => {
    try {
      const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
      const { rows: jobs } = await db.query(`SELECT posted_by FROM jobs WHERE id = $1`, [
        req.params.id,
      ]);
      if (!jobs.length) return res.status(404).json({ success: false, error: 'Job not found.' });
      if (!isAdmin && jobs[0].posted_by !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Not your job posting.' });
      }
      const { rows } = await db.query(
        `SELECT a.id, a.kind, a.resume_url, a.cover_note, a.status, a.created_at,
              u.full_name, u.email, u."current_role", u.org, u.location, u.linkedin_url
         FROM job_applications a JOIN users u ON u.id = a.user_id
        WHERE a.job_id = $1 ORDER BY a.created_at DESC`,
        [req.params.id]
      );
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error('[jobs/applicants]', err);
      res.status(500).json({ success: false, error: 'Could not load applicants.' });
    }
  }
);

/* ════════════════════════════════════════════════════════════════════
   TRAINING SOCIAL API — feedback (likes removed)
════════════════════════════════════════════════════════════════════ */

const TRAINING_SLUG_RE = /^[A-Za-z0-9/_-]{1,80}$/;

// Views, visitors and likes were removed (no longer recorded or shown). The
// endpoints below stay as no-database stubs so older cached pages don't error.
app.get('/api/trainings/views', (_req, res) => {
  // Views/visitors are no longer recorded or shown.
  res.json({ success: true, data: {} });
});

app.get('/api/trainings/likes', (_req, res) => {
  // Likes are no longer recorded or shown.
  res.json({ success: true, data: {} });
});

app.get('/api/me/training-likes', (_req, res) => {
  res.json({ success: true, data: [] });
});

app.post('/api/trainings/like', (_req, res) => {
  res.status(410).json({ success: false, error: 'Likes are no longer available.' });
});

// Auth: submit feedback for a training
app.post('/api/trainings/feedback', verifyAccessToken, async (req, res) => {
  try {
    const slug = String((req.body || {}).slug || '').trim();
    const message = String((req.body || {}).message || '').trim();
    if (!TRAINING_SLUG_RE.test(slug)) {
      return res.status(422).json({ success: false, error: 'Invalid training slug.' });
    }
    if (!message || message.length > 2000) {
      return res
        .status(422)
        .json({ success: false, error: 'Feedback must be 1–2,000 characters.' });
    }
    await db.query(
      `INSERT INTO training_feedback (user_id, training_slug, message) VALUES ($1,$2,$3)`,
      [req.user.id, slug, message]
    );
    // In-app notification to admins
    const { rows: admins } = await db.query(
      `SELECT id FROM users WHERE role IN ('ADMIN','SUPER_ADMIN') AND status='ACTIVE'`
    );
    for (const a of admins) {
      jobNotify(
        a.id,
        'training_feedback',
        `Training feedback: ${slug}`,
        `${req.user.full_name}: ${message.slice(0, 200)}${message.length > 200 ? '…' : ''}`,
        { training_slug: slug, from: req.user.id }
      );
    }
    res.status(201).json({ success: true });
    // Respond first, email after — a slow/unreachable mail API should never
    // hold up the client-facing request (same pattern as /api/contact).
    sendMail({
      to: 'info@risingedgetech.com',
      subject: `Training feedback: ${slug}`,
      html: feedbackEmailHtml({
        kind: 'Training',
        label: slug,
        fromName: req.user.full_name,
        fromEmail: req.user.email,
        message,
      }),
    }).catch(e => console.error('[trainings/feedback email]', e.message));
  } catch (err) {
    console.error('[trainings/feedback]', err);
    res.status(500).json({ success: false, error: 'Could not submit feedback.' });
  }
});

// ── Training progress: per-lesson completion + "resume where you left off" ──
// course_id/lesson_id are derived client-side from the lesson's URL path
// (e.g. "Circuit/DDR4" / "01-introduction") — no separate course registry
// needed, so this works for any course without server-side changes.
const COURSE_ID_RE = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*$/;
const LESSON_ID_RE = /^[A-Za-z0-9_-]+$/;

app.get('/api/training/progress', verifyAccessToken, async (req, res) => {
  try {
    const courseId = String(req.query.course || '').trim();
    if (!COURSE_ID_RE.test(courseId)) {
      return res.status(422).json({ success: false, error: 'Invalid course id.' });
    }
    const { rows } = await db.query(
      `SELECT lesson_id, completed, completed_at, last_viewed_at
         FROM training_progress
        WHERE user_id = $1 AND course_id = $2`,
      [req.user.id, courseId]
    );
    const lessons = {};
    let lastLessonId = null;
    let lastViewedAt = null;
    for (const r of rows) {
      lessons[r.lesson_id] = { completed: r.completed, completedAt: r.completed_at };
      if (!lastViewedAt || r.last_viewed_at > lastViewedAt) {
        lastViewedAt = r.last_viewed_at;
        lastLessonId = r.lesson_id;
      }
    }
    res.json({ success: true, data: { lessons, lastLessonId } });
  } catch (err) {
    console.error('[training/progress/get]', err);
    res.status(500).json({ success: false, error: 'Could not load progress.' });
  }
});

app.post('/api/training/progress', verifyAccessToken, async (req, res) => {
  try {
    const courseId = String((req.body || {}).course_id || '').trim();
    const lessonId = String((req.body || {}).lesson_id || '').trim();
    if (!COURSE_ID_RE.test(courseId) || !LESSON_ID_RE.test(lessonId)) {
      return res.status(422).json({ success: false, error: 'Invalid course_id/lesson_id.' });
    }
    // Three states: true (mark complete), false (mark incomplete), or
    // omitted (just a "visited this lesson" ping — leaves completion as-is).
    const body = req.body || {};
    const completedParam = typeof body.completed === 'boolean' ? body.completed : null;
    const { rows } = await db.query(
      `INSERT INTO training_progress (user_id, course_id, lesson_id, completed, completed_at, last_viewed_at)
       VALUES ($1,$2,$3, COALESCE($4,false), CASE WHEN $4 THEN NOW() ELSE NULL END, NOW())
       ON CONFLICT (user_id, course_id, lesson_id) DO UPDATE SET
         last_viewed_at = NOW(),
         completed = CASE WHEN $4::boolean IS NULL THEN training_progress.completed ELSE $4 END,
         completed_at = CASE WHEN $4::boolean IS NULL THEN training_progress.completed_at
                             WHEN $4 THEN NOW() ELSE NULL END,
         updated_at = NOW()
       RETURNING completed, completed_at, last_viewed_at`,
      [req.user.id, courseId, lessonId, completedParam]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[training/progress/post]', err);
    res.status(500).json({ success: false, error: 'Could not save progress.' });
  }
});

// ════════════════════════════════════════════════════════════════════
// CONTENT SOCIAL API — likes, views & feedback for resources & tools
// Generalized counterpart to the training-social system above, keyed by
// (kind, content_id) since resources/tools already have stable DB ids.
// ════════════════════════════════════════════════════════════════════

const CONTENT_KINDS = ['resource', 'tool'];
const CONTENT_ID_RE = /^[A-Za-z0-9_-]{1,80}$/;

function validKind(kind) {
  return CONTENT_KINDS.indexOf(kind) !== -1;
}

// Shared HTML for every "send feedback" email (training/resource/tool) so
// all three look and read the same in the info@risingedgetech.com inbox.
function feedbackEmailHtml({ kind, label, fromName, fromEmail, message }) {
  return `
    <h2 style="font-family:sans-serif;margin-bottom:16px">New ${kind} Feedback</h2>
    <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
      <tr><td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap"><strong>${kind}</strong></td><td>${label}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap"><strong>From</strong></td><td>${fromName} (<a href="mailto:${fromEmail}">${fromEmail}</a>)</td></tr>
    </table>
    <p style="font-family:sans-serif;font-size:14px;white-space:pre-wrap;margin-top:16px;border-top:1px solid #eee;padding-top:12px">${message.replace(/</g, '&lt;')}</p>
  `;
}

// Public: views/visitors/likes for every resource or tool of a given kind
// → { "<id>": { views, visitors, likes }, … }
app.get('/api/content/:kind/social', (_req, res) => {
  // Views/visitors/likes are no longer recorded or shown.
  res.json({ success: true, data: {} });
});

// Public: record a view (click-through from the catalogue card). Works the
// same whether the card's url is an internal page or an external link.
app.post('/api/content/:kind/:id/view', (_req, res) => {
  // Views are no longer recorded (kept for older cached pages).
  res.status(204).end();
});

// Auth: content ids (with kind) the current user has liked, across both
// resources and tools → [{ kind, content_id }, …]
app.get('/api/me/content-likes', (_req, res) => {
  res.json({ success: true, data: [] });
});

// Auth: toggle like → { liked, count }
app.post('/api/content/:kind/:id/like', (_req, res) => {
  res.status(410).json({ success: false, error: 'Likes are no longer available.' });
});

// Auth: submit feedback for a resource or tool — emails info@risingedgetech.com
app.post('/api/content/:kind/:id/feedback', verifyAccessToken, async (req, res) => {
  const kind = req.params.kind;
  const id = req.params.id;
  if (!validKind(kind) || !CONTENT_ID_RE.test(id)) {
    return res.status(404).json({ success: false, error: 'Unknown content.' });
  }
  try {
    const message = String((req.body || {}).message || '').trim();
    if (!message || message.length > 2000) {
      return res
        .status(422)
        .json({ success: false, error: 'Feedback must be 1–2,000 characters.' });
    }
    await db.query(
      `INSERT INTO content_feedback (kind, content_id, user_id, message) VALUES ($1,$2,$3,$4)`,
      [kind, id, req.user.id, message]
    );
    const table = kind === 'resource' ? 'resources' : 'tools';
    const { rows: itemRows } = await db.query(`SELECT title FROM ${table} WHERE id=$1`, [id]);
    const label = (itemRows[0] && itemRows[0].title) || id;

    const { rows: admins } = await db.query(
      `SELECT id FROM users WHERE role IN ('ADMIN','SUPER_ADMIN') AND status='ACTIVE'`
    );
    for (const a of admins) {
      jobNotify(
        a.id,
        `${kind}_feedback`,
        `${kind === 'resource' ? 'Resource' : 'Tool'} feedback: ${label}`,
        `${req.user.full_name}: ${message.slice(0, 200)}${message.length > 200 ? '…' : ''}`,
        { kind, content_id: id, from: req.user.id }
      );
    }
    res.status(201).json({ success: true });
    sendMail({
      to: 'info@risingedgetech.com',
      subject: `${kind === 'resource' ? 'Resource' : 'Tool'} feedback: ${label}`,
      html: feedbackEmailHtml({
        kind: kind === 'resource' ? 'Resource' : 'Tool',
        label,
        fromName: req.user.full_name,
        fromEmail: req.user.email,
        message,
      }),
    }).catch(e => console.error('[content/feedback email]', e.message));
  } catch (err) {
    console.error('[content/feedback]', err);
    res.status(500).json({ success: false, error: 'Could not submit feedback.' });
  }
});

// Admin
const admin = express.Router();
admin.use(verifyAccessToken, requireRole('ADMIN', 'SUPER_ADMIN'));

admin.get('/users', async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.status, u.email_verified,
              u.last_login_at, u.created_at,
              COALESCE(ts.plan_id, us.plan_id, 'basic') AS plan,
              COALESCE(ts.expiry_date, us.end_date)     AS plan_expiry,
              COALESCE(us.status, 'ACTIVE')              AS sub_status,
              COALESCE(enr.enrollment_count, 0)::int     AS enrollment_count,
              COALESCE(rev.total_revenue,    0)           AS total_revenue
         FROM users u
         LEFT JOIN user_subscriptions us  ON us.user_id = u.id
         LEFT JOIN tool_subscriptions ts  ON ts.user_id = u.id AND ts.status = 'active'
         LEFT JOIN (
           SELECT user_id, COUNT(DISTINCT course_id) AS enrollment_count
             FROM (
               SELECT user_id, course_id FROM course_enrollments
               UNION
               SELECT user_id, course_id FROM course_purchases WHERE payment_status = 'paid'
             ) all_enroll
            GROUP BY user_id
         ) enr ON enr.user_id = u.id
         LEFT JOIN (
           SELECT user_id, SUM(paid_amount) AS total_revenue
             FROM course_purchases
            WHERE payment_status = 'paid'
            GROUP BY user_id
         ) rev ON rev.user_id = u.id
         ORDER BY u.created_at DESC
         LIMIT 500`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[admin/users]', err);
    res.status(500).json({ success: false, error: 'Could not fetch users.' });
  }
});

admin.patch('/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'];
    if (!allowed.includes(status)) {
      return res
        .status(422)
        .json({ success: false, error: `status must be one of: ${allowed.join(', ')}` });
    }
    const { rows } = await db.query(
      `UPDATE users SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING id,full_name,email,status`,
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'User not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[admin/status]', err);
    res.status(500).json({ success: false, error: 'Could not update status.' });
  }
});

admin.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const allowed = ['USER', 'RECRUITER', 'ADMIN', 'SUPER_ADMIN'];
    if (!allowed.includes(role)) {
      return res
        .status(422)
        .json({ success: false, error: `role must be one of: ${allowed.join(', ')}` });
    }
    const { rows } = await db.query(
      `UPDATE users SET role=$1,updated_at=NOW() WHERE id=$2 RETURNING id,full_name,email,role`,
      [role, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'User not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[admin/role]', err);
    res.status(500).json({ success: false, error: 'Could not update role.' });
  }
});

admin.patch('/users/:id/plan', async (req, res) => {
  try {
    const { plan, expiryDate } = req.body;
    const allowed = ['basic', 'advanced', 'premium'];
    if (!allowed.includes(plan)) {
      return res
        .status(422)
        .json({ success: false, error: `plan must be one of: ${allowed.join(', ')}` });
    }
    let endDate = null;
    if (expiryDate) {
      endDate = new Date(expiryDate);
      if (isNaN(endDate.getTime())) {
        return res.status(422).json({ success: false, error: 'Invalid expiry date.' });
      }
    }
    const userCheck = await db.query('SELECT id FROM users WHERE id=$1', [req.params.id]);
    if (!userCheck.rows.length) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    // Grant the same access a real purchase would: sync BOTH user_subscriptions
    // (course access — see plan_course_access checks) and tool_subscriptions
    // (tool access/credits) via the same helper the Cashfree payment flow uses,
    // so an admin-set plan takes effect everywhere immediately, not just in
    // the users table/list.
    const planRow = (await db.query('SELECT * FROM subscription_plans WHERE id=$1', [plan]))
      .rows[0];
    const credits = planRow ? planRow.monthly_credits || 0 : 0;
    const startDate = new Date();
    await upsertSubscription(
      req.params.id,
      plan,
      'monthly',
      null,
      null,
      null,
      0,
      startDate,
      endDate,
      credits
    );

    res.json({ success: true, data: { plan, plan_expiry: endDate } });
  } catch (err) {
    console.error('[admin/plan]', err);
    res.status(500).json({ success: false, error: 'Could not update plan.' });
  }
});

/* ── Certificates admin ───────────────────────────────────────────────────
 * Real management of certificate_issues: list with recipient/course/status,
 * issue a course certificate to a user, and revoke one. Status is derived
 * from the DB: revoked → "revoked"; expires_at in the past → "expired";
 * otherwise "valid". */

// Map a certificate_issues row to the shape the admin page renders.
function certStatus(row) {
  if (row.revoked) {
    return 'revoked';
  }
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return 'expired';
  }
  return 'valid';
}

// GET /api/admin/certificates — full list + summary counts
admin.get('/certificates', async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT ci.id, ci.cert_number, ci.issued_at, ci.expires_at, ci.revoked,
              ci.revoked_at, ci.revoke_reason, ci.source, ci.challenge_id,
              u.full_name, u.email,
              COALESCE(c.title, ch.title) AS course_title
         FROM certificate_issues ci
         JOIN users u ON u.id = ci.user_id
         LEFT JOIN courses c ON c.id = ci.course_id
         LEFT JOIN challenges ch ON ch.id = ci.challenge_id
        ORDER BY ci.issued_at DESC
        LIMIT 1000`
    );
    const data = rows.map(r => ({
      id: r.id,
      certNumber: r.cert_number,
      name: r.full_name || (r.email || '').split('@')[0],
      email: r.email,
      course: r.course_title || (r.challenge_id ? 'Weekly Challenge' : r.source || '—'),
      issuedAt: r.issued_at,
      expiresAt: r.expires_at,
      status: certStatus(r),
      revokeReason: r.revoke_reason || null,
    }));
    let valid = 0;
    let revoked = 0;
    let expired = 0;
    data.forEach(d => {
      if (d.status === 'valid') {
        valid++;
      } else if (d.status === 'revoked') {
        revoked++;
      } else if (d.status === 'expired') {
        expired++;
      }
    });
    res.json({
      success: true,
      data,
      meta: { total: data.length, valid, revoked, expired },
    });
  } catch (err) {
    console.error('[admin/certificates/list]', err);
    res.status(500).json({ success: false, error: 'Could not load certificates.' });
  }
});

// POST /api/admin/certificates — issue a course certificate to a user by email
admin.post('/certificates', async (req, res) => {
  const email = String((req.body || {}).email || '')
    .trim()
    .toLowerCase();
  const courseId = String((req.body || {}).courseId || '').trim();
  if (!email || !courseId) {
    return res
      .status(400)
      .json({ success: false, error: 'Recipient email and course are required.' });
  }
  try {
    const { rows: urows } = await db.query('SELECT id, full_name FROM users WHERE email=$1', [
      email,
    ]);
    if (!urows.length) {
      return res.status(404).json({ success: false, error: 'No user found with that email.' });
    }
    const { rows: crows } = await db.query('SELECT id, title FROM courses WHERE id=$1', [courseId]);
    if (!crows.length) {
      return res.status(404).json({ success: false, error: 'Course not found.' });
    }
    // Avoid duplicate active certificates for the same user+course.
    const dup = await db.query(
      `SELECT id FROM certificate_issues WHERE user_id=$1 AND course_id=$2 AND revoked=FALSE`,
      [urows[0].id, courseId]
    );
    if (dup.rows.length) {
      return res.status(409).json({
        success: false,
        error: 'This user already holds a valid certificate for that course.',
      });
    }
    const { rows } = await db.query(
      `INSERT INTO certificate_issues (user_id, course_id, source)
       VALUES ($1, $2, 'course')
       RETURNING id, cert_number, issued_at`,
      [urows[0].id, courseId]
    );
    db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data)
       VALUES ($1,'ISSUE_CERTIFICATE','certificate',$2,$3)`,
      [req.user && req.user.id, rows[0].id, JSON.stringify({ email, courseId })]
    ).catch(() => {});
    res.status(201).json({
      success: true,
      data: {
        id: rows[0].id,
        certNumber: rows[0].cert_number,
        name: urows[0].full_name || email.split('@')[0],
        email,
        course: crows[0].title,
        issuedAt: rows[0].issued_at,
        status: 'valid',
      },
    });
  } catch (err) {
    console.error('[admin/certificates/issue]', err);
    res.status(500).json({ success: false, error: 'Could not issue certificate.' });
  }
});

// PATCH /api/admin/certificates/:id/revoke — revoke with an optional reason
admin.patch('/certificates/:id/revoke', async (req, res) => {
  const reason = String((req.body || {}).reason || '').trim() || null;
  try {
    const { rows } = await db.query(
      `UPDATE certificate_issues
          SET revoked=TRUE, revoked_at=NOW(), revoke_reason=$2
        WHERE id=$1 AND revoked=FALSE
        RETURNING id, cert_number`,
      [req.params.id, reason]
    );
    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, error: 'Certificate not found or already revoked.' });
    }
    db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data)
       VALUES ($1,'REVOKE_CERTIFICATE','certificate',$2,$3)`,
      [req.user && req.user.id, req.params.id, JSON.stringify({ reason })]
    ).catch(() => {});
    res.json({ success: true, data: { id: rows[0].id, certNumber: rows[0].cert_number } });
  } catch (err) {
    console.error('[admin/certificates/revoke]', err);
    res.status(500).json({ success: false, error: 'Could not revoke certificate.' });
  }
});

admin.get('/stats', async (_req, res) => {
  try {
    const [total, active, pending, { rows: planRows }] = await Promise.all([
      db.query('SELECT COUNT(*) FROM users'),
      db.query("SELECT COUNT(*) FROM users WHERE status='ACTIVE'"),
      db.query("SELECT COUNT(*) FROM users WHERE status='PENDING_VERIFICATION'"),
      db.query('SELECT plan_id AS plan, COUNT(*) FROM user_subscriptions GROUP BY plan_id'),
    ]);
    res.json({
      success: true,
      data: {
        totalUsers: Number(total.rows[0].count),
        activeUsers: Number(active.rows[0].count),
        pendingUsers: Number(pending.rows[0].count),
        planBreakdown: planRows,
      },
    });
  } catch (err) {
    console.error('[admin/stats]', err);
    res.status(500).json({ success: false, error: 'Could not fetch stats.' });
  }
});

admin.get('/subscriptions', async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.id,s.user_id,u.full_name,u.email,s.plan_id AS plan,s.status,s.start_date,s.end_date,s.created_at,s.updated_at
         FROM user_subscriptions s JOIN users u ON u.id=s.user_id ORDER BY s.created_at DESC LIMIT 500`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[admin/subscriptions]', err);
    res.status(500).json({ success: false, error: 'Could not fetch subscriptions.' });
  }
});

admin.get('/login-history', async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT lh.id,lh.user_id,u.full_name,u.email,lh.ip_address,lh.user_agent,lh.success,lh.created_at
         FROM login_history lh JOIN users u ON u.id=lh.user_id ORDER BY lh.created_at DESC LIMIT 500`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[admin/login-history]', err);
    res.status(500).json({ success: false, error: 'Could not fetch login history.' });
  }
});

admin.get('/refresh-tokens', async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT rt.id,rt.user_id,u.full_name,u.email,rt.ip_address,rt.device_info,rt.expires_at,rt.created_at
         FROM refresh_tokens rt JOIN users u ON u.id=rt.user_id ORDER BY rt.created_at DESC LIMIT 500`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[admin/refresh-tokens]', err);
    res.status(500).json({ success: false, error: 'Could not fetch refresh tokens.' });
  }
});

admin.delete('/refresh-tokens/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM refresh_tokens WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ success: false, error: 'Token not found.' });
    res.json({ success: true, message: 'Token revoked.' });
  } catch (err) {
    console.error('[admin/revoke-token]', err);
    res.status(500).json({ success: false, error: 'Could not revoke token.' });
  }
});

// Course list with enrollment stats (admin)
admin.get('/courses', async (_req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT c.id, c.title, c.category, c.description, c.status,
             c.modules_count, c.href, c.gradient, c.badge_color,
             c.original_price, c.discounted_price, c.demo_link, c.slug, c.created_at,
             COALESCE(p.enrollment_count, 0)::int  AS enrollment_count,
             COALESCE(p.total_revenue,    0)        AS total_revenue
        FROM courses c
        LEFT JOIN (
          SELECT course_id,
                 COUNT(*)          AS enrollment_count,
                 SUM(paid_amount)  AS total_revenue
            FROM course_purchases
           WHERE payment_status = 'paid'
           GROUP BY course_id
        ) p ON p.course_id = c.id
       ORDER BY c.discounted_price, c.created_at
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[admin/courses/list]', err);
    res.status(500).json({ success: false, error: 'Could not fetch courses.' });
  }
});

// Course CRUD (admin)
admin.post('/courses', async (req, res) => {
  const {
    title,
    category,
    description,
    status,
    modules_count,
    href,
    gradient,
    badge_color,
    original_price,
    discounted_price,
    demo_link,
  } = req.body;
  if (!title || !category) {
    return res.status(400).json({ success: false, error: 'title and category are required.' });
  }
  const id =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) +
    '-' +
    Date.now().toString(36);
  try {
    const { rows } = await db.query(
      `INSERT INTO courses (id,title,category,description,status,modules_count,href,gradient,badge_color,original_price,discounted_price,demo_link)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        id,
        title,
        category,
        description || '',
        status || 'draft',
        modules_count || 0,
        href || 'Trainings/trainings.html',
        gradient || 'linear-gradient(135deg,#0f2040,#0e3a5c)',
        badge_color || 'cyan',
        parseFloat(original_price) || 0,
        parseFloat(discounted_price) || 0,
        demo_link || null,
      ]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[admin/courses/create]', err);
    res.status(500).json({ success: false, error: 'Could not create course.' });
  }
});

admin.patch('/courses/:id', async (req, res) => {
  const {
    title,
    category,
    description,
    status,
    modules_count,
    href,
    gradient,
    badge_color,
    original_price,
    discounted_price,
    demo_link,
  } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE courses SET title=$1,category=$2,description=$3,status=$4,modules_count=$5,
         href=$6,gradient=$7,badge_color=$8,original_price=$9,discounted_price=$10,demo_link=$11,updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [
        title,
        category,
        description || '',
        status || 'draft',
        modules_count || 0,
        href || 'Trainings/trainings.html',
        gradient || '',
        badge_color || 'cyan',
        parseFloat(original_price) || 0,
        parseFloat(discounted_price) || 0,
        demo_link || null,
        req.params.id,
      ]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Course not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[admin/courses/update]', err);
    res.status(500).json({ success: false, error: 'Could not update course.' });
  }
});

admin.delete('/courses/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM courses WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ success: false, error: 'Course not found.' });
    res.json({ success: true, message: 'Course deleted.' });
  } catch (err) {
    console.error('[admin/courses/delete]', err);
    res.status(500).json({ success: false, error: 'Could not delete course.' });
  }
});

// Update subscription plan prices
admin.put('/plans/:id', async (req, res) => {
  const { id } = req.params;
  const { price_monthly, price_yearly, mrp_monthly, mrp_yearly } = req.body;
  if (price_monthly == null || price_yearly == null) {
    return res
      .status(400)
      .json({ success: false, error: 'price_monthly and price_yearly are required.' });
  }
  const m = parseFloat(price_monthly);
  const y = parseFloat(price_yearly);
  const mm = parseFloat(mrp_monthly ?? m);
  const my = parseFloat(mrp_yearly ?? y);
  if ([m, y, mm, my].some(v => isNaN(v) || v < 0)) {
    return res
      .status(400)
      .json({ success: false, error: 'All prices must be non-negative numbers.' });
  }
  try {
    const { rows } = await db.query(
      `UPDATE subscription_plans
       SET price_monthly=$1, price_yearly=$2, mrp_monthly=$3, mrp_yearly=$4, updated_at=NOW()
       WHERE id=$5
       RETURNING id, name, price_monthly, price_yearly, mrp_monthly, mrp_yearly`,
      [m, y, mm, my, id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Plan not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[admin/plans/update]', err);
    res.status(500).json({ success: false, error: 'Could not update plan.' });
  }
});

// â”€â”€ Coupons (admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
admin.get('/coupons', async (_req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM coupons ORDER BY created_at`);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not fetch coupons.' });
  }
});

admin.post('/coupons', async (req, res) => {
  const { code, type, val, limit_count, expires, applies_to, applicable_ids, per_user_limit } =
    req.body;
  if (!code || !val) {
    return res.status(400).json({ success: false, error: 'code and val are required.' });
  }
  const appliesto = ['all', 'subscriptions', 'courses', 'tools'].includes(applies_to)
    ? applies_to
    : 'all';
  const ids = Array.isArray(applicable_ids) && applicable_ids.length ? applicable_ids : null;
  try {
    const { rows } = await db.query(
      `INSERT INTO coupons (code,type,val,limit_count,expires,applies_to,applicable_ids,per_user_limit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        code.toUpperCase().trim(),
        type || 'percent',
        parseFloat(val),
        parseInt(limit_count) || 100,
        expires || 'No expiry',
        appliesto,
        ids,
        parseInt(per_user_limit) || 1,
      ]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Coupon code already exists.' });
    }
    res.status(500).json({ success: false, error: 'Could not create coupon.' });
  }
});

admin.patch('/coupons/:id', async (req, res) => {
  const allowed = [
    'type',
    'val',
    'limit_count',
    'expires',
    'active',
    'used',
    'applies_to',
    'per_user_limit',
  ];
  const updates = [];
  const vals = [];
  allowed.forEach(f => {
    if (req.body[f] !== undefined) {
      updates.push(`${f}=$${vals.length + 1}`);
      vals.push(req.body[f]);
    }
  });
  // applicable_ids is an array — handle separately
  if (req.body.applicable_ids !== undefined) {
    const ids =
      Array.isArray(req.body.applicable_ids) && req.body.applicable_ids.length
        ? req.body.applicable_ids
        : null;
    updates.push(`applicable_ids=$${vals.length + 1}`);
    vals.push(ids);
  }
  if (!updates.length) return res.status(400).json({ success: false, error: 'Nothing to update.' });
  vals.push(req.params.id);
  try {
    const { rows } = await db.query(
      `UPDATE coupons SET ${updates.join(',')},updated_at=NOW() WHERE id=$${vals.length} RETURNING *`,
      vals
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Coupon not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not update coupon.' });
  }
});

admin.delete('/coupons/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM coupons WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ success: false, error: 'Coupon not found.' });
    res.json({ success: true, message: 'Coupon deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not delete coupon.' });
  }
});

// â”€â”€ Tools (admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
admin.get('/tools', async (_req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM tools ORDER BY sort_order, created_at`);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[admin/tools/get]', err);
    console.error('[tools/get]', err);
    res.status(500).json({ success: false, error: err.message || 'Could not fetch tools.' });
  }
});

admin.post('/tools', async (req, res) => {
  const { title, category, plan, description, url, status } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'title is required.' });
  const id =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) +
    '-' +
    Date.now().toString(36);
  try {
    const { rows } = await db.query(
      `INSERT INTO tools (id,title,category,plan,description,url,status,sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,(SELECT COALESCE(MAX(sort_order),0)+1 FROM tools)) RETURNING *`,
      [
        id,
        title,
        category || 'calculator',
        plan || 'basic',
        description || '',
        url || '#',
        status || 'active',
      ]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[admin/tools/post]', err);
    res.status(500).json({ success: false, error: err.message || 'Could not create tool.' });
  }
});

admin.patch('/tools/:id', async (req, res) => {
  const { title, category, plan, description, url, status } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE tools SET title=$1,category=$2,plan=$3,description=$4,url=$5,status=$6,updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [
        title,
        category || 'calculator',
        plan || 'basic',
        description || '',
        url || '#',
        status || 'active',
        req.params.id,
      ]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Tool not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[admin/tools/patch]', err);
    res.status(500).json({ success: false, error: err.message || 'Could not update tool.' });
  }
});

admin.delete('/tools/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM tools WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ success: false, error: 'Tool not found.' });
    res.json({ success: true, message: 'Tool deleted.' });
  } catch (err) {
    console.error('[admin/tools/delete]', err);
    res.status(500).json({ success: false, error: err.message || 'Could not delete tool.' });
  }
});

// â”€â”€ Resources (admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
admin.get('/resources', async (_req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM resources ORDER BY sort_order, created_at`);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[admin/resources/get]', err);
    console.error('[resources/get]', err);
    res.status(500).json({ success: false, error: err.message || 'Could not fetch resources.' });
  }
});

admin.post('/resources', async (req, res) => {
  const { title, type, plan, description, url, downloads } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'title is required.' });
  const id =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) +
    '-' +
    Date.now().toString(36);
  try {
    const { rows } = await db.query(
      `INSERT INTO resources (id,title,type,plan,description,url,downloads,sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,(SELECT COALESCE(MAX(sort_order),0)+1 FROM resources)) RETURNING *`,
      [
        id,
        title,
        type || 'guide',
        plan || 'basic',
        description || '',
        url || '#',
        parseInt(downloads) || 0,
      ]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[admin/resources/post]', err);
    res.status(500).json({ success: false, error: err.message || 'Could not create resource.' });
  }
});

admin.patch('/resources/:id', async (req, res) => {
  const { title, type, plan, description, url, downloads } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE resources SET title=$1,type=$2,plan=$3,description=$4,url=$5,downloads=$6,updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [
        title,
        type || 'guide',
        plan || 'basic',
        description || '',
        url || '#',
        parseInt(downloads) || 0,
        req.params.id,
      ]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Resource not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[admin/resources/patch]', err);
    res.status(500).json({ success: false, error: err.message || 'Could not update resource.' });
  }
});

admin.delete('/resources/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM resources WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ success: false, error: 'Resource not found.' });
    res.json({ success: true, message: 'Resource deleted.' });
  } catch (err) {
    console.error('[admin/resources/delete]', err);
    res.status(500).json({ success: false, error: err.message || 'Could not delete resource.' });
  }
});

/* ── Website analytics: page-view tracking + visit stats ─── */

/* POST /api/track — public beacon, called from core.js on every page load */
app.post('/api/track', (_req, res) => {
  // Page views/visitors are no longer recorded (kept for older cached pages).
  res.status(204).end();
});

/* POST /api/newsletter/subscribe — public signup from the site footer */
app.post('/api/newsletter/subscribe', async (req, res) => {
  const { email, name } = req.body || {};
  const clean = String(email || '')
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return res.status(400).json({ success: false, error: 'A valid email is required.' });
  }
  try {
    await db.query(
      `INSERT INTO newsletter_subscribers (email, name)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE
         SET status = 'active',
             name = COALESCE(EXCLUDED.name, newsletter_subscribers.name),
             unsubscribed_at = NULL`,
      [clean, String(name || '').slice(0, 120) || null]
    );
    res.json({ success: true, message: 'Subscribed.' });
  } catch (err) {
    console.error('[newsletter/subscribe]', err);
    res.status(500).json({ success: false, error: 'Could not subscribe. Try again later.' });
  }
});

/* ── Broadcast: subscribers list + email/WhatsApp send ─── */
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

async function getBroadcastRecipients(audience, excludeRecruiters) {
  const recipients = [];
  const seen = new Set();
  if (audience === 'superadmin') {
    // Test mode: only SUPER_ADMIN accounts receive the broadcast.
    const { rows } = await db.query(
      `SELECT full_name AS name, email, mobile FROM users
        WHERE role = 'SUPER_ADMIN' AND status NOT IN ('DELETED','SUSPENDED')
        ORDER BY created_at DESC`
    );
    rows.forEach(r => {
      const key = (r.email || '').toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        recipients.push({
          name: r.name,
          email: r.email,
          mobile: r.mobile || null,
          source: 'superadmin',
        });
      }
    });
    return recipients;
  }
  if (audience === 'users' || audience === 'both') {
    const { rows } = await db.query(
      `SELECT full_name AS name, email, mobile FROM users
        WHERE status NOT IN ('DELETED','SUSPENDED')
          ${excludeRecruiters ? `AND role <> 'RECRUITER'` : ''}
        ORDER BY created_at DESC`
    );
    rows.forEach(r => {
      const key = (r.email || '').toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        recipients.push({ name: r.name, email: r.email, mobile: r.mobile || null, source: 'user' });
      }
    });
  }
  if (audience === 'newsletter' || audience === 'both') {
    const { rows } = await db.query(
      `SELECT name, email FROM newsletter_subscribers WHERE status='active' ORDER BY subscribed_at DESC`
    );
    rows.forEach(r => {
      const key = (r.email || '').toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        recipients.push({ name: r.name, email: r.email, mobile: null, source: 'newsletter' });
      }
    });
  }
  return recipients;
}

function normalizePhone(mobile) {
  if (!mobile) return null;
  let d = String(mobile).replace(/[^0-9]/g, '');
  if (d.length === 10) d = '91' + d; // default to India country code
  return d.length >= 11 && d.length <= 15 ? d : null;
}

async function sendWhatsApp(to, message, imageUrl) {
  // When an image URL is supplied, send an image message (with the text as its
  // caption) via the Cloud API's `link` field; otherwise a plain text message.
  const payload = imageUrl
    ? {
        messaging_product: 'whatsapp',
        to,
        type: 'image',
        image: { link: imageUrl, caption: message || undefined },
      }
    : { messaging_product: 'whatsapp', to, type: 'text', text: { body: message } };
  const res = await fetch(`https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`WhatsApp API ${res.status}: ${body}`);
  }
}

/* GET /api/admin/analytics/visits — visitors + registrations for 1d/7d/30d */
admin.get('/analytics/visits', async (_req, res) => {
  try {
    const [visits, regs, daily] = await Promise.all([
      db.query(
        `SELECT
           COUNT(DISTINCT COALESCE(session_id, ip_address)) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day')   AS visitors_1d,
           COUNT(DISTINCT COALESCE(session_id, ip_address)) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')  AS visitors_7d,
           COUNT(DISTINCT COALESCE(session_id, ip_address)) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS visitors_30d,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day')   AS views_1d,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')  AS views_7d,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS views_30d
         FROM page_views`
      ),
      db.query(
        `SELECT
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day')   AS regs_1d,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')  AS regs_7d,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS regs_30d,
           COUNT(*)                                                          AS regs_total
         FROM users WHERE status <> 'DELETED'`
      ),
      db.query(
        `SELECT d.day::date AS day,
                COALESCE(v.visitors, 0)::int AS visitors,
                COALESCE(r.regs, 0)::int     AS registrations
           FROM generate_series(NOW()::date - 29, NOW()::date, '1 day') AS d(day)
           LEFT JOIN (
             SELECT created_at::date AS day,
                    COUNT(DISTINCT COALESCE(session_id, ip_address)) AS visitors
               FROM page_views
              WHERE created_at >= NOW()::date - 29
              GROUP BY 1
           ) v ON v.day = d.day::date
           LEFT JOIN (
             SELECT created_at::date AS day, COUNT(*) AS regs
               FROM users
              WHERE created_at >= NOW()::date - 29 AND status <> 'DELETED'
              GROUP BY 1
           ) r ON r.day = d.day::date
           ORDER BY d.day`
      ),
    ]);
    res.json({
      success: true,
      data: {
        visits: visits.rows[0],
        registrations: regs.rows[0],
        daily: daily.rows,
      },
    });
  } catch (err) {
    console.error('[admin/analytics/visits]', err);
    res.status(500).json({ success: false, error: 'Could not fetch visit analytics.' });
  }
});

/* GET /api/admin/analytics/enrollments?months=12 — monthly course-enrollment
 * trend + a registered → enrolled → purchased → completed conversion funnel.
 * Powers Admin > Analytics' "Monthly Enrollments" and "Conversion Funnel"
 * panels, which previously always rendered a static "not available yet" /
 * empty-state message regardless of real data. */
admin.get('/analytics/enrollments', async (req, res) => {
  const months = Math.min(24, Math.max(1, parseInt(req.query.months, 10) || 12));
  try {
    const [monthly, funnel] = await Promise.all([
      db.query(
        `SELECT to_char(m.month, 'YYYY-MM') AS month,
                COALESCE(e.enrollments, 0)::int AS enrollments
           FROM generate_series(
                  date_trunc('month', NOW()) - ($1::int - 1) * INTERVAL '1 month',
                  date_trunc('month', NOW()),
                  '1 month'
                ) AS m(month)
           LEFT JOIN (
             SELECT date_trunc('month', enrolled_at) AS month, COUNT(*) AS enrollments
               FROM course_enrollments
              GROUP BY 1
           ) e ON e.month = m.month
          ORDER BY m.month`,
        [months]
      ),
      db.query(
        `SELECT
           (SELECT COUNT(*) FROM users WHERE status <> 'DELETED')                          AS registered,
           (SELECT COUNT(DISTINCT user_id) FROM course_enrollments)                         AS enrolled,
           (SELECT COUNT(DISTINCT user_id) FROM course_purchases WHERE payment_status='paid') AS purchased,
           (SELECT COUNT(DISTINCT user_id) FROM course_enrollments WHERE completed_at IS NOT NULL) AS completed`
      ),
    ]);
    res.json({
      success: true,
      data: {
        monthly: monthly.rows,
        funnel: funnel.rows[0],
      },
    });
  } catch (err) {
    console.error('[admin/analytics/enrollments]', err);
    res.status(500).json({ success: false, error: 'Could not fetch enrollment analytics.' });
  }
});

/* GET /api/admin/subscribers?audience=users|newsletter|both */
admin.get('/subscribers', async (req, res) => {
  const audience = ['users', 'newsletter', 'both', 'superadmin'].includes(req.query.audience)
    ? req.query.audience
    : 'both';
  const excludeRecruiters =
    req.query.excludeRecruiters === '1' || req.query.excludeRecruiters === 'true';
  try {
    const recipients = await getBroadcastRecipients(audience, excludeRecruiters);
    res.json({
      success: true,
      data: recipients,
      meta: {
        total: recipients.length,
        withMobile: recipients.filter(r => normalizePhone(r.mobile)).length,
        emailConfigured: !!RESEND_API_KEY,
        whatsappConfigured: !!(WHATSAPP_TOKEN && WHATSAPP_PHONE_NUMBER_ID),
      },
    });
  } catch (err) {
    console.error('[admin/subscribers]', err);
    res.status(500).json({ success: false, error: 'Could not fetch subscribers.' });
  }
});

/* Image uploads for broadcast (email banner / WhatsApp image). Saved under
   assets/uploads/broadcast/ which express.static already serves publicly —
   both Resend (email) and the WhatsApp Cloud API need a real HTTPS URL to
   fetch the image from, not a local file path. */
const BROADCAST_UPLOAD_DIR = path.join(__dirname, 'assets', 'uploads', 'broadcast');
fs.mkdirSync(BROADCAST_UPLOAD_DIR, { recursive: true });

const broadcastImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, BROADCAST_UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path
        .extname(file.originalname || '')
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, '');
      const safeExt = ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext) ? ext : '.jpg';
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(png|jpe?g|gif|webp)$/i.test(file.mimetype)) {
      return cb(new Error('Only PNG, JPEG, GIF, or WEBP images are allowed.'));
    }
    cb(null, true);
  },
});

/* POST /api/admin/broadcast/upload-image  (multipart/form-data, field "image") */
admin.post('/broadcast/upload-image', (req, res) => {
  broadcastImageUpload.single('image')(req, res, err => {
    if (err) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Image is too large (8MB max).'
          : err.message || 'Upload failed.';
      return res.status(400).json({ success: false, error: msg });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file received.' });
    }
    const url = `${FRONTEND_URL}/assets/uploads/broadcast/${req.file.filename}`;
    res.json({ success: true, data: { url } });
  });
});

/* Ad campaign image uploads — same pattern as the broadcast image upload
   above (a real HTTPS URL is needed either way, since ad creative is fetched
   by browsers loading assets/js/ads.js, not just previewed in the admin). */
const ADS_UPLOAD_DIR = path.join(__dirname, 'assets', 'uploads', 'ads');
fs.mkdirSync(ADS_UPLOAD_DIR, { recursive: true });

const adsImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, ADS_UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path
        .extname(file.originalname || '')
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, '');
      const safeExt = ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext) ? ext : '.jpg';
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(png|jpe?g|gif|webp)$/i.test(file.mimetype)) {
      return cb(new Error('Only PNG, JPEG, GIF, or WEBP images are allowed.'));
    }
    cb(null, true);
  },
});

/* POST /api/admin/ads/upload-image  (multipart/form-data, field "image") */
admin.post('/ads/upload-image', (req, res) => {
  adsImageUpload.single('image')(req, res, err => {
    if (err) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Image is too large (8MB max).'
          : err.message || 'Upload failed.';
      return res.status(400).json({ success: false, error: msg });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file received.' });
    }
    const url = `${FRONTEND_URL}/assets/uploads/ads/${req.file.filename}`;
    res.json({ success: true, data: { url } });
  });
});

/* POST /api/admin/broadcast/email  { audience, subject, html } */
admin.post('/broadcast/email', async (req, res) => {
  const { audience, subject, html, excludeRecruiters } = req.body || {};
  if (!subject || !html) {
    return res.status(400).json({ success: false, error: 'subject and html are required.' });
  }
  if (!RESEND_API_KEY) {
    return res.status(503).json({ success: false, error: 'RESEND_API_KEY is not configured.' });
  }
  try {
    const recipients = await getBroadcastRecipients(audience || 'both', !!excludeRecruiters);
    let sent = 0;
    const failed = [];
    for (const r of recipients) {
      try {
        await sendMail({ to: r.email, subject, html });
        sent++;
      } catch (err) {
        failed.push({ email: r.email, error: err.message });
      }
      await new Promise(rs => setTimeout(rs, 120)); // stay under Resend rate limits
    }
    db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, new_data)
       VALUES ($1,'BROADCAST_EMAIL','broadcast',$2)`,
      [req.user && req.user.id, JSON.stringify({ audience, subject, sent, failed: failed.length })]
    ).catch(() => {});
    res.json({ success: true, data: { total: recipients.length, sent, failed } });
  } catch (err) {
    console.error('[admin/broadcast/email]', err);
    res.status(500).json({ success: false, error: 'Broadcast failed.' });
  }
});

/* ── Newsletter digest ────────────────────────────────────────────────────
   Builds ONE email that rolls up everything currently worth telling members
   about: all live challenges, the most recent job posts, newly published
   trainings, and the available tools. Non-empty sections only. Returns
   { subject, html, counts } so the same builder feeds both the preview and
   the real send. */
function nlEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

function nlAbsUrl(site, href, fallbackPath) {
  const h = String(href == null ? '' : href).trim();
  if (!h) {
    return site + fallbackPath;
  }
  if (/^https?:\/\//i.test(h)) {
    return h;
  }
  return site + (h.charAt(0) === '/' ? h : '/' + h);
}

async function buildNewsletterEmail() {
  const site = (
    process.env.PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    'https://risingedgetechnologies.com'
  ).replace(/\/+$/, '');

  const [chRes, jobRes, courseRes, toolRes] = await Promise.all([
    db.query(
      `SELECT title, slug, topic, difficulty, closes_at
         FROM challenges
        WHERE status='live' AND (closes_at IS NULL OR closes_at > NOW())
        ORDER BY closes_at ASC NULLS LAST
        LIMIT 6`
    ),
    db.query(
      `SELECT id, title, company_name, location, work_mode, employment_type
         FROM jobs
        WHERE status='ACTIVE'
        ORDER BY created_at DESC
        LIMIT 5`
    ),
    db.query(
      `SELECT title, description, href, slug
         FROM courses
        WHERE status='published'
        ORDER BY created_at DESC
        LIMIT 5`
    ),
    db.query(
      `SELECT title, description, url
         FROM tools
        WHERE status='active'
        ORDER BY created_at DESC
        LIMIT 6`
    ),
  ]);

  const challenges = chRes.rows || [];
  const jobs = jobRes.rows || [];
  const courses = courseRes.rows || [];
  const tools = toolRes.rows || [];
  const counts = {
    challenges: challenges.length,
    jobs: jobs.length,
    trainings: courses.length,
    tools: tools.length,
  };

  const wt = 'style="font-family:Inter,Arial,Helvetica,sans-serif;color:#0f172a"';
  const sections = [];

  function sectionHead(title, ctaText, ctaHref) {
    return (
      '<tr><td style="padding:26px 28px 6px">' +
      '<h2 style="margin:0;font-size:18px;font-weight:800;color:#0b1f3a">' +
      nlEsc(title) +
      '</h2>' +
      (ctaText
        ? '<a href="' +
          nlEsc(ctaHref) +
          '" style="font-size:13px;font-weight:600;color:#2563eb;text-decoration:none">' +
          nlEsc(ctaText) +
          ' &rarr;</a>'
        : '') +
      '</td></tr>'
    );
  }

  function card(title, meta, body, href) {
    return (
      '<tr><td style="padding:8px 28px">' +
      '<a href="' +
      nlEsc(href) +
      '" style="display:block;text-decoration:none;border:1px solid #e2e8f0;' +
      'border-radius:12px;padding:14px 16px;background:#f8fafc">' +
      '<div style="font-size:15px;font-weight:700;color:#0b1f3a">' +
      nlEsc(title) +
      '</div>' +
      (meta
        ? '<div style="font-size:12px;font-weight:600;color:#2563eb;margin-top:2px">' +
          nlEsc(meta) +
          '</div>'
        : '') +
      (body
        ? '<div style="font-size:13px;color:#475569;margin-top:6px;line-height:1.5">' +
          nlEsc(body) +
          '</div>'
        : '') +
      '</a></td></tr>'
    );
  }

  function truncate(s, n) {
    const t = String(s == null ? '' : s).trim();
    return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t;
  }

  if (challenges.length) {
    sections.push(
      sectionHead('🏆 Live Challenges', 'See all challenges', site + '/Challenge/index.html')
    );
    challenges.forEach(function (c) {
      const meta = [c.difficulty, c.topic].filter(Boolean).join(' · ');
      const closes = c.closes_at
        ? 'Closes ' +
          new Date(c.closes_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        : '';
      sections.push(
        card(
          c.title,
          [meta, closes].filter(Boolean).join('  |  '),
          '',
          site + '/Challenge/index.html'
        )
      );
    });
  }

  if (jobs.length) {
    sections.push(
      sectionHead('💼 Recent Job Openings', 'Browse all jobs', site + '/Jobs/index.html')
    );
    jobs.forEach(function (j) {
      const meta = [j.company_name, j.location, (j.work_mode || '').replace(/_/g, ' ')]
        .filter(Boolean)
        .join(' · ');
      sections.push(
        card(j.title, meta, '', site + '/Jobs/job.html?id=' + encodeURIComponent(j.id))
      );
    });
  }

  if (courses.length) {
    sections.push(
      sectionHead('📚 New Trainings', 'View all trainings', site + '/Trainings/trainings.html')
    );
    courses.forEach(function (c) {
      sections.push(
        card(
          c.title,
          '',
          truncate(c.description, 140),
          nlAbsUrl(site, c.href, '/Trainings/trainings.html')
        )
      );
    });
  }

  if (tools.length) {
    sections.push(sectionHead('🛠️ Tools', 'Open all tools', site + '/Tools/tools.html'));
    tools.forEach(function (t) {
      sections.push(
        card(t.title, '', truncate(t.description, 120), nlAbsUrl(site, t.url, '/Tools/tools.html'))
      );
    });
  }

  const hasContent = sections.length > 0;
  const now = new Date();
  const period = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const subject = 'Rising Edge Newsletter — ' + period;

  const html =
    '<div ' +
    wt +
    ' style="background:#eef2f7;padding:24px 0">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" ' +
    'style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden">' +
    // header
    '<tr><td style="background:#0b1f3a;padding:26px 28px">' +
    '<div style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:0.3px">Rising Edge Technologies</div>' +
    '<div style="font-size:13px;color:#93c5fd;margin-top:4px">' +
    nlEsc(period) +
    ' · What&rsquo;s new this week</div>' +
    '</td></tr>' +
    (hasContent
      ? sections.join('')
      : '<tr><td style="padding:28px;font-size:14px;color:#475569">Nothing new to share right now — check back soon.</td></tr>') +
    // footer
    '<tr><td style="padding:24px 28px;border-top:1px solid #e2e8f0">' +
    '<div style="font-size:12px;color:#94a3b8;line-height:1.6">' +
    'You are receiving this because you subscribed to Rising Edge Technologies.<br>' +
    '<a href="' +
    site +
    '" style="color:#2563eb;text-decoration:none">' +
    nlEsc(site.replace(/^https?:\/\//, '')) +
    '</a></div></td></tr>' +
    '</table></div>';

  return { subject: subject, html: html, counts: counts, hasContent: hasContent };
}

/* GET /api/admin/broadcast/newsletter/preview — build the digest without
   sending, so the admin can eyeball it and see the section counts first. */
admin.get('/broadcast/newsletter/preview', async (req, res) => {
  try {
    const nl = await buildNewsletterEmail();
    res.json({
      success: true,
      data: { subject: nl.subject, html: nl.html, counts: nl.counts, hasContent: nl.hasContent },
    });
  } catch (err) {
    console.error('[admin/broadcast/newsletter/preview]', err);
    res.status(500).json({ success: false, error: 'Could not build newsletter.' });
  }
});

/* POST /api/admin/broadcast/newsletter  { audience, excludeRecruiters, test }
   Sends ONE digest email (live challenges + recent jobs + new trainings +
   tools) to the chosen audience. test:true redirects to SUPER_ADMIN accounts
   only, mirroring the other broadcast test flows. */
admin.post('/broadcast/newsletter', async (req, res) => {
  const { audience, excludeRecruiters, test } = req.body || {};
  if (!RESEND_API_KEY) {
    return res.status(503).json({ success: false, error: 'RESEND_API_KEY is not configured.' });
  }
  try {
    const nl = await buildNewsletterEmail();
    if (!nl.hasContent) {
      return res.status(400).json({
        success: false,
        error: 'Nothing to send — no live challenges, jobs, trainings or tools found.',
      });
    }
    const recipients = test
      ? await getBroadcastRecipients('superadmin', false)
      : await getBroadcastRecipients(audience || 'both', !!excludeRecruiters);
    let sent = 0;
    const failed = [];
    for (const r of recipients) {
      try {
        await sendMail({ to: r.email, subject: nl.subject, html: nl.html });
        sent++;
      } catch (err) {
        failed.push({ email: r.email, error: err.message });
      }
      await new Promise(rs => setTimeout(rs, 120)); // stay under Resend rate limits
    }
    db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, new_data)
       VALUES ($1,'BROADCAST_NEWSLETTER','broadcast',$2)`,
      [
        req.user && req.user.id,
        JSON.stringify({ audience: test ? 'superadmin(test)' : audience, sent, counts: nl.counts }),
      ]
    ).catch(() => {});
    res.json({
      success: true,
      data: { total: recipients.length, sent, failed, counts: nl.counts },
    });
  } catch (err) {
    console.error('[admin/broadcast/newsletter]', err);
    res.status(500).json({ success: false, error: 'Newsletter send failed.' });
  }
});

/* POST /api/admin/broadcast/whatsapp  { audience, message } */
admin.post('/broadcast/whatsapp', async (req, res) => {
  const { audience, message, excludeRecruiters, imageUrl } = req.body || {};
  const cleanImg = typeof imageUrl === 'string' && /^https?:\/\//i.test(imageUrl) ? imageUrl : null;
  if (!message && !cleanImg) {
    return res
      .status(400)
      .json({ success: false, error: 'A message or an image URL is required.' });
  }
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    return res.status(503).json({
      success: false,
      error: 'WhatsApp is not configured. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID.',
    });
  }
  try {
    const recipients = (
      await getBroadcastRecipients(audience || 'users', !!excludeRecruiters)
    ).filter(r => normalizePhone(r.mobile));
    let sent = 0;
    const failed = [];
    for (const r of recipients) {
      try {
        await sendWhatsApp(normalizePhone(r.mobile), message, cleanImg);
        sent++;
      } catch (err) {
        failed.push({ mobile: r.mobile, error: err.message });
      }
      await new Promise(rs => setTimeout(rs, 150));
    }
    db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, new_data)
       VALUES ($1,'BROADCAST_WHATSAPP','broadcast',$2)`,
      [req.user && req.user.id, JSON.stringify({ audience, sent, failed: failed.length })]
    ).catch(() => {});
    res.json({ success: true, data: { total: recipients.length, sent, failed } });
  } catch (err) {
    console.error('[admin/broadcast/whatsapp]', err);
    res.status(500).json({ success: false, error: 'Broadcast failed.' });
  }
});

/* ── WHDC admin authoring ─────────────────────────────────────────────────── */

// List all challenges (admin)
admin.get('/challenges', async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*, (SELECT COUNT(*)::int FROM challenge_questions q WHERE q.challenge_id=c.id) AS question_count
         FROM challenges c ORDER BY COALESCE(c.week_number,0) DESC, c.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[admin/whdc/list]', err);
    res.status(500).json({ success: false, error: 'Could not list challenges.' });
  }
});

// Create a challenge
admin.post('/challenges', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.title || !b.slug) {
      return res.status(422).json({ success: false, error: 'title and slug are required.' });
    }
    const { rows } = await db.query(
      `INSERT INTO challenges
         (week_number,title,slug,topic,category_id,difficulty,description,cover_url,
          time_limit_min,total_points,linked_course_id,opens_at,closes_at,status,created_by)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,'Intermediate'),$7,$8,COALESCE($9,20),COALESCE($10,100),
               $11,$12,$13,COALESCE($14,'draft'),$15)
       RETURNING *`,
      [
        b.week_number ?? null,
        b.title,
        b.slug,
        b.topic ?? null,
        b.category_id ?? null,
        b.difficulty ?? null,
        b.description ?? null,
        b.cover_url ?? null,
        b.time_limit_min ?? null,
        b.total_points ?? null,
        b.linked_course_id ?? null,
        b.opens_at ?? null,
        b.closes_at ?? null,
        b.status ?? null,
        req.user.id,
      ]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[admin/whdc/create]', err);
    const dup = err.code === '23505';
    res.status(dup ? 409 : 500).json({
      success: false,
      error: dup ? 'A challenge with that slug already exists.' : 'Could not create challenge.',
    });
  }
});

// Update a challenge (partial)
admin.patch('/challenges/:id', async (req, res) => {
  try {
    const allowed = [
      'week_number',
      'title',
      'slug',
      'topic',
      'category_id',
      'difficulty',
      'description',
      'cover_url',
      'time_limit_min',
      'total_points',
      'linked_course_id',
      'opens_at',
      'closes_at',
      'status',
    ];
    const sets = [];
    const vals = [];
    let i = 1;
    for (const k of allowed) {
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, k)) {
        sets.push(`${k}=$${i++}`);
        vals.push(req.body[k]);
      }
    }
    if (!sets.length) {
      return res.status(422).json({ success: false, error: 'No fields to update.' });
    }
    vals.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE challenges SET ${sets.join(', ')}, updated_at=NOW() WHERE id=$${i} RETURNING *`,
      vals
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Challenge not found.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[admin/whdc/update]', err);
    res.status(500).json({ success: false, error: 'Could not update challenge.' });
  }
});

// Delete a challenge — cascades to its questions/attempts/answers
// (ON DELETE CASCADE); points_ledger and user_badges rows lose their
// challenge_id (ON DELETE SET NULL) rather than being deleted, so lifetime
// points/badges already awarded are unaffected. user_points.last_played_
// challenge_id has no ON DELETE clause, so it's nulled out first to avoid
// a foreign-key violation.
admin.delete('/challenges/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await db.query(
      `UPDATE user_points SET last_played_challenge_id=NULL WHERE last_played_challenge_id=$1`,
      [id]
    );
    const { rows } = await db.query(`DELETE FROM challenges WHERE id=$1 RETURNING id`, [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Challenge not found.' });
    }
    res.json({ success: true, data: { id } });
  } catch (err) {
    console.error('[admin/whdc/delete]', err);
    res.status(500).json({ success: false, error: 'Could not delete challenge.' });
  }
});

// Publish / schedule a challenge
admin.post('/challenges/:id/publish', async (req, res) => {
  try {
    const status = (req.body && req.body.status) || 'live';
    const { rows } = await db.query(
      `UPDATE challenges SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Challenge not found.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[admin/whdc/publish]', err);
    res.status(500).json({ success: false, error: 'Could not publish.' });
  }
});

// Close a challenge and freeze ranks
admin.post('/challenges/:id/close', async (req, res) => {
  try {
    const id = req.params.id;
    const { rows } = await db.query(
      `UPDATE challenges SET status='closed', closes_at=COALESCE(closes_at,NOW()), updated_at=NOW()
        WHERE id=$1 RETURNING *`,
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Challenge not found.' });
    }
    // SUPER_ADMIN accounts never occupy a leaderboard/rank slot — clear any
    // stale rank they might have, then rank everyone else.
    await db.query(
      `UPDATE challenge_attempts SET rank=NULL
        WHERE challenge_id=$1 AND user_id IN (SELECT id FROM users WHERE role='SUPER_ADMIN')`,
      [id]
    );
    await db.query(
      `WITH ranked AS (
         SELECT ca.id, RANK() OVER (ORDER BY ca.final_score DESC, ca.time_taken_sec ASC) AS rnk
           FROM challenge_attempts ca
           JOIN users u ON u.id = ca.user_id
          WHERE ca.challenge_id=$1 AND ca.is_practice=FALSE AND ca.status<>'in_progress'
            AND u.role <> 'SUPER_ADMIN'
       )
       UPDATE challenge_attempts a SET rank=r.rnk FROM ranked r WHERE a.id=r.id`,
      [id]
    );
    await awardWhdcTopBadges(id);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[admin/whdc/close]', err);
    res.status(500).json({ success: false, error: 'Could not close challenge.' });
  }
});

// Manually (re)award the top-3 champion/podium badges (and bump their
// weekly podium_finishes count) for a challenge. No certificate is issued
// and no email is sent — this is a direct DB action, not a broadcast, so
// there's no test-mode variant. Idempotent via whdc_podium_log.
admin.post('/challenges/:id/award-badges', async (req, res) => {
  try {
    const id = req.params.id;
    const { rows } = await db.query(`SELECT id FROM challenges WHERE id=$1`, [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Challenge not found.' });
    }
    await awardWhdcTopBadges(id);
    res.json({ success: true });
  } catch (err) {
    console.error('[admin/whdc/award-badges]', err);
    res.status(500).json({ success: false, error: 'Could not award badges.' });
  }
});

// Manually (re)send the results email (top-10 leaderboard + the recipient's
// own rank) to every participant of a challenge. { test: true } sends to
// SUPER_ADMIN accounts only instead of real participants.
admin.post('/challenges/:id/send-results', async (req, res) => {
  try {
    const id = req.params.id;
    const testOnly = !!(req.body && req.body.test);
    const { rows } = await db.query(`SELECT id FROM challenges WHERE id=$1`, [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Challenge not found.' });
    }
    const result = await whdcSendResultsEmail(id, { testOnly });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[admin/whdc/send-results]', err);
    res.status(500).json({ success: false, error: 'Could not send results email.' });
  }
});

// Manually (re)send "you haven't submitted yet" reminders to registered
// users who have no scored attempt on this challenge, and reset the 2-day
// auto-reminder clock (see whdcRunLifecycle) so the next automatic nudge is
// 2 days from now rather than 2 days from the last automatic send.
// { test: true } sends ONE merged email to SUPER_ADMIN accounts only and
// leaves the real 2-day cadence untouched.
admin.post('/challenges/:id/send-reminders', async (req, res) => {
  try {
    const id = req.params.id;
    const testOnly = !!(req.body && req.body.test);
    const { rows } = await db.query(`SELECT id FROM challenges WHERE id=$1`, [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Challenge not found.' });
    }
    const result = await whdcSendReminders(id, { testOnly });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[admin/whdc/send-reminders]', err);
    res.status(500).json({ success: false, error: 'Could not send reminder emails.' });
  }
});

// Add a question to a challenge
admin.post('/challenges/:id/questions', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.type || !b.prompt || b.answer_key === undefined) {
      return res
        .status(422)
        .json({ success: false, error: 'type, prompt and answer_key are required.' });
    }
    const { rows } = await db.query(
      `INSERT INTO challenge_questions
         (challenge_id,type,prompt,assets,options,answer_key,points,negative_marking,
          partial_credit,numeric_tolerance,topic_tag,difficulty_tag,explanation,position)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,10),COALESCE($8,0),COALESCE($9,false),
               $10,$11,$12,$13,COALESCE($14,0))
       RETURNING id`,
      [
        req.params.id,
        b.type,
        b.prompt,
        b.assets ? JSON.stringify(b.assets) : null,
        b.options ? JSON.stringify(b.options) : null,
        JSON.stringify(b.answer_key),
        b.points ?? null,
        b.negative_marking ?? null,
        b.partial_credit ?? null,
        b.numeric_tolerance ?? null,
        b.topic_tag ?? null,
        b.difficulty_tag ?? null,
        b.explanation ?? null,
        b.position ?? null,
      ]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[admin/whdc/question]', err);
    res.status(500).json({ success: false, error: 'Could not add question.' });
  }
});

// Manually run the weekly lifecycle tick (open/close/settle) — for ops & testing
admin.post('/whdc/run-lifecycle', async (_req, res) => {
  try {
    await whdcRunLifecycle();
    res.json({ success: true });
  } catch (err) {
    console.error('[admin/whdc/run-lifecycle]', err);
    res.status(500).json({ success: false, error: 'Lifecycle run failed.' });
  }
});

/* ── WHDC email settings & template editor ─────────────────────────────── */

// Valid email settings keys and their human labels
const WHDC_EMAIL_KEYS = {
  'whdc.email.announce': 'Announcement email (new challenge goes live)',
  'whdc.email.reminder': 'Reminder emails (every 2 days while live)',
  'whdc.email.results': 'Results email (challenge closes)',
  'whdc.email.certificate': 'Certificate email (top-3 finishers)',
};
// Valid editable template names
const WHDC_TEMPLATE_NAMES = [
  'announcement',
  'challenge-reminder',
  'results-published',
  'certificate-issued',
];

// GET /api/admin/whdc/email-settings — current on/off state + default values
admin.get('/whdc/email-settings', async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT key, value FROM system_settings WHERE key LIKE 'whdc.email.%'`
    );
    const map = {};
    rows.forEach(r => {
      map[r.key] = r.value;
    });
    const settings = {};
    for (const [key, label] of Object.entries(WHDC_EMAIL_KEYS)) {
      settings[key] = { enabled: (map[key] ?? 'true') === 'true', label };
    }
    res.json({ success: true, settings });
  } catch (err) {
    console.error('[admin/whdc/email-settings GET]', err);
    res.status(500).json({ success: false, error: 'Could not load email settings.' });
  }
});

// PUT /api/admin/whdc/email-settings — update one or more on/off flags
admin.put('/whdc/email-settings', async (req, res) => {
  try {
    const updates = req.body || {};
    for (const [key, val] of Object.entries(updates)) {
      if (!WHDC_EMAIL_KEYS[key]) continue;
      const enabled = val === true || val === 'true';
      await db.query(
        `INSERT INTO system_settings (key, value, description, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
        [key, String(enabled), WHDC_EMAIL_KEYS[key]]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[admin/whdc/email-settings PUT]', err);
    res.status(500).json({ success: false, error: 'Could not save email settings.' });
  }
});

// GET /api/admin/whdc/email-template/:name — raw Markdown content of a template
admin.get('/whdc/email-template/:name', (req, res) => {
  const name = req.params.name;
  if (!WHDC_TEMPLATE_NAMES.includes(name)) {
    return res.status(400).json({ success: false, error: 'Unknown template name.' });
  }
  try {
    const filePath = path.join(EMAIL_TEMPLATES_DIR, `${name}.md`);
    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ success: true, name, content });
  } catch (err) {
    res.status(404).json({ success: false, error: 'Template file not found.' });
  }
});

// PUT /api/admin/whdc/email-template/:name — save updated Markdown + bust cache
admin.put('/whdc/email-template/:name', (req, res) => {
  const name = req.params.name;
  if (!WHDC_TEMPLATE_NAMES.includes(name)) {
    return res.status(400).json({ success: false, error: 'Unknown template name.' });
  }
  const { content } = req.body || {};
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ success: false, error: 'content is required.' });
  }
  // Must have a Subject line
  if (!/^subject:/i.test(content.trim())) {
    return res.status(400).json({ success: false, error: 'Template must start with "Subject: …"' });
  }
  try {
    const filePath = path.join(EMAIL_TEMPLATES_DIR, `${name}.md`);
    fs.writeFileSync(filePath, content, 'utf8');
    // Bust in-memory cache so next send picks up the new copy
    delete emailTemplateCache[name];
    res.json({ success: true });
  } catch (err) {
    console.error('[admin/whdc/email-template PUT]', err);
    res.status(500).json({ success: false, error: 'Could not save template.' });
  }
});

/* ── Ads admin ─────────────────────────────────────────────────────────── */

// List slots + all campaigns (with slot label) + the AdSense on/off flag in
// one call for the admin page.
// GET /api/admin/popup-settings
admin.get('/popup-settings', async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT key, value FROM system_settings WHERE key LIKE 'site.popup.%'`
    );
    const cfg = {};
    for (const r of rows) cfg[r.key.replace('site.popup.', '')] = r.value;
    res.json({
      success: true,
      enabled: cfg.enabled === 'true',
      imageUrl: cfg.imageUrl || '',
      linkUrl: cfg.linkUrl || '',
      altText: cfg.altText || '',
    });
  } catch (err) {
    console.error('[admin/popup-settings GET]', err);
    res.status(500).json({ success: false, error: 'Could not load popup settings.' });
  }
});

// PUT /api/admin/popup-settings
admin.put('/popup-settings', async (req, res) => {
  const { enabled, imageUrl, linkUrl, altText } = req.body;
  const fields = [
    ['site.popup.enabled', String(!!enabled), 'Homepage popup enabled'],
    ['site.popup.imageUrl', imageUrl || '', 'Homepage popup image URL'],
    ['site.popup.linkUrl', linkUrl || '', 'Homepage popup link URL'],
    ['site.popup.altText', altText || '', 'Homepage popup alt text'],
  ];
  try {
    for (const [key, value, description] of fields) {
      await db.query(
        `INSERT INTO system_settings (key, value, description, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
        [key, value, description]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[admin/popup-settings PUT]', err);
    res.status(500).json({ success: false, error: 'Could not save popup settings.' });
  }
});

admin.get('/ads', async (_req, res) => {
  try {
    await flushAdCounters(); // so impression/click totals are current
    const slots = (await db.query(`SELECT * FROM ad_slots ORDER BY label`)).rows;
    const campaigns = (
      await db.query(
        `SELECT c.*, s.label AS slot_label
           FROM ad_campaigns c JOIN ad_slots s ON s.id = c.slot_id
          ORDER BY c.created_at DESC`
      )
    ).rows;
    const adsenseEnabled = await getAdsenseEnabledFromDb();
    res.json({ success: true, data: { slots, campaigns, adsenseEnabled } });
  } catch (err) {
    console.error('[admin/ads/list]', err);
    res.status(500).json({ success: false, error: 'Could not load ads.' });
  }
});

// Site-wide AdSense on/off toggle — direct-sold campaigns are unaffected
// either way; this only controls whether the AdSense fallback is allowed to
// render when a slot has no active campaign.
admin.patch('/ads/config', async (req, res) => {
  try {
    const enabled = !!(req.body && req.body.adsenseEnabled);
    await db.query(
      `INSERT INTO system_settings (key,value,description,is_public)
       VALUES ('ads_adsense_enabled',$1,
               'Show AdSense fallback ads when no direct campaign is active for a slot', TRUE)
       ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`,
      [String(enabled)]
    );
    clearAdsCache();
    res.json({ success: true, data: { adsenseEnabled: enabled } });
  } catch (err) {
    console.error('[admin/ads/config]', err);
    res.status(500).json({ success: false, error: 'Could not update AdSense setting.' });
  }
});

// Rejects local file paths (E:\..., /Users/..., file://...) accidentally
// pasted into image_url/target_url instead of a real hosted URL — those
// load fine in the admin's own browser (which can see the local disk) but
// are invisible to every actual site visitor, so the ad silently never
// shows. Relative /-rooted paths are allowed since the upload endpoint can
// return one; bare "http"/"https" is required for absolute URLs.
function isWebUrl(v) {
  if (typeof v !== 'string' || !v.trim()) return false;
  const s = v.trim();
  if (s.startsWith('/') && !s.startsWith('//')) return true; // site-relative
  return /^https?:\/\//i.test(s);
}

// Create a campaign
admin.post('/ads', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.slot_id || !b.advertiser_name || !b.image_url || !b.target_url) {
      return res.status(422).json({
        success: false,
        error: 'slot_id, advertiser_name, image_url and target_url are required.',
      });
    }
    if (!isWebUrl(b.image_url)) {
      return res.status(422).json({
        success: false,
        error:
          'image_url must be a real web address (https://...), not a local file path. Use the Browse button to upload it.',
      });
    }
    if (!isWebUrl(b.target_url)) {
      return res
        .status(422)
        .json({ success: false, error: 'target_url must be a real web address (https://...).' });
    }
    const { rows } = await db.query(
      `INSERT INTO ad_campaigns
         (slot_id, advertiser_name, image_url, target_url, alt_text, starts_at, ends_at, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,TRUE))
       RETURNING *`,
      [
        b.slot_id,
        b.advertiser_name,
        b.image_url,
        b.target_url,
        b.alt_text ?? null,
        b.starts_at ?? null,
        b.ends_at ?? null,
        b.active ?? null,
      ]
    );
    clearAdsCache();
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[admin/ads/create]', err);
    const badSlot = err.code === '23503';
    res.status(badSlot ? 422 : 500).json({
      success: false,
      error: badSlot ? 'Unknown slot_id.' : 'Could not create campaign.',
    });
  }
});

// Update a campaign (partial — also used for the pause/activate toggle)
admin.patch('/ads/:id', async (req, res) => {
  try {
    const allowed = [
      'slot_id',
      'advertiser_name',
      'image_url',
      'target_url',
      'alt_text',
      'starts_at',
      'ends_at',
      'active',
    ];
    const sets = [];
    const vals = [];
    let i = 1;
    for (const k of allowed) {
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, k)) {
        sets.push(`${k}=$${i++}`);
        vals.push(req.body[k]);
      }
    }
    if (!sets.length) {
      return res.status(422).json({ success: false, error: 'No fields to update.' });
    }
    if (
      Object.prototype.hasOwnProperty.call(req.body, 'image_url') &&
      !isWebUrl(req.body.image_url)
    ) {
      return res.status(422).json({
        success: false,
        error:
          'image_url must be a real web address (https://...), not a local file path. Use the Browse button to upload it.',
      });
    }
    if (
      Object.prototype.hasOwnProperty.call(req.body, 'target_url') &&
      !isWebUrl(req.body.target_url)
    ) {
      return res
        .status(422)
        .json({ success: false, error: 'target_url must be a real web address (https://...).' });
    }
    vals.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE ad_campaigns SET ${sets.join(', ')}, updated_at=NOW() WHERE id=$${i} RETURNING *`,
      vals
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Campaign not found.' });
    clearAdsCache();
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[admin/ads/update]', err);
    res.status(500).json({ success: false, error: 'Could not update campaign.' });
  }
});

// Delete a campaign
admin.delete('/ads/:id', async (req, res) => {
  try {
    pendingAdCounts.delete(String(req.params.id));
    const { rowCount } = await db.query(`DELETE FROM ad_campaigns WHERE id=$1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ success: false, error: 'Campaign not found.' });
    clearAdsCache();
    res.json({ success: true });
  } catch (err) {
    console.error('[admin/ads/delete]', err);
    res.status(500).json({ success: false, error: 'Could not delete campaign.' });
  }
});

app.use('/api/admin', admin);

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TOOL SUBSCRIPTION & CASHFREE PAYMENT APIs
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* GET /api/subscription/plans â€” public */
app.get('/api/subscription/plans', async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id,name,price_monthly,price_yearly,mrp_monthly,mrp_yearly,description,features,max_courses,badge_color,is_popular,sort_order
       FROM subscription_plans ORDER BY sort_order`
    );
    res.json({ success: true, plans: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not fetch plans.' });
  }
});

/* GET /api/subscription/status â€” authenticated */
app.get('/api/subscription/status', verifyAccessToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM tool_subscriptions WHERE user_id=$1 AND status='active' ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    if (!rows.length) {
      return res.json({
        success: true,
        subscription: {
          planId: 'basic',
          planName: 'Basic',
          status: 'active',
          creditsUsed: 0,
          creditsTotal: 10,
          billingCycle: null,
          expiryDate: null,
        },
      });
    }
    const s = rows[0];
    const { rows: spRows } = await db.query('SELECT name FROM subscription_plans WHERE id=$1', [
      s.plan_id,
    ]);
    const plan = { name: (spRows[0] || {}).name || s.plan_id };
    res.json({
      success: true,
      subscription: {
        planId: s.plan_id,
        planName: plan.name,
        billingCycle: s.billing_cycle,
        status: s.status,
        startDate: s.start_date,
        expiryDate: s.expiry_date,
        autoRenew: s.auto_renew,
        creditsUsed: s.credits_used,
        creditsTotal: plan.reviewCredits > 100000 ? String.fromCharCode(8734) : plan.reviewCredits,
        remainingCredits: s.remaining_credits,
        transactionId: s.transaction_id,
      },
    });
  } catch (err) {
    console.error('[subscription/status]', err);
    res.status(500).json({ success: false, error: 'Could not fetch subscription status.' });
  }
});

/* GET /api/subscription/history */
app.get('/api/subscription/history', verifyAccessToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM tool_payments WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ success: true, payments: rows });
  } catch (err) {
    console.error('[subscription/history]', err);
    res.status(500).json({ success: false, error: 'Could not fetch payment history.' });
  }
});

/* GET /api/subscription/invoices */
app.get('/api/subscription/invoices', verifyAccessToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id,order_id,payment_id,plan_id,billing_cycle,amount,gst_amount,status,invoice_number,created_at
         FROM tool_payments WHERE user_id=$1 AND status='paid' ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, invoices: rows });
  } catch (err) {
    console.error('[subscription/invoices]', err);
    res.status(500).json({ success: false, error: 'Could not fetch invoices.' });
  }
});

/* POST /api/subscription/cancel */
app.post('/api/subscription/cancel', verifyAccessToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE tool_subscriptions SET auto_renew=FALSE, updated_at=NOW()
        WHERE user_id=$1 AND status='active' RETURNING id`,
      [req.user.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'No active subscription found.' });
    }
    res.json({
      success: true,
      message: 'Auto-renew disabled. Access continues until expiry date.',
    });
  } catch (err) {
    console.error('[subscription/cancel]', err);
    res.status(500).json({ success: false, error: 'Could not cancel subscription.' });
  }
});

/* POST /api/subscription/change-plan */
app.post('/api/subscription/change-plan', verifyAccessToken, async (req, res) => {
  try {
    const { planId, billingCycle } = req.body;
    const { rows: cpRows } = await db.query('SELECT id FROM subscription_plans WHERE id=$1', [
      planId,
    ]);
    if (!cpRows.length) return res.status(400).json({ success: false, error: 'Invalid plan.' });
    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return res.status(400).json({ success: false, error: 'Invalid billing cycle.' });
    }
    await db.query(
      `UPDATE tool_subscriptions SET plan_id=$1, billing_cycle=$2, updated_at=NOW()
        WHERE user_id=$3 AND status='active'`,
      [planId, billingCycle, req.user.id]
    );
    res.json({ success: true, message: 'Plan change queued. Effective from next billing cycle.' });
  } catch (err) {
    console.error('[subscription/change-plan]', err);
    res.status(500).json({ success: false, error: 'Could not change plan.' });
  }
});

/* â”€â”€ Cashfree helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
/* â”€â”€ Cashfree HTTP helper (direct calls, stable API version) â”€â”€ */
async function cashfree(method, path, body) {
  const appId = (process.env.CASHFREE_APP_ID || '').trim();
  const secret = (process.env.CASHFREE_SECRET_KEY || '').trim();
  if (!appId || !secret) throw new Error('Cashfree credentials not set in environment variables.');
  const base =
    process.env.CASHFREE_ENV === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': appId,
      'x-client-secret': secret,
      'x-api-version': '2022-09-01',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.message || data.error || 'Cashfree error ' + res.status;
    console.error('[cashfree] ' + method + ' ' + path + ' ->', res.status, JSON.stringify(data));
    const e = new Error(msg);
    e.status = res.status;
    e.cfData = data;
    throw e;
  }
  return data;
}

/* POST /api/cashfree/create-order */
app.post('/api/cashfree/create-order', verifyAccessToken, async (req, res) => {
  try {
    const { planId, billingCycle, amount, couponCode } = req.body;
    if (planId === 'basic') {
      return res.status(400).json({ success: false, error: 'Basic plan is free.' });
    }
    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return res.status(400).json({ success: false, error: 'Invalid billing cycle.' });
    }

    const { rows: planRows } = await db.query('SELECT * FROM subscription_plans WHERE id=$1', [
      planId,
    ]);
    if (!planRows.length) return res.status(400).json({ success: false, error: 'Invalid plan.' });
    const plan = planRows[0];

    const baseAmount =
      billingCycle === 'yearly' ? Number(plan.price_yearly) : Number(plan.price_monthly);

    // Resolve coupon
    let couponId = null;
    let discountAmount = 0;
    if (couponCode) {
      const { rows: cRows } = await db.query(
        `SELECT * FROM coupons WHERE code=$1 AND active=TRUE`,
        [couponCode.toUpperCase().trim()]
      );
      if (!cRows.length) {
        return res.status(400).json({ success: false, error: 'Invalid or inactive coupon code.' });
      }
      const c = cRows[0];

      if (c.expires && c.expires !== 'No expiry' && new Date(c.expires) < new Date()) {
        return res.status(400).json({ success: false, error: 'Coupon has expired.' });
      }
      if (c.used >= c.limit_count) {
        return res.status(400).json({ success: false, error: 'Coupon usage limit reached.' });
      }
      if (c.applies_to !== 'all' && c.applies_to !== 'subscriptions') {
        return res
          .status(400)
          .json({ success: false, error: `Coupon is not valid for subscriptions.` });
      }
      if (
        c.applicable_ids &&
        c.applicable_ids.length &&
        !c.applicable_ids.includes(String(planId))
      ) {
        return res
          .status(400)
          .json({ success: false, error: 'Coupon is not valid for this plan.' });
      }

      const { rows: uRows2 } = await db.query(
        `SELECT COUNT(*) as cnt FROM coupon_usage WHERE coupon_id=$1 AND user_id=$2`,
        [c.id, req.user.id]
      );
      if (parseInt(uRows2[0].cnt) >= (c.per_user_limit || 1)) {
        return res.status(400).json({
          success: false,
          error: 'You have already used this coupon the maximum number of times.',
        });
      }

      couponId = c.id;
      if (c.type === 'percent') {
        discountAmount = Math.round(baseAmount * (parseFloat(c.val) / 100) * 100) / 100;
      } else {
        discountAmount = Math.min(parseFloat(c.val), baseAmount);
      }
    }

    const discountedBase = Math.max(0, Math.round((baseAmount - discountAmount) * 100) / 100);

    // Validate amount sent from frontend (allow small float tolerance)
    console.log(
      '[create-order] amount check — received:',
      amount,
      'expected after discount:',
      discountedBase,
      'plan:',
      planId,
      'cycle:',
      billingCycle
    );
    if (Math.abs(Number(amount) - discountedBase) > 0.01) {
      return res
        .status(400)
        .json({ success: false, error: `Amount mismatch. Expected ₹${discountedBase}.` });
    }

    const gstAmount = Math.round(discountedBase * 0.18 * 100) / 100;
    const totalAmount = discountedBase + gstAmount;
    const orderId = 'RE-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();

    const { rows: uRows } = await db.query('SELECT full_name,email,mobile FROM users WHERE id=$1', [
      req.user.id,
    ]);
    const u = uRows[0] || {};

    await db.query(
      `INSERT INTO tool_payments (order_id,user_id,plan_id,billing_cycle,amount,gst_amount,status,gateway,coupon_id,discount_amount)
       VALUES ($1,$2,$3,$4,$5,$6,'pending','cashfree',$7,$8)`,
      [
        orderId,
        req.user.id,
        planId,
        billingCycle,
        discountedBase,
        gstAmount,
        couponId,
        discountAmount,
      ]
    );

    // Increment coupon used counter
    if (couponId) {
      await db.query(`UPDATE coupons SET used=used+1,updated_at=NOW() WHERE id=$1`, [couponId]);
      await db.query(`INSERT INTO coupon_usage (coupon_id,user_id,order_id) VALUES ($1,$2,$3)`, [
        couponId,
        req.user.id,
        orderId,
      ]);
    }

    if (
      !(process.env.CASHFREE_APP_ID || '').trim() ||
      !(process.env.CASHFREE_SECRET_KEY || '').trim()
    ) {
      return res.status(503).json({
        success: false,
        error: 'Payment gateway credentials not configured. Contact support.',
      });
    }
    const cfRes = await cashfree('POST', '/orders', {
      order_id: orderId,
      order_amount: totalAmount,
      order_currency: 'INR',
      order_note: 'Rising Edge ' + (plan.name || planId) + ' Plan - ' + billingCycle,
      customer_details: {
        customer_id: String(req.user.id),
        customer_name: u.full_name || 'Customer',
        customer_email: u.email || '',
        customer_phone: u.mobile || '9999999999',
      },
      order_meta: {
        return_url:
          (process.env.APP_URL || 'https://www.risingedgetech.com') +
          '/subscription/success.html?order_id=' +
          orderId,
        notify_url:
          (process.env.APP_URL || 'https://www.risingedgetech.com') + '/api/cashfree/webhook',
      },
    });
    const paymentSessionId = cfRes.payment_session_id;
    if (!paymentSessionId) {
      console.error(
        '[cashfree/create-order] No payment_session_id. CF response:',
        JSON.stringify(cfRes)
      );
      return res.status(502).json({
        success: false,
        error: cfRes.message || 'Payment gateway error. Check credentials and try again.',
      });
    }

    res.json({
      success: true,
      order_id: orderId,
      payment_session_id: paymentSessionId,
      env: process.env.CASHFREE_ENV || 'sandbox',
    });
  } catch (err) {
    const cfData = err.response && err.response.data;
    const cfMsg = cfData && (cfData.message || cfData.error || JSON.stringify(cfData));
    console.error('[cashfree/create-order]', cfMsg || err.message, cfData || '');
    const status = (err.response && err.response.status) || 500;
    res
      .status(status)
      .json({ success: false, error: cfMsg || err.message || 'Could not create order.' });
  }
});

// Helper: write/overwrite the subscription row using UPDATE-then-INSERT
// (avoids ON CONFLICT (user_id) which needs a UNIQUE constraint on tool_subscriptions)
async function upsertSubscription(
  userId,
  planId,
  billingCycle,
  txnId,
  paymentId,
  cfOrderId,
  amount,
  startDate,
  expiryDate,
  credits
) {
  const upd = await db.query(
    `UPDATE tool_subscriptions
        SET plan_id=$2, billing_cycle=$3, status='active', start_date=$4, expiry_date=$5,
            auto_renew=TRUE, remaining_credits=$6, credits_used=0,
            transaction_id=$7, payment_id=$8, cashfree_order_id=$9, amount=$10, updated_at=NOW()
      WHERE user_id=$1`,
    [
      userId,
      planId,
      billingCycle,
      startDate,
      expiryDate,
      credits,
      txnId,
      paymentId,
      cfOrderId,
      amount,
    ]
  );
  if (upd.rowCount === 0) {
    await db.query(
      `INSERT INTO tool_subscriptions
         (user_id, plan_id, billing_cycle, status, start_date, expiry_date,
          auto_renew, remaining_credits, credits_used, transaction_id, payment_id, cashfree_order_id, amount)
         VALUES ($1,$2,$3,'active',$4,$5,TRUE,$6,0,$7,$8,$9,$10)`,
      [
        userId,
        planId,
        billingCycle,
        startDate,
        expiryDate,
        credits,
        txnId,
        paymentId,
        cfOrderId,
        amount,
      ]
    );
  }
  // Sync user_subscriptions so login / admin / dashboard all see the correct plan immediately
  await db.query(
    `INSERT INTO user_subscriptions (user_id,plan_id,status,billing_cycle,start_date,end_date,updated_at)
     VALUES ($1,$2,'ACTIVE',$3,$4,$5,NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET plan_id=$2, status='ACTIVE', billing_cycle=$3, start_date=$4, end_date=$5, updated_at=NOW()`,
    [userId, planId, billingCycle, startDate, expiryDate]
  );
}

/* helper: verify a course purchase order (REC- prefix) */
async function verifyCourseOrder(orderId, res) {
  const { rows: cpRows } = await db.query(
    'SELECT * FROM course_purchases WHERE cashfree_order_id=$1',
    [orderId]
  );
  if (!cpRows.length) return res.status(404).json({ success: false, error: 'Order not found.' });
  const cp = cpRows[0];

  if (cp.payment_status === 'paid') {
    return res.json({ success: true, status: 'paid', order_id: orderId });
  }

  let cfOrder;
  try {
    cfOrder = await cashfree('GET', `/orders/${orderId}`);
  } catch (cfErr) {
    console.error('[cashfree/verify-course] CF error:', cfErr.message);
    return res.status(502).json({ success: false, error: 'Could not reach payment gateway.' });
  }

  const cfStatus = (cfOrder.order_status || '').toUpperCase();

  if (cfStatus === 'PAID') {
    let cfPayments = [];
    try {
      const cfPayRes = await cashfree('GET', `/orders/${orderId}/payments`);
      cfPayments = Array.isArray(cfPayRes) ? cfPayRes : cfPayRes.data || [];
    } catch (_) {
      /* non-fatal */
    }

    const latestPay = cfPayments[0] || {};
    const txnId = latestPay.cf_payment_id ? String(latestPay.cf_payment_id) : null;
    const paymentId = latestPay.payment_method ? JSON.stringify(latestPay.payment_method) : null;

    const purchaseDate = new Date();
    const validUntil = new Date(purchaseDate);
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    await db.query(
      `UPDATE course_purchases
         SET payment_status='paid', txn_id=$1, payment_id=$2,
             purchase_date=$3, valid_until=$4, updated_at=NOW()
       WHERE cashfree_order_id=$5`,
      [txnId, paymentId, purchaseDate.toISOString(), validUntil.toISOString(), orderId]
    );

    // Upsert course enrollment row so the learner can access the course
    try {
      await db.query(
        `INSERT INTO course_enrollments (user_id, course_id, status)
         VALUES ($1, $2, 'active')
         ON CONFLICT (user_id, course_id) DO UPDATE SET status='active'`,
        [cp.user_id, cp.course_id]
      );
    } catch (enrollErr) {
      console.error('[verifyCourseOrder] enrollment insert failed:', enrollErr.message);
    }

    // Record coupon usage if applied
    if (cp.coupon_id) {
      await db
        .query(`INSERT INTO coupon_usage (coupon_id, user_id, order_id) VALUES ($1,$2,$3)`, [
          cp.coupon_id,
          cp.user_id,
          orderId,
        ])
        .catch(() => {});
    }

    return res.json({ success: true, status: 'paid', order_id: orderId });
  }

  if (cfStatus === 'EXPIRED' || cfStatus === 'CANCELLED') {
    await db.query(
      `UPDATE course_purchases SET payment_status='failed', updated_at=NOW() WHERE cashfree_order_id=$1`,
      [orderId]
    );
    return res.json({ success: false, status: cfStatus.toLowerCase(), order_id: orderId });
  }

  return res.json({
    success: true,
    status: cfStatus.toLowerCase() || 'pending',
    order_id: orderId,
  });
}

/* POST /api/cashfree/create-course-order */
app.post('/api/cashfree/create-course-order', verifyAccessToken, async (req, res) => {
  try {
    const { courseId, couponCode } = req.body;
    if (!courseId) return res.status(400).json({ success: false, error: 'courseId required.' });

    const { rows: courseRows } = await db.query(
      "SELECT * FROM courses WHERE id=$1 AND status='published'",
      [courseId]
    );
    if (!courseRows.length) {
      return res.status(404).json({ success: false, error: 'Course not found or not available.' });
    }
    const course = courseRows[0];

    // Already purchased and valid?
    const { rows: existingRows } = await db.query(
      `SELECT id FROM course_purchases WHERE user_id=$1 AND course_id=$2 AND payment_status='paid' AND valid_until > NOW()`,
      [req.user.id, courseId]
    );
    if (existingRows.length) {
      return res.status(400).json({ success: false, error: 'Course already purchased and valid.' });
    }

    const baseAmount = parseFloat(course.discounted_price) || 0;
    if (baseAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Course is free or not priced.' });
    }

    // Resolve coupon
    let couponId = null;
    let couponDiscount = 0;
    let resolvedCouponCode = null;
    if (couponCode) {
      const { rows: cRows } = await db.query(
        `SELECT * FROM coupons WHERE code=$1 AND active=TRUE`,
        [couponCode.toUpperCase().trim()]
      );
      if (cRows.length) {
        const coupon = cRows[0];
        const now = new Date();
        const notExpired =
          !coupon.expires || coupon.expires === 'No expiry' || new Date(coupon.expires) >= now;
        const inWindow = notExpired;
        const appliesToCourse =
          coupon.applies_to === 'all' ||
          coupon.applies_to === 'courses' ||
          coupon.applies_to === 'course';
        if (inWindow && appliesToCourse) {
          const { rows: usageRows } = await db.query(
            `SELECT COUNT(*) AS cnt FROM coupon_usage WHERE coupon_id=$1 AND user_id=$2`,
            [coupon.id, req.user.id]
          );
          if (parseInt(usageRows[0].cnt) < (coupon.per_user_limit || 1)) {
            if (coupon.type === 'percent') {
              couponDiscount = (baseAmount * parseFloat(coupon.val)) / 100;
            } else {
              couponDiscount = Math.min(parseFloat(coupon.val), baseAmount);
            }
            couponDiscount = parseFloat(couponDiscount.toFixed(2));
            couponId = coupon.id;
            resolvedCouponCode = coupon.code;
          }
        }
      }
    }

    const amountAfterCoupon = Math.max(0, baseAmount - couponDiscount);
    const gstAmount = parseFloat((amountAfterCoupon * 0.18).toFixed(2));
    const finalAmount = parseFloat((amountAfterCoupon + gstAmount).toFixed(2));

    const { rows: userRows } = await db.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    const user = userRows[0] || {};

    const orderId = `REC-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const appUrl = process.env.APP_URL || 'https://rising-edge.in';

    const cfPayload = {
      order_id: orderId,
      order_amount: finalAmount,
      order_currency: 'INR',
      customer_details: {
        customer_id: req.user.id,
        customer_email: user.email || '',
        customer_phone: user.mobile || '9999999999',
        customer_name: user.full_name || 'User',
      },
      order_meta: {
        return_url: `${appUrl}/Trainings/verify-purchase.html?order_id={order_id}`,
      },
    };

    const cfOrder = await cashfree('POST', '/orders', cfPayload);
    if (!cfOrder.payment_session_id) {
      console.error('[create-course-order] CF response:', cfOrder);
      return res.status(502).json({ success: false, error: 'Could not create payment session.' });
    }

    await db.query(
      `INSERT INTO course_purchases
         (cashfree_order_id, user_id, course_id, coupon_code, coupon_id, coupon_discount,
          original_price, discounted_price, gst_amount, paid_amount, payment_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending')`,
      [
        orderId,
        req.user.id,
        courseId,
        resolvedCouponCode,
        couponId,
        couponDiscount,
        parseFloat(course.original_price) || baseAmount,
        baseAmount,
        gstAmount,
        finalAmount,
      ]
    );

    res.json({
      success: true,
      orderId,
      paymentSessionId: cfOrder.payment_session_id,
      amount: finalAmount,
      breakdown: { base: baseAmount, couponDiscount, gst: gstAmount, total: finalAmount },
    });
  } catch (err) {
    console.error('[create-course-order]', err);
    res.status(500).json({ success: false, error: err.message || 'Could not create order.' });
  }
});

/* POST /api/cashfree/verify
   – No JWT required: the order_id is cryptographically unguessable (RE-{ts}-{6hex})
     and Cashfree only redirects here after a genuine payment attempt.
     Requiring a JWT caused failures when the 15-min access token expired
     during the Cashfree checkout flow (UPI / 3D Secure / net banking). */
app.post('/api/cashfree/verify', async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ success: false, error: 'orderId required.' });

    // Course orders use a different table
    if (orderId.startsWith('REC-')) {
      return await verifyCourseOrder(orderId, res);
    }

    const { rows: payRows } = await db.query('SELECT * FROM tool_payments WHERE order_id=$1', [
      orderId,
    ]);
    if (!payRows.length) return res.status(404).json({ success: false, error: 'Order not found.' });
    const pay = payRows[0];

    // If already confirmed, return cached result
    if (pay.status === 'paid') {
      return res.json({ success: true, status: 'paid', order_id: orderId });
    }

    // Query Cashfree for current order status
    let cfOrder;
    try {
      cfOrder = await cashfree('GET', `/orders/${orderId}`);
    } catch (cfErr) {
      console.error('[cashfree/verify] CF fetch error:', cfErr.message);
      return res.status(502).json({ success: false, error: 'Could not reach payment gateway.' });
    }

    const cfStatus = (cfOrder.order_status || '').toUpperCase();

    if (cfStatus === 'PAID') {
      // Fetch payment details
      let cfPayments = [];
      try {
        const cfPayRes = await cashfree('GET', `/orders/${orderId}/payments`);
        cfPayments = Array.isArray(cfPayRes) ? cfPayRes : cfPayRes.data || [];
      } catch (_) {
        /* non-fatal */
      }

      const latestPay = cfPayments[0] || {};
      const txnId = latestPay.cf_payment_id ? String(latestPay.cf_payment_id) : null;
      const paymentId = latestPay.payment_method ? JSON.stringify(latestPay.payment_method) : null;

      // Calculate subscription dates
      const planRow = (
        await db.query('SELECT * FROM subscription_plans WHERE id=$1', [pay.plan_id])
      ).rows[0];
      const credits = planRow
        ? (pay.billing_cycle === 'yearly' ? planRow.yearly_credits : planRow.monthly_credits) || 0
        : 0;
      const startDate = new Date();
      const expiryDate = new Date(startDate);
      if (pay.billing_cycle === 'yearly') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      } else {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      }

      await upsertSubscription(
        pay.user_id,
        pay.plan_id,
        pay.billing_cycle,
        txnId,
        paymentId,
        orderId,
        pay.amount,
        startDate.toISOString(),
        expiryDate.toISOString(),
        credits
      );

      await db.query(
        `UPDATE tool_payments SET status='paid', txn_id=$1, payment_id=$2, updated_at=NOW() WHERE order_id=$3`,
        [txnId, paymentId, orderId]
      );

      return res.json({ success: true, status: 'paid', order_id: orderId });
    }

    if (cfStatus === 'EXPIRED' || cfStatus === 'CANCELLED') {
      await db.query(
        `UPDATE tool_payments SET status='failed', updated_at=NOW() WHERE order_id=$1`,
        [orderId]
      );
      return res.json({ success: false, status: cfStatus.toLowerCase(), order_id: orderId });
    }

    // Still pending
    return res.json({
      success: true,
      status: cfStatus.toLowerCase() || 'pending',
      order_id: orderId,
    });
  } catch (err) {
    console.error('[cashfree/verify]', err);
    res.status(500).json({ success: false, error: err.message || 'Verification failed.' });
  }
});

/* POST /api/cashfree/webhook — Cashfree server-to-server notification */
app.post('/api/cashfree/webhook', express.json(), async (req, res) => {
  try {
    const event = req.body;
    if (!event || !event.data) return res.sendStatus(200);

    const { order } = event.data;
    if (!order || !order.order_id) return res.sendStatus(200);

    const orderId = order.order_id;
    const { rows: payRows } = await db.query('SELECT * FROM tool_payments WHERE order_id=$1', [
      orderId,
    ]);
    if (!payRows.length) return res.sendStatus(200);
    const pay = payRows[0];

    if ((order.order_status || '').toUpperCase() === 'PAID' && pay.status !== 'paid') {
      const payment = event.data.payment || {};
      const txnId = payment.cf_payment_id ? String(payment.cf_payment_id) : null;
      const paymentId = payment.payment_method ? JSON.stringify(payment.payment_method) : null;

      const planRow = (
        await db.query('SELECT * FROM subscription_plans WHERE id=$1', [pay.plan_id])
      ).rows[0];
      const credits = planRow
        ? (pay.billing_cycle === 'yearly' ? planRow.yearly_credits : planRow.monthly_credits) || 0
        : 0;
      const startDate = new Date();
      const expiryDate = new Date(startDate);
      if (pay.billing_cycle === 'yearly') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      } else {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      }

      // Upsert tool_subscriptions
      const upd = await db.query(
        `UPDATE tool_subscriptions
            SET plan_id=$2, billing_cycle=$3, status='active', start_date=$4, expiry_date=$5,
                auto_renew=TRUE, remaining_credits=$6, credits_used=0,
                transaction_id=$7, payment_id=$8, cashfree_order_id=$9, amount=$10, updated_at=NOW()
          WHERE user_id=$1`,
        [
          pay.user_id,
          pay.plan_id,
          pay.billing_cycle,
          startDate,
          expiryDate,
          credits,
          txnId,
          paymentId,
          orderId,
          pay.amount,
        ]
      );
      if (upd.rowCount === 0) {
        await db.query(
          `INSERT INTO tool_subscriptions
             (user_id, plan_id, billing_cycle, status, start_date, expiry_date,
              auto_renew, remaining_credits, credits_used, transaction_id, payment_id, cashfree_order_id, amount)
             VALUES ($1,$2,$3,'active',$4,$5,TRUE,$6,0,$7,$8,$9,$10)`,
          [
            pay.user_id,
            pay.plan_id,
            pay.billing_cycle,
            startDate,
            expiryDate,
            credits,
            txnId,
            paymentId,
            orderId,
            pay.amount,
          ]
        );
      }
      // Sync user_subscriptions
      await db.query(
        `INSERT INTO user_subscriptions (user_id,plan_id,status,billing_cycle,start_date,end_date,updated_at)
         VALUES ($1,$2,'ACTIVE',$3,$4,$5,NOW())
         ON CONFLICT (user_id) DO UPDATE
           SET plan_id=$2, status='ACTIVE', billing_cycle=$3, start_date=$4, end_date=$5, updated_at=NOW()`,
        [pay.user_id, pay.plan_id, pay.billing_cycle, startDate, expiryDate]
      );

      await db.query(
        `UPDATE tool_payments SET status='paid', txn_id=$1, payment_id=$2, updated_at=NOW() WHERE order_id=$3`,
        [txnId, paymentId, orderId]
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('[cashfree/webhook]', err);
    res.sendStatus(200); // always 200 to prevent Cashfree retries
  }
});

// Awards badges to the top 3 finishers of a closed challenge, once ranks
// have been frozen — no certificate is generated or emailed for weekly
// challenges (course certificates elsewhere are unaffected). Rank 1 gets
// the "champion" badge (one-time, ever), ranks 1-3 all get "podium"
// (also one-time, ever — badges are achievements, not counters).
// Separately, every top-3 winner's cumulative podium_finishes counter on
// user_points increments by 1 EVERY week they place, not just the first.
// Idempotent — the whdc_podium_log primary key (user_id, challenge_id)
// means calling this twice for the same challenge (manual close + auto
// lifecycle both call it) never double-counts or double-awards.
async function awardWhdcTopBadges(challengeId, topN = 3) {
  try {
    const { rows: ch } = await db.query(`SELECT title FROM challenges WHERE id=$1`, [challengeId]);
    const title = ch[0]?.title || 'Weekly Challenge';

    const { rows: winners } = await db.query(
      `SELECT a.user_id, a.rank, u.full_name
         FROM challenge_attempts a JOIN users u ON u.id = a.user_id
        WHERE a.challenge_id=$1 AND a.is_practice=FALSE AND a.status<>'in_progress'
          AND a.rank IS NOT NULL AND a.rank <= $2
        ORDER BY a.rank ASC`,
      [challengeId, topN]
    );

    let counted = 0;
    for (const w of winners) {
      // Idempotency gate — first time this (user, challenge) pair is seen.
      const log = await db
        .query(
          `INSERT INTO whdc_podium_log (user_id, challenge_id, rank) VALUES ($1,$2,$3)
           ON CONFLICT (user_id, challenge_id) DO NOTHING RETURNING user_id`,
          [w.user_id, challengeId, w.rank]
        )
        .catch(e => {
          console.error('[whdc/podium-log]', e.message);
          return { rows: [] };
        });
      if (!log.rows.length) continue; // already processed for this challenge

      // Weekly ranking count — increments every week, not gated by the
      // one-time badge unique index below.
      await db
        .query(
          `INSERT INTO user_points (user_id, podium_finishes) VALUES ($1,1)
           ON CONFLICT (user_id) DO UPDATE SET podium_finishes = user_points.podium_finishes + 1,
             updated_at = NOW()`,
          [w.user_id]
        )
        .catch(() => {});

      // Rank badges — one-time achievements, only knowable now that final
      // rank is frozen.
      const rankCodes = [];
      if (w.rank === 1) rankCodes.push('champion');
      if (w.rank <= 3) rankCodes.push('podium');
      for (const code of rankCodes) {
        const b = (await db.query(`SELECT id FROM badges WHERE code=$1`, [code])).rows[0];
        if (!b) continue;
        await db
          .query(
            `INSERT INTO user_badges (user_id,badge_id,challenge_id) VALUES ($1,$2,$3)
             ON CONFLICT (user_id,badge_id) DO NOTHING`,
            [w.user_id, b.id, challengeId]
          )
          .catch(() => {});
      }

      await db
        .query(
          `INSERT INTO notifications (user_id, type, title, message, data)
           VALUES ($1,'podium_finish',$2,$3,$4)`,
          [
            w.user_id,
            'Top-3 finish! 🏅',
            `You finished #${w.rank} in "${title}" — nice work! Your podium count just went up.`,
            JSON.stringify({ challengeId, rank: w.rank }),
          ]
        )
        .catch(() => {});

      counted++;
    }
    if (counted) {
      console.log(`[whdc] awarded top-${topN} badges to ${counted} finisher(s) for ${challengeId}`);
    }
  } catch (err) {
    console.error('[whdc/top-badges]', err.message);
  }
}

// Emails every participant (any status other than in_progress) of a closed
// challenge with the top-10 leaderboard and their own placement. This is a
// plain broadcast rather than a one-time state transition, so it's safe to
// call more than once — used from whdcRunLifecycle's auto-close path and
// from the admin "Send Results" button. Pass { testOnly: true } to redirect
// the audience to SUPER_ADMIN accounts only (the real top-10 list is still
// used, so the admin previews real data) — used by the "Send Test" button.
async function whdcSendResultsEmail(challengeId, opts) {
  opts = opts || {};
  try {
    const { rows: chRows } = await db.query(`SELECT id, title FROM challenges WHERE id=$1`, [
      challengeId,
    ]);
    const ch = chRows[0];
    if (!ch) return { sent: 0, total: 0 };

    const top10 = (
      await db.query(
        `SELECT u.full_name AS name, a.rank, a.final_score AS score
           FROM challenge_attempts a JOIN users u ON u.id = a.user_id
          WHERE a.challenge_id=$1 AND a.is_practice=FALSE AND a.status<>'in_progress'
            AND a.rank IS NOT NULL AND a.rank <= 10
          ORDER BY a.rank ASC`,
        [challengeId]
      )
    ).rows;
    const top10List = top10.length
      ? top10.map(t => `- **#${t.rank} ${t.name || 'Participant'}** — ${t.score} pts`).join('\n')
      : 'No ranked entries this week.';

    const mailRows = opts.testOnly
      ? await getBroadcastRecipients('superadmin')
      : (
          await db.query(
            `SELECT DISTINCT u.email, u.full_name AS name, a.rank
               FROM challenge_attempts a JOIN users u ON u.id = a.user_id
              WHERE a.challenge_id=$1 AND a.is_practice=FALSE AND a.status<>'in_progress'
                AND u.email IS NOT NULL`,
            [challengeId]
          )
        ).rows;
    const leaderboardLink = `${FRONTEND_URL}/Challenge/leaderboard.html`;
    let sent = 0;
    for (const r of mailRows) {
      const yourRankLine = opts.testOnly
        ? 'This is a test send — a real results email includes your own rank.'
        : r.rank
          ? `You finished **#${r.rank}**.`
          : '';
      const { subject, html } = renderEmailTemplate('results-published', {
        name: r.name || 'there',
        challengeTitle: ch.title,
        yourRankLine,
        top10List,
        leaderboardLink,
      });
      try {
        await sendMail({
          to: r.email,
          subject: opts.testOnly ? `[TEST] ${subject}` : subject,
          html,
        });
        sent++;
      } catch (e) {
        // best-effort — one failed recipient shouldn't stop the rest
      }
      await new Promise(rs => setTimeout(rs, 120));
    }
    console.log(
      `[whdc] emailed results to ${sent}/${mailRows.length} ${opts.testOnly ? 'super admin(s) [TEST]' : 'participant(s)'} for ${challengeId}`
    );
    return { sent, total: mailRows.length };
  } catch (err) {
    console.error('[whdc/results-email]', err.message);
    return { sent: 0, total: 0 };
  }
}

// Emails registered users who have not yet submitted a scored attempt for
// the given challenge, nudging them before it closes. Called automatically
// every 2 days per live challenge (see whdcRunLifecycle) and on-demand from
// the admin "Send Reminders" button — both paths funnel through here so the
// audience and template are always identical.
//
// Pass { testOnly: true } to redirect the audience to SUPER_ADMIN accounts
// only (used by the "Send Test" button). Unlike the certificate/results test
// paths, which still send one email per recipient, the reminder test sends
// a SINGLE email addressed to all super admins at once — the real reminder
// loop can fan out to many non-submitters, and firing one email per super
// admin on every test click would just be noise. Test sends also skip the
// last_reminder_sent_at update so they don't disturb the real 2-day cadence.
async function whdcSendReminders(challengeId, opts) {
  opts = opts || {};
  try {
    const { rows: chRows } = await db.query(
      `SELECT id, title, closes_at FROM challenges WHERE id=$1`,
      [challengeId]
    );
    const ch = chRows[0];
    if (!ch) return { sent: 0, total: 0 };

    const challengeLink = `${FRONTEND_URL}/Challenge/attempt.html`;
    const closesAtLabel = ch.closes_at
      ? new Date(ch.closes_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
      : 'soon';

    if (opts.testOnly) {
      const admins = await getBroadcastRecipients('superadmin');
      if (!admins.length) return { sent: 0, total: 0 };
      const { subject, html } = renderEmailTemplate('challenge-reminder', {
        name: 'Team',
        challengeTitle: ch.title,
        closesAt: closesAtLabel,
        challengeLink,
      });
      const toList = admins.map(a => a.email);
      let sent = 0;
      try {
        await sendMail({ to: toList, subject: `[TEST] ${subject}`, html });
        sent = toList.length;
      } catch (e) {
        // best-effort
      }
      console.log(
        `[whdc] sent 1 merged test reminder email to ${sent} super admin(s) for ${challengeId}`
      );
      return { sent, total: toList.length };
    }

    const submitted = (
      await db.query(
        `SELECT DISTINCT user_id FROM challenge_attempts
          WHERE challenge_id=$1 AND is_practice=FALSE AND status<>'in_progress'`,
        [challengeId]
      )
    ).rows.map(r => r.user_id);

    const { rows: users } = await db.query(
      submitted.length
        ? `SELECT full_name AS name, email FROM users
            WHERE status NOT IN ('DELETED','SUSPENDED') AND email IS NOT NULL AND id <> ALL($1)`
        : `SELECT full_name AS name, email FROM users
            WHERE status NOT IN ('DELETED','SUSPENDED') AND email IS NOT NULL`,
      submitted.length ? [submitted] : []
    );

    let sent = 0;
    for (const u of users) {
      const { subject, html } = renderEmailTemplate('challenge-reminder', {
        name: u.name || 'there',
        challengeTitle: ch.title,
        closesAt: closesAtLabel,
        challengeLink,
      });
      try {
        await sendMail({ to: u.email, subject, html });
        sent++;
      } catch (e) {
        // best-effort — one failed recipient shouldn't stop the rest
      }
      await new Promise(rs => setTimeout(rs, 120));
    }
    await db
      .query(`UPDATE challenges SET last_reminder_sent_at=NOW() WHERE id=$1`, [challengeId])
      .catch(() => {});
    console.log(
      `[whdc] sent ${sent}/${users.length} reminder email(s) for ${challengeId} (${ch.title})`
    );
    return { sent, total: users.length };
  } catch (err) {
    console.error('[whdc/reminder]', err.message);
    return { sent: 0, total: 0 };
  }
}

// ── WHDC weekly lifecycle scheduler ─────────────────────────────────────────
// Idempotent tick: opens scheduled challenges whose time has come, closes live
// challenges past their deadline, freezes ranks and awards badges (no emails).
// Runs daily (see startWhdcScheduler); each transition happens once (guarded by status).
async function whdcRunLifecycle() {
  try {
    const opened = await db.query(
      `UPDATE challenges SET status='live', updated_at=NOW(), last_reminder_sent_at=NOW()
        WHERE status='scheduled' AND opens_at IS NOT NULL AND opens_at <= NOW()
        RETURNING id, title`
    );
    for (const ch of opened.rows) {
      console.log(`[whdc] opened challenge ${ch.id} (${ch.title})`);
    }

    const toClose = (
      await db.query(
        `SELECT id, title FROM challenges
          WHERE status='live' AND closes_at IS NOT NULL AND closes_at <= NOW()`
      )
    ).rows;
    for (const ch of toClose) {
      await db.query(`UPDATE challenges SET status='closed', updated_at=NOW() WHERE id=$1`, [
        ch.id,
      ]);
      // SUPER_ADMIN accounts never occupy a leaderboard/rank slot — clear any
      // stale rank they might have, then rank everyone else.
      await db.query(
        `UPDATE challenge_attempts SET rank=NULL
          WHERE challenge_id=$1 AND user_id IN (SELECT id FROM users WHERE role='SUPER_ADMIN')`,
        [ch.id]
      );
      await db.query(
        `WITH ranked AS (
           SELECT ca.id, RANK() OVER (ORDER BY ca.final_score DESC, ca.time_taken_sec ASC) AS rnk
             FROM challenge_attempts ca
             JOIN users u ON u.id = ca.user_id
            WHERE ca.challenge_id=$1 AND ca.is_practice=FALSE AND ca.status<>'in_progress'
              AND u.role <> 'SUPER_ADMIN'
         )
         UPDATE challenge_attempts a SET rank=r.rnk FROM ranked r WHERE a.id=r.id`,
        [ch.id]
      );
      await awardWhdcTopBadges(ch.id);
      const parts = (
        await db.query(
          `SELECT DISTINCT user_id FROM challenge_attempts
            WHERE challenge_id=$1 AND is_practice=FALSE AND status<>'in_progress'`,
          [ch.id]
        )
      ).rows;
      for (const p of parts) {
        await db
          .query(
            `INSERT INTO notifications (user_id, type, title, message, data)
             VALUES ($1,'results_ready',$2,$3,$4)`,
            [
              p.user_id,
              'Weekly challenge results published',
              `Final standings for "${ch.title}" are now live.`,
              JSON.stringify({ challengeId: ch.id }),
            ]
          )
          .catch(() => {});
      }
      console.log(
        `[whdc] closed challenge ${ch.id} (${ch.title}); froze ranks, notified ${parts.length} participants`
      );
    }

    // Automatic challenge emails (announcement, results, reminders) are turned off.
  } catch (err) {
    console.error('[whdc/scheduler]', err.message);
  }
}

function startWhdcScheduler() {
  // Runs once at startup and then once a day. A per-minute tick kept the Neon
  // database awake around the clock; daily runs let it scale to zero. Trade-off:
  // challenges open/close up to 24 h after their opens_at / closes_at.
  const everyMs = 24 * 60 * 60 * 1000; // once a day
  whdcRunLifecycle();
  setInterval(whdcRunLifecycle, everyMs);
  console.log('[whdc] weekly lifecycle scheduler started (daily)');
}

// ── Jobs Board: auto-remove postings past their removal date ─────────────────
// Positions are soft-deleted once remove_at passes (default: 3 weeks after
// posting, or the explicit removal date set by the recruiter).
async function jobsRemovalSweep() {
  try {
    const { rows } = await db.query(
      `UPDATE jobs SET status='DELETED', updated_at=NOW()
        WHERE status <> 'DELETED' AND remove_at IS NOT NULL AND remove_at < NOW()
        RETURNING id, title`
    );
    if (rows.length) {
      console.log(`[jobs] auto-removed ${rows.length} posting(s) past their removal date`);
    }
  } catch (err) {
    console.error('[jobs/sweep]', err.message);
  }
  await flushAdCounters(); // daily batch write of ad impressions/clicks
}

function startJobsSweep() {
  jobsRemovalSweep();
  setInterval(jobsRemovalSweep, 24 * 60 * 60 * 1000); // once a day (lets Neon scale to zero)
  console.log('[jobs] removal sweep started (daily)');
}

module.exports = { app, whdcRunLifecycle };

// -- Boot ---------------------------------------------------------------------
if (require.main === module) {
  app.listen(PORT, () => console.log(`Rising Edge API on :${PORT}`));
  // Write buffered ad impressions/clicks before the process exits (deploys).
  for (const sig of ['SIGTERM', 'SIGINT']) {
    process.once(sig, () => {
      // eslint-disable-next-line no-process-exit
      const exit = () => process.exit(0);
      flushAdCounters().finally(exit);
      setTimeout(exit, 5000).unref();
    });
  }
  initDB()
    .then(() => {
      startWhdcScheduler();
      startJobsSweep();
    })
    .catch(err => {
      console.error('[initDB] Non-fatal migration warning', err.message);
      // Still start the schedulers; tables may already exist from a prior run.
      startWhdcScheduler();
      startJobsSweep();
    });
}
