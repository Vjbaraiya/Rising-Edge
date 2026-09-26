-- ============================================================================
-- Weekly Hardware Design Challenge (WHDC) — PostgreSQL schema
-- Conventions match server.js initDB(): TEXT UUID PKs via gen_random_uuid()::text,
-- TIMESTAMPTZ + NOW() defaults, JSONB payloads, FK ON DELETE CASCADE.
-- Paste these CREATE blocks into initDB() (they are idempotent), or run this file
-- once against the database. Reuses users, certificate_issues, notifications.
-- ============================================================================

-- 1) Challenges -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS challenges (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  week_number          INT,
  title                TEXT NOT NULL,
  slug                 TEXT UNIQUE NOT NULL,
  topic                TEXT,
  category_id          TEXT REFERENCES course_categories(id),
  difficulty           TEXT NOT NULL DEFAULT 'Intermediate',   -- Beginner|Intermediate|Advanced|Mixed
  description          TEXT,
  cover_url            TEXT,
  time_limit_min       INT NOT NULL DEFAULT 20,
  total_points         INT NOT NULL DEFAULT 100,
  scoring_rule_version INT NOT NULL DEFAULT 1,
  linked_course_id     TEXT REFERENCES courses(id),            -- for weak-topic upsell
  opens_at             TIMESTAMPTZ,
  closes_at            TIMESTAMPTZ,
  status               TEXT NOT NULL DEFAULT 'draft',          -- draft|scheduled|live|closed|archived
  created_by           TEXT REFERENCES users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status, opens_at, closes_at);

-- 2) Questions (reusable bank; challenge_id NULL = bank-only) ---------------
CREATE TABLE IF NOT EXISTS challenge_questions (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  challenge_id     TEXT REFERENCES challenges(id) ON DELETE CASCADE,
  type             TEXT NOT NULL,                              -- mcq|multi|numeric|truefalse|short
  prompt           TEXT NOT NULL,
  assets           JSONB,                                      -- images / SVG / MathJax
  options          JSONB,                                      -- [{id,text}, ...]
  answer_key       JSONB NOT NULL,                             -- server-only; never sent pre-submit
  points           INT NOT NULL DEFAULT 10,
  negative_marking NUMERIC(5,2) NOT NULL DEFAULT 0,
  partial_credit   BOOLEAN NOT NULL DEFAULT FALSE,
  numeric_tolerance NUMERIC,                                   -- for numeric answers
  topic_tag        TEXT,
  difficulty_tag   TEXT,
  explanation      TEXT,
  position         INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_questions_challenge ON challenge_questions(challenge_id, position);
CREATE INDEX IF NOT EXISTS idx_questions_tags ON challenge_questions(topic_tag, difficulty_tag);

-- 3) Attempts (one scored per user per challenge) ---------------------------
CREATE TABLE IF NOT EXISTS challenge_attempts (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  challenge_id   TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'in_progress',          -- in_progress|submitted|auto_submitted|disqualified
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at   TIMESTAMPTZ,
  deadline_at    TIMESTAMPTZ,                                  -- server-authoritative timer end
  raw_score      NUMERIC(6,2) NOT NULL DEFAULT 0,
  final_score    NUMERIC(8,2) NOT NULL DEFAULT 0,              -- raw x time_factor (ranking)
  time_taken_sec INT,
  correct_count  INT NOT NULL DEFAULT 0,
  question_order JSONB,                                        -- randomized order for this attempt
  rank           INT,                                          -- set at challenge close
  is_practice    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- one scored attempt per user per challenge (practice rows excluded)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_attempt_scored
  ON challenge_attempts(challenge_id, user_id) WHERE is_practice = FALSE;
CREATE INDEX IF NOT EXISTS idx_attempts_rank
  ON challenge_attempts(challenge_id, final_score DESC, time_taken_sec ASC);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON challenge_attempts(user_id);

-- 4) Per-question answers (autosaved during the attempt) --------------------
CREATE TABLE IF NOT EXISTS attempt_answers (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  attempt_id    TEXT NOT NULL REFERENCES challenge_attempts(id) ON DELETE CASCADE,
  question_id   TEXT NOT NULL REFERENCES challenge_questions(id) ON DELETE CASCADE,
  response      JSONB,                                         -- {choice} | {choices:[]} | {value}
  is_correct    BOOLEAN,
  points_earned NUMERIC(6,2) NOT NULL DEFAULT 0,
  answered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (attempt_id, question_id)
);

-- 5) Lifetime points / streak / tier (aggregate) ---------------------------
CREATE TABLE IF NOT EXISTS user_points (
  user_id                 TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  lifetime_points         INT NOT NULL DEFAULT 0,
  tier                    TEXT NOT NULL DEFAULT 'Bronze',      -- Bronze|Silver|Gold|Platinum
  current_streak          INT NOT NULL DEFAULT 0,
  longest_streak          INT NOT NULL DEFAULT 0,
  challenges_played       INT NOT NULL DEFAULT 0,
  last_played_challenge_id TEXT REFERENCES challenges(id),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6) Points ledger (append-only, auditable source of truth) -----------------
CREATE TABLE IF NOT EXISTS points_ledger (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id TEXT REFERENCES challenges(id) ON DELETE SET NULL,
  reason       TEXT NOT NULL,                                  -- score|difficulty_bonus|participation|streak|admin_adjust
  points       INT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON points_ledger(user_id, created_at);

-- 7) Badges (data-driven definitions) --------------------------------------
CREATE TABLE IF NOT EXISTS badges (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  icon        TEXT,
  criteria    JSONB,                                           -- machine-checkable rule
  repeatable  BOOLEAN NOT NULL DEFAULT FALSE,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8) Badges earned by users ------------------------------------------------
CREATE TABLE IF NOT EXISTS user_badges (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id     TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  challenge_id TEXT REFERENCES challenges(id) ON DELETE SET NULL,
  awarded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_badge ON user_badges(user_id, badge_id);

-- 9) Reuse existing tables --------------------------------------------------
-- Certificates: link WHDC issuance to the existing engine instead of a new table.
ALTER TABLE certificate_issues ADD COLUMN IF NOT EXISTS challenge_id TEXT REFERENCES challenges(id) ON DELETE SET NULL;
ALTER TABLE certificate_issues ADD COLUMN IF NOT EXISTS source TEXT;  -- e.g. 'whdc'
-- Notifications: reuse the notifications table with new `type` values:
--   challenge_live | results_ready | badge_earned | rank_changed | streak_reminder | certificate_issued

-- 10) Leaderboard read model (optional; refresh at close for public page) ----
-- For launch/close spikes, materialize per-challenge standings:
-- CREATE MATERIALIZED VIEW IF NOT EXISTS challenge_leaderboard AS
--   SELECT a.challenge_id, a.user_id, u.full_name, u.current_role,
--          a.final_score, a.time_taken_sec,
--          RANK() OVER (PARTITION BY a.challenge_id
--                       ORDER BY a.final_score DESC, a.time_taken_sec ASC) AS rank
--     FROM challenge_attempts a JOIN users u ON u.id = a.user_id
--    WHERE a.status IN ('submitted','auto_submitted') AND a.is_practice = FALSE;
-- REFRESH MATERIALIZED VIEW challenge_leaderboard;  -- run at challenge close
