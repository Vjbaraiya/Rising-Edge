# Weekly Hardware Design Challenge — Requirements Specification

**Product:** Rising Edge Technologies — Weekly Hardware Design Challenge (WHDC)
**Document type:** Product & Technical Requirements Specification
**Version:** 1.0 (Draft)
**Status:** For review
**Owner:** Product / Engineering, Rising Edge Technologies

---

## 1. Overview

The Weekly Hardware Design Challenge (WHDC) is a gamified, recurring online assessment feature added to the existing Rising Edge Technologies platform. Every week a new hardware-design test is published. Registered users attempt it within a fixed window, earn a score, and are ranked on a public leaderboard. Over time users accumulate points, badges, streaks, and completion certificates, and their performance is tracked in a personal analytics dashboard.

WHDC is not a standalone product. It is a module that reuses the platform's existing infrastructure: the Node.js + Express backend, PostgreSQL database, JWT authentication (access/refresh tokens with HttpOnly cookies and email verification), the certificate-issuing engine (`certificate_issues` + QR verification), the in-app `notifications` system, the newsletter/email pipeline (nodemailer), the admin panel, and the vanilla-JavaScript PWA frontend built on the shared design-token CSS system and `core.js` auth helpers.

### 1.1 Goals

The platform must:

1. Increase user engagement through recurring weekly challenges.
2. Encourage continuous learning.
3. Improve user retention.
4. Build an engineering community.
5. Identify top-performing engineers.
6. Generate leads for premium courses.
7. Provide measurable learning progress.
8. Increase website traffic through weekly leaderboard publication.

### 1.2 Primary users

Hardware Engineers · PCB Designers · FPGA Engineers · Embedded Engineers · Electronics Students · Fresh Graduates · Design Verification Engineers · EMC Engineers.

### 1.3 Scope

**In scope (v1):** weekly challenge lifecycle (draft → scheduled → live → closed → archived); timed attempts; auto-graded question types; scoring and per-week + all-time leaderboards; points, badges, streaks; auto-issued participation/achievement certificates; personal analytics; admin authoring and publishing; email + in-app notifications; a public (shareable) weekly leaderboard page for SEO/traffic; course cross-sell hooks.

**Out of scope (v1):** peer-graded open-ended design submissions with human review; live/synchronous contests; team challenges; native mobile apps (the PWA covers mobile); paid entry fees for challenges.

---

## 2. Current platform context (baseline to reuse)

| Layer | Existing capability | How WHDC reuses it |
|---|---|---|
| Backend | Node.js + Express (`server.js`), PostgreSQL (`pg` Pool), helmet, cors, `express-rate-limit` | Add WHDC route group and tables to the same server and DB |
| Auth | JWT access + refresh tokens, HttpOnly cookies, bcrypt, email verification, `login_history`, roles (`USER`, admin) | Gate attempts behind `requireAuth`; reuse role checks for admin authoring |
| Users | `users` table (id, full_name, email, role, `current_role`, org, job_title, location, avatar_url, …) | Source of profile data for leaderboards and segmentation |
| Payments | Cashfree + Razorpay, `subscription_plans`, `user_subscriptions`, `coupons`, `plan_course_access` | Optional premium challenge tiers and course upsell/discount hooks |
| Learning | `courses`, `course_categories`, `course_enrollments`, `module_progress` | Map challenge topics to courses for targeted cross-sell |
| Certificates | `certificate_issues` (cert_number, QR verify, revoke), `Certificate/` generator + `verify.html` | Issue WHDC certificates through the same engine and verification URL |
| Notifications | `notifications` table (type, title, message, JSONB data, read state) | New-challenge, results-ready, badge-earned, rank-change alerts |
| Email | nodemailer + newsletter pipeline | Weekly announcement, results, and leaderboard digest emails |
| Admin | Admin panel (`Admin/*.html`: users, training-admin, analytics, broadcast, certificates, coupons, audit) | Add a Challenge Admin section following the same patterns |
| Frontend | Vanilla JS PWA, `assets/css/tokens.css`+`themes.css`+`components.css`, `core.js` (`reApiFetch`, `requireAuth`, nav/footer), Canvas, MathJax | Build challenge pages with the same design tokens, nav, and auth helpers |
| Tracking | `/api/track` event endpoint | Instrument funnel and engagement events for WHDC |

**Design principle:** WHDC introduces new tables and API routes but must not fork auth, theming, navigation, certificates, or payments — it extends them.

---

## 3. Functional requirements

### 3.1 Challenge lifecycle

- **FR-1.1** An admin can author a challenge with: title, slug, topic/category (mapped to a course category), difficulty (Beginner/Intermediate/Advanced/Mixed), description, cover image, time limit (minutes), question set, per-question points, scheduled open time, and close time.
- **FR-1.2** A challenge moves through states: `draft` → `scheduled` → `live` → `closed` → `archived`. State transitions are time-driven (open/close timestamps) with a manual override for admins.
- **FR-1.3** Exactly one challenge is designated the "current" weekly challenge at a time; scheduling prevents overlap gaps (each week has a live challenge).
- **FR-1.4** When a challenge goes live, the system fires in-app notifications and an announcement email to eligible users, and updates the WHDC landing page.
- **FR-1.5** When a challenge closes, scores are finalized, the leaderboard is frozen and published, results notifications are sent, and eligible certificates are issued.
- **FR-1.6** Past challenges are archived and remain viewable/practiceable (see FR-6.5) but no longer affect the competitive leaderboard.

### 3.2 Question types and authoring

- **FR-2.1** Support auto-gradable question types in v1: single-choice (MCQ), multiple-select, true/false, numeric-answer with tolerance, and short exact-match. (Question interactions mirror the existing training quiz components already used across the Trainings modules.)
- **FR-2.2** Each question stores: prompt (rich text + optional image, schematic SVG, or MathJax formula), options, correct answer(s), points, difficulty tag, topic tag, and an explanation shown after submission.
- **FR-2.3** Optional per-question negative marking and partial credit (multiple-select) configurable by the admin.
- **FR-2.4** Question bank: authored questions are reusable across challenges and tagged by topic and difficulty for future auto-assembly.
- **FR-2.5** (v1.1) Auto-assembly: generate a challenge by drawing N questions from the bank by topic/difficulty weighting.

### 3.3 Attempts

- **FR-3.1** Only authenticated, email-verified users may start an attempt (reuse `requireAuth` + `email_verified`).
- **FR-3.2** A user gets one scored attempt per challenge (configurable to allow re-attempts for practice after close).
- **FR-3.3** Starting an attempt records a server-side start timestamp; the countdown is enforced server-side (client timer is display only).
- **FR-3.4** The client autosaves answers periodically and on each answer change so a disconnect/refresh does not lose progress; the attempt resumes where the user left off within the time window.
- **FR-3.5** An attempt is submitted (a) manually by the user, (b) automatically when the time limit elapses, or (c) automatically at challenge close — whichever comes first.
- **FR-3.6** After submission (and, for scored ranking, after challenge close), the user sees their score, correct/incorrect breakdown, and per-question explanations.
- **FR-3.7** Anti-abuse: server-authoritative timing, one active attempt per user per challenge, rate limiting on submit, randomized question/option order per attempt, and answer keys never sent to the client until after submission.

### 3.4 Scoring

- **FR-4.1** Raw score = sum of earned question points. The final challenge score also incorporates a time factor so that, among equal raw scores, faster correct completion ranks higher (tie-breaker; exact formula in §6).
- **FR-4.2** Global points (lifetime XP) are awarded per challenge from: score achieved, difficulty multiplier, participation bonus, and streak bonus.
- **FR-4.3** Scoring rules are versioned and stored server-side so historical results are reproducible and auditable (reuse `audit_logs`).

### 3.5 Leaderboards

- **FR-5.1** Per-challenge leaderboard: rank, display name, avatar, role/org (optional), score, time, and a shareable public view.
- **FR-5.2** All-time leaderboard by lifetime points, plus rolling views (this month, this quarter).
- **FR-5.3** Segmented leaderboards filterable by role (e.g., FPGA Engineers, Students) and by topic.
- **FR-5.4** A **public, unauthenticated** weekly leaderboard page (top N) for SEO and social sharing — the traffic driver. Personal data shown is limited to display name and optional role; users control visibility (see NFR privacy).
- **FR-5.5** The user always sees their own rank even when outside the visible top N.
- **FR-5.6** Leaderboards update in near-real-time while live and freeze at close.

### 3.6 Gamification: points, badges, streaks

- **FR-6.1** Lifetime points accumulate across challenges and drive the all-time leaderboard and level tiers (e.g., Bronze/Silver/Gold/Platinum engineer tiers).
- **FR-6.2** Badges are awarded for defined achievements: first challenge, N-week participation streak, top-10 / top-3 / #1 finish, perfect score, topic mastery (win/high score across a topic series), comeback, early-bird, etc. Badge definitions are data-driven and admin-manageable.
- **FR-6.3** Streaks track consecutive weekly participations; breaking a week resets the streak. Streak length grants escalating point bonuses.
- **FR-6.4** A user profile/trophy case shows earned badges, current tier, streak, and best ranks; a subset is publicly shareable.
- **FR-6.5** Archived challenges are available as un-ranked "practice mode" so learning continues between live weeks (supports the continuous-learning goal).

### 3.7 Certificates

- **FR-7.1** Participation and achievement certificates are issued via the existing certificate engine (`certificate_issues`), reusing `cert_number`, QR code, and the `/Certificate/verify.html` verification flow.
- **FR-7.2** Certificate triggers (configurable): completing a challenge, finishing a monthly/seasonal challenge series, ranking top-3, or achieving a topic-mastery milestone.
- **FR-7.3** Certificates carry challenge/series metadata (title, week/date, score or rank where relevant) and are listed in the user's certificate area and downloadable/verifiable.

### 3.8 Analytics (learner-facing)

- **FR-8.1** Personal dashboard: challenges attempted, average/best score, points trend, rank history, streak, badges, and per-topic strength/weakness breakdown.
- **FR-8.2** Per-attempt review: question-by-question correctness, time spent, and explanations, with links to the relevant Rising Edge course/module for weak topics (learning progress + course lead-gen).
- **FR-8.3** Progress is measurable and exportable by the user (e.g., CSV), consistent with the existing checklist/report export pattern.

### 3.9 Notifications & communications

- **FR-9.1** In-app notifications (reuse `notifications` table + types): `challenge_live`, `results_ready`, `badge_earned`, `rank_changed`, `streak_reminder`, `certificate_issued`.
- **FR-9.2** Emails via nodemailer: weekly launch announcement, "closing soon" reminder, results + leaderboard digest, and an optional weekly community digest.
- **FR-9.3** Per-user notification preferences (in-app / email toggles), honoring existing newsletter opt-in and unsubscribe handling.

### 3.10 Course lead generation & monetization hooks

- **FR-10.1** Weak-topic results link to the matching premium course (mapping challenge topic → `courses.category`/`slug`).
- **FR-10.2** Contextual upsell: after results, recommend the most relevant course; optionally attach a WHDC-specific `coupons` code.
- **FR-10.3** Optional premium challenge tier (advanced problem sets, extended analytics) gated by `subscription_plans` / `plan_course_access` — reusing the existing payment stack; free weekly challenge remains for engagement.
- **FR-10.4** Lead events (high performers, repeat participants, topic interest) are captured via `/api/track` for marketing follow-up.

### 3.11 Admin

- **FR-11.1** Challenge Admin section in the existing admin panel to create/edit/schedule/publish/close challenges and manage the question bank (follows `training-admin.html` patterns).
- **FR-11.2** Badge and scoring-rule management (data-driven definitions).
- **FR-11.3** Moderation: disqualify an attempt, adjust/void a score with reason, hide a leaderboard entry — all written to `audit_logs`.
- **FR-11.4** Admin analytics: participation, completion rate, average score, difficulty calibration (per-question correct-rate), retention/streak cohorts, and traffic from the public leaderboard.
- **FR-11.5** Broadcast integration: trigger the weekly announcement through the existing broadcast/notification tooling.

---

## 4. Non-functional requirements

- **NFR-1 Security:** All write endpoints require valid JWT; answer keys never reach the client pre-submission; server-authoritative timing and scoring; rate limiting on start/submit; input validation on all payloads; admin actions audited. No secrets client-side.
- **NFR-2 Privacy & consent:** Users opt in to public leaderboard visibility and choose the identity shown (display name, optional role/org). A private/anonymous handle option is available. Comply with existing privacy posture and unsubscribe controls.
- **NFR-3 Fairness & integrity:** Randomized question/option ordering; one scored attempt; consistent server clock; detection of implausible timings; reproducible versioned scoring.
- **NFR-4 Performance & scale:** Leaderboard reads served from indexed/materialized views or cache to handle spikes at launch/close; a challenge with thousands of concurrent submissions at close must remain responsive.
- **NFR-5 Availability & resilience:** Autosave and resumable attempts; graceful handling of disconnects; idempotent submit; the weekly cron/scheduler for open/close/results must be reliable and re-runnable.
- **NFR-6 Accessibility:** WCAG-compliant, keyboard navigable, theme-aware (light/dark) — consistent with existing training modules.
- **NFR-7 Responsiveness & PWA:** Fully responsive; works within the existing service worker/offline shell where feasible (attempts require connectivity for server timing).
- **NFR-8 Consistency:** Reuse design tokens, navigation, footer, and `core.js` helpers so WHDC is visually and behaviorally native to the site.
- **NFR-9 Observability:** Event tracking (`/api/track`) and admin analytics for every key funnel step; errors logged server-side.
- **NFR-10 SEO:** The public leaderboard and challenge summary pages are server-renderable/crawlable with appropriate metadata and are added to `sitemap.xml`.

---

## 5. Data model (proposed additions to PostgreSQL)

New tables, consistent with existing conventions (TEXT UUID PKs via `gen_random_uuid()::text`, `TIMESTAMPTZ`, `NOW()` defaults, FK `ON DELETE CASCADE`). Field lists are indicative.

- **`challenges`** — `id`, `title`, `slug` (unique), `topic`/`category_id` (→ `course_categories`), `difficulty`, `description`, `cover_url`, `time_limit_min`, `total_points`, `scoring_rule_version`, `opens_at`, `closes_at`, `status` (`draft`/`scheduled`/`live`/`closed`/`archived`), `created_by` (→ `users`), timestamps.
- **`challenge_questions`** — `id`, `challenge_id` (→ `challenges`, nullable for bank-only), `type`, `prompt`, `assets` (JSONB: images/SVG/MathJax), `options` (JSONB), `answer_key` (JSONB, server-only), `points`, `negative_marking`, `partial_credit`, `topic_tag`, `difficulty_tag`, `explanation`, `position`, timestamps.
- **`challenge_attempts`** — `id`, `challenge_id`, `user_id`, `started_at`, `submitted_at`, `status` (`in_progress`/`submitted`/`auto_submitted`/`disqualified`), `raw_score`, `final_score`, `time_taken_sec`, `question_order` (JSONB), `rank` (nullable, set at close), `is_practice` (bool), timestamps. Unique index on (`challenge_id`, `user_id`) for scored attempts.
- **`attempt_answers`** — `id`, `attempt_id` (→ `challenge_attempts`), `question_id`, `response` (JSONB), `is_correct`, `points_earned`, `answered_at`.
- **`user_points`** — `user_id` (PK/unique), `lifetime_points`, `tier`, `current_streak`, `longest_streak`, `challenges_played`, `last_played_challenge_id`, `updated_at`. (Or a `points_ledger` append-only table for auditability, aggregated into this.)
- **`points_ledger`** *(recommended)* — `id`, `user_id`, `challenge_id`, `reason` (`score`/`difficulty_bonus`/`participation`/`streak`/`admin_adjust`), `points`, `created_at`.
- **`badges`** — `id`, `code` (unique), `name`, `description`, `icon_url`, `criteria` (JSONB), `active`.
- **`user_badges`** — `id`, `user_id`, `badge_id`, `challenge_id` (nullable), `awarded_at`. Unique on (`user_id`,`badge_id`) unless repeatable.
- **`leaderboard_snapshots`** *(optional, for frozen public views/perf)* — `id`, `challenge_id` or `period_key`, `payload` (JSONB ranked list), `generated_at`.
- **Certificates:** reuse `certificate_issues`; add a nullable `challenge_id` (or `series_id`) reference and a `source` = `whdc` marker rather than creating a parallel table.
- **Notifications:** reuse `notifications` with the new `type` values in FR-9.1.
- **Indexes:** on `challenges(status, opens_at, closes_at)`, `challenge_attempts(challenge_id, final_score DESC, time_taken_sec ASC)`, `challenge_attempts(user_id)`, `points_ledger(user_id)`.

---

## 6. Scoring, tiers & badge logic (reference)

**Per-challenge final score (for ranking):**

```
raw_score      = Σ points_earned per question
time_factor    = 1 + speed_weight × (time_remaining / time_limit)     // 0 ≤ speed_weight ≤ ~0.2
final_score    = raw_score × time_factor
```

Ranking sorts by `final_score` desc, then `time_taken_sec` asc, then `submitted_at` asc as final tie-break. `speed_weight` is small so knowledge dominates and speed only separates ties.

**Lifetime points awarded per completed challenge:**

```
difficulty_mult = { Beginner: 1.0, Intermediate: 1.25, Advanced: 1.5, Mixed: 1.25 }
participation_bonus = fixed (e.g., 10)
streak_bonus        = min(current_streak × step, cap)         // e.g., step 5, cap 50
points_awarded      = round(raw_score × difficulty_mult) + participation_bonus + streak_bonus
```

**Tiers (by lifetime points):** Bronze → Silver → Gold → Platinum (thresholds admin-configurable).

**Representative badges (data-driven `criteria` JSONB):** First Challenge; 4-Week / 12-Week Streak; Top 10 / Top 3 / Champion (#1); Perfect Score; Topic Master (high scores across a topic series); Early Bird (submitted in first 24 h); Comeback (improved rank vs. prior week).

All constants (weights, multipliers, thresholds) live in configuration/`system_settings`, are versioned, and changes are audited so historical results stay reproducible.

---

## 7. API surface (proposed, additive to `server.js`)

Public/auth split follows the existing pattern (`requireAuth` for user actions, admin guard for authoring).

**User-facing**

- `GET  /api/challenges/current` — the live challenge (public metadata; questions only after start).
- `GET  /api/challenges/:slug` — challenge detail / summary.
- `POST /api/challenges/:id/attempts` — start an attempt (auth; creates server-timed attempt).
- `PATCH /api/attempts/:id/answers` — autosave answers (auth, owner-only).
- `POST /api/attempts/:id/submit` — submit (auth, idempotent).
- `GET  /api/attempts/:id/result` — score + breakdown (post-submit/close).
- `GET  /api/challenges/:id/leaderboard` — per-challenge leaderboard (public frozen view after close; live view while running).
- `GET  /api/leaderboard?scope=alltime|month|role|topic` — aggregate leaderboards.
- `GET  /api/me/whdc` — personal stats: points, tier, streak, badges, rank history, topic breakdown.
- `GET  /api/me/whdc/badges` · `GET /api/me/whdc/certificates`.
- `PATCH /api/me/whdc/preferences` — leaderboard visibility + notification prefs.

**Admin**

- `POST/PATCH /api/admin/challenges` and `.../:id/publish|close|archive`.
- `POST/PATCH /api/admin/questions` (question bank).
- `POST/PATCH /api/admin/badges`, `PATCH /api/admin/scoring-rules`.
- `POST /api/admin/attempts/:id/disqualify`, `PATCH /api/admin/scores/:id` (audited).
- `GET  /api/admin/whdc/analytics`.

**Scheduling:** a reliable weekly job (cron/worker) drives `live`/`closed` transitions, leaderboard freezing, points/badge settlement, certificate issuance, and notification/email dispatch — all idempotent.

---

## 8. Frontend pages (built on existing design system)

- **WHDC landing / hub** (`/challenge/` or under Trainings): current challenge, countdown, top of this week's leaderboard, your rank/streak, and past challenges (practice).
- **Attempt runner:** timed, autosaving question player reusing the training-quiz interaction components (MCQ, multi-select, numeric, MathJax/SVG prompts), theme-aware and accessible.
- **Results page:** score, breakdown, explanations, weak-topic → course links, share card.
- **Public leaderboard page:** crawlable, shareable, top N, per-week and all-time tabs (traffic driver; added to `sitemap.xml`).
- **Profile / trophy case:** points, tier, streak, badges, rank history, certificates.
- **Admin Challenge section:** authoring, scheduling, question bank, badges, moderation, analytics.

All pages use `assets/css/tokens.css` + `themes.css` + `components.css`, the shared nav/footer via `core.js`, and `reApiFetch` for authenticated calls.

---

## 9. Success metrics

- **Engagement:** weekly active participants; attempts started vs. completed (completion rate); average questions answered.
- **Retention:** week-over-week returning participants; average streak length; 4-week and 12-week retention cohorts.
- **Community/traffic:** public leaderboard page views, shares, and referral sign-ups; new registrations attributed to WHDC.
- **Learning:** average score trend per user; per-topic improvement; certificates issued.
- **Monetization:** course click-throughs from results, WHDC-attributed course purchases, premium-tier conversions, qualified leads captured.
- **Quality:** per-question correct-rate (difficulty calibration); dispute/void rate.

Instrument every funnel step through `/api/track` and surface in admin analytics.

---

## 10. Phased roadmap

**Phase 1 — MVP (core loop).** Challenge lifecycle, auto-graded question types, timed resumable attempts, per-challenge scoring + leaderboard, one weekly challenge, results with explanations, in-app + email announcement/results, admin authoring, public weekly leaderboard page. *Reuses auth, notifications, email, design system.*

**Phase 2 — Gamification & retention.** Lifetime points, tiers, badges, streaks, trophy-case profile, all-time/segmented leaderboards, auto-issued participation certificates via the existing engine, practice mode for archived challenges.

**Phase 3 — Analytics, learning & lead-gen.** Personal analytics dashboard, per-topic strength/weakness → course links and coupons, admin analytics/difficulty calibration, notification preferences, weekly community digest.

**Phase 4 — Scale & advanced.** Question-bank auto-assembly, premium challenge tier (subscription-gated), leaderboard caching/materialized views for spikes, seasonal series + series certificates, optional team/role competitions.

---

## 11. Assumptions, dependencies & open questions

**Assumptions:** existing JWT auth, PostgreSQL, certificate engine, notifications, nodemailer, payments, and design system are production-available and reusable; users are already registered/verified before attempting.

**Dependencies:** a reliable scheduler/worker for weekly transitions; email deliverability for weekly volume; leaderboard caching strategy for launch/close spikes.

**Open questions (to confirm before build):**

1. One scored attempt per user, or best-of-N within the window?
2. Weekly cadence day/time and time-zone handling for a global audience (fixed UTC window vs. per-user local window)?
3. Free vs. premium split — is any part of WHDC gated, or is the weekly challenge always free with only advanced tiers paid?
4. Certificate policy — participation certificate for every completion, or only for milestones/series?
5. Default leaderboard identity — real name vs. handle, and default privacy (opt-in vs. opt-out) for the public page?
6. Scoring emphasis — pure knowledge, or how much speed weighting is desired?
7. Content pipeline — who authors weekly questions and what is the review/QA process and lead time?
