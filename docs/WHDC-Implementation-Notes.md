# Weekly Hardware Design Challenge — Implementation Notes

Backend + wiring for the WHDC feature. This tracks what was added and how to run it.

## What was implemented

**Database (in `server.js` `initDB()`, mirrored in `db/whdc_schema.sql`)**
8 new tables — `challenges`, `challenge_questions`, `challenge_attempts`, `attempt_answers`,
`user_points`, `points_ledger`, `badges`, `user_badges` — plus indexes, `updated_at` triggers,
and a badge seed. Reuses the existing `certificate_issues` (adds `challenge_id` + `source`, relaxes
`course_id` to nullable) and `notifications` tables. All idempotent (`CREATE TABLE IF NOT EXISTS`).

**API (in `server.js`)** — uses the existing `verifyAccessToken` / `requireRole` middleware and the
`{ success, data }` response convention.

User-facing:

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/challenges/current` | Live challenge (public metadata; no answer keys) |
| GET | `/api/challenges/:id/leaderboard` | Per-challenge leaderboard (public) |
| GET | `/api/leaderboard` | All-time points leaderboard (public) |
| GET | `/api/challenges/:slug` | Challenge by slug (public) |
| POST | `/api/challenges/:id/attempts` | Start / resume an attempt (auth) |
| PATCH | `/api/attempts/:id/answers` | Autosave one answer (auth) |
| POST | `/api/attempts/:id/submit` | Grade + persist score, points, badges, certificate (auth) |
| GET | `/api/attempts/:id/result` | Result + explanations + provisional rank (auth) |
| GET | `/api/me/whdc` | Points, tier, streak, badges, attempts (auth) |

Admin (under `/api/admin`, requires `ADMIN`/`SUPER_ADMIN`):
`GET/POST /challenges`, `PATCH /challenges/:id`, `POST /challenges/:id/publish`,
`POST /challenges/:id/close` (freezes ranks), `POST /challenges/:id/questions`.

**Grading & scoring** (server-side, in `whdcGrade` + the submit route):
answer keys never leave the server; `final_score = raw × (1 + 0.15 × time_remaining_fraction)`
(knowledge first, speed breaks ties); lifetime points = `round(raw × difficulty_mult) +
participation(10) + streak_bonus`; tiers Bronze/Silver/Gold/Platinum at 0/1500/3000/6000;
badges + a participation certificate + a `results_ready` notification are issued on submit.

**Front-end wiring** (`Challenge/challenge-api.js` + edits to the 5 pages):
every page calls the API through `reApiFetch` when a session exists and **falls back to the
built-in demo data** on any error — so the pages still work with no backend. The
attempt → submit → results → leaderboard loop reads/writes the database end to end.

## How to run

Prereqs: the existing app already runs on Node + PostgreSQL (`DATABASE_URL` set), same as today.

1. **Create the tables.** They are created automatically on server start (`initDB()`), or apply
   the standalone file once:
   ```bash
   psql "$DATABASE_URL" -f db/whdc_schema.sql
   ```

2. **Start the server** (tables + badge seed run on boot):
   ```bash
   npm start
   ```

3. **Seed a live challenge** (Week 34 DDR4, 10 questions):
   ```bash
   DATABASE_URL=postgres://... node scripts/seed-whdc.js
   ```

4. **Try it.** Log in through the normal flow, then open `/Challenge/index.html`:
   - Hub shows the live challenge + real leaderboard.
   - Start → `attempt.html` loads the seeded questions, autosaves each answer.
   - Submit → grades server-side, stores the attempt/answers/score, awards points/badges/cert.
   - `results.html` shows your real breakdown; `leaderboard.html` and `profile.html` read from the DB.

   Not logged in / backend down → the pages render the demo mock data instead.

## Weekly scheduler (implemented)

`server.js` now runs `whdcRunLifecycle()` on boot and every 60 seconds (`startWhdcScheduler`). Each
idempotent tick:

- opens `scheduled` challenges whose `opens_at` has passed (→ `live`),
- closes `live` challenges past `closes_at` (→ `closed`), freezes per-attempt `rank`, and inserts a
  `results_ready` notification for every participant.

Transitions are guarded by `status`, so each happens once. Ops/testing can force a run with
`POST /api/admin/whdc/run-lifecycle`. To see it work, schedule a challenge with a near-future
`opens_at`/`closes_at` (admin `POST /api/admin/challenges` or `PATCH .../:id`).

## Admin authoring UI (implemented)

`Admin/challenge-admin.html` (linked from the admin dashboard sidebar) lets an admin, via the
existing admin API and `reApiFetch`:

- create a challenge (week, title, slug, topic, difficulty, time limit, points, open/close times,
  initial status),
- see all challenges with live status counts,
- **Publish live**, **Schedule** (auto-opens via the scheduler), or **Close now** (freezes ranks),
- add questions with a type-aware builder (MCQ, multiple-select, true/false, numeric with
  tolerance) that writes the server-side `answer_key`.

So content can be created entirely in the browser — the `scripts/seed-whdc.js` file is now only a
convenience for a demo dataset.

## Lifecycle emails (implemented)

The scheduler now sends email via the existing `sendMail` (Resend) helper:

- **On close** — a results email to every participant (bounded set), including their final rank,
  linking to the leaderboard. Sent by default.
- **On open** — an announcement email to newsletter subscribers, linking to the hub. **Gated**
  behind `WHDC_ANNOUNCE_EMAILS=true` to prevent accidental mass sends; off by default.

Both are best-effort (failures are caught and logged) and throttled (~120 ms between sends).
If `RESEND_API_KEY` is unset, `sendMail` no-ops with a warning, so nothing breaks in dev.

New env var: `WHDC_ANNOUNCE_EMAILS` (`true` to enable weekly announcement emails).

## Still to build (from the requirements roadmap)

- **Streak accuracy**: `current_streak` increments per submit; strict consecutive-week detection
  could move into the scheduler.
- **Leaderboard cache / materialized view** for launch/close traffic spikes.
- **Rank-history** data for the profile chart (currently illustrative).

## Validation status

`server.js` and `scripts/seed-whdc.js` were reviewed structurally (balanced blocks, correct route
placement) but **not** run through `node --check` here because the Linux sandbox was unavailable
during implementation. Before deploying, run locally:

```bash
node --check server.js
node --check scripts/seed-whdc.js
npm run lint
npm test
```
