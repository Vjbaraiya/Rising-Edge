# Hardware Jobs Board — Requirements Specification

**Product:** Rising Edge Technologies — Hardware Jobs Board
**Document type:** Product & Technical Requirements Specification
**Version:** 1.0 (Draft)
**Status:** For review
**Owner:** Product / Engineering, Rising Edge Technologies

---

## 1. Overview

The Hardware Jobs Board is a job-listing module for the Rising Edge platform, focused exclusively on hardware-electronics roles: Hardware Design, PCB Design/Layout, Signal Integrity (SI), Power Integrity (PI), and EMC/EMI engineering. Recruiters (the platform's `RECRUITER` role) and admins post jobs; the listing page is public for SEO and traffic; applying requires a logged-in account. Each job is configured for either in-platform application (profile + resume) or external redirect (company career page / email).

Like WHDC, this is not a standalone product. It reuses the existing Node.js + Express backend, PostgreSQL, JWT auth (`requireAuth`, `requireRole`), the `notifications` system, the nodemailer email pipeline, the admin panel patterns, and the vanilla-JS PWA frontend with the shared design-token CSS and `core.js` helpers.

### 1.1 Goals

1. Attract hardware engineers to the platform through a niche, high-signal job board (SEO traffic driver).
2. Give the new `RECRUITER` role a concrete purpose and a reason for companies to join.
3. Connect trained platform users (course completions, WHDC ranks, certificates) with employers.
4. Create a monetization path (featured listings, paid recruiter plans) in later phases.
5. Increase user registrations via the "login to apply" gate.

### 1.2 Primary users

- **Candidates:** Hardware Design Engineers · PCB Designers/Layout Engineers · SI Engineers · PI Engineers · EMC/EMI Engineers · students and fresh graduates targeting these roles.
- **Recruiters:** in-house talent teams and staffing agencies (role `RECRUITER`).
- **Admins:** moderate and curate listings (`ADMIN`, `SUPER_ADMIN`).

### 1.3 Scope

**In scope (v1):** public job listing page with search/filter/sort; job detail page; recruiter job posting with admin approval; per-job apply mode (in-platform or external); in-platform applications with resume upload; recruiter dashboard (my jobs + applicants); candidate "My Applications" and saved jobs; expiry and status lifecycle; notifications and emails; admin moderation panel; basic analytics.

**Out of scope (v1):** paid/featured listings and recruiter billing; job alerts by email digest; candidate search/database for recruiters; resume parsing; interview scheduling; third-party job aggregation/scraping; company profile pages.

---

## 2. Current platform context (baseline to reuse)

| Layer | Existing capability | How the Jobs Board reuses it |
|---|---|---|
| Auth | JWT + HttpOnly cookies, `requireAuth`, `requireRole`, roles `USER`/`RECRUITER`/`ADMIN`/`SUPER_ADMIN` | Gate posting with `requireRole('RECRUITER','ADMIN','SUPER_ADMIN')`; gate applying with `requireAuth` |
| Users | `users` table (full_name, email, `current_role`, org, job_title, location, linkedin_url, avatar_url) | Pre-fill application forms; recruiter identity on postings |
| Notifications | `notifications` table + in-app bell | Application received / status change / job approved-rejected alerts |
| Email | nodemailer pipeline | Application confirmations, recruiter notifications, moderation results |
| Admin | `Admin/*.html` panel patterns | New `Admin/jobs-admin.html` for moderation following `users.html` patterns |
| Frontend | Vanilla JS PWA, tokens.css/themes.css/components.css, `core.js` (`reApiFetch`, nav/footer) | Build `/Jobs/` pages with the same design system |
| Tracking | `/api/track` | Funnel events: view → detail → apply-click → submitted |

**New dependency:** resume file upload. `server.js` has no upload middleware today — v1 adds `multer` with disk or S3-compatible storage, PDF/DOC/DOCX only, 5 MB limit, virus-scan hook optional.

**Design principle:** new tables and route groups only; do not fork auth, theming, navigation, or email.

---

## 3. Functional requirements

### 3.1 Roles & permissions

| Action | Public | USER | RECRUITER | ADMIN / SUPER_ADMIN |
|---|---|---|---|---|
| View listings & job detail | ✔ | ✔ | ✔ | ✔ |
| Apply / save a job | — | ✔ | ✔ | ✔ |
| Post / edit / close own jobs | — | — | ✔ (approval required) | ✔ (auto-approved) |
| View applicants | — | — | own jobs only | all jobs |
| Approve / reject / remove any job | — | — | — | ✔ |

### 3.2 Job posting (recruiter)

1. Form fields — required: title; company name; discipline (one or more of: Hardware Design, PCB Design, Signal Integrity, Power Integrity, EMC/EMI, Other-Hardware); employment type (Full-time, Contract, Internship); experience level (Fresher 0–1, Junior 1–3, Mid 3–7, Senior 7–12, Principal 12+); location (city/country) or Remote/Hybrid flag; job description (rich text/markdown, max 10,000 chars); apply mode (`IN_PLATFORM` or `EXTERNAL`); if external: apply URL or email (validated). Optional: salary range + currency + "hide salary" flag; key skills tags (e.g., Altium, Allegro, HFSS, SIwave, ADS, LTspice, ISO 7637, CISPR 25); company logo URL; application deadline.
2. On submit, job enters `PENDING_REVIEW`. Recruiter can edit while pending; editing an approved job returns it to `PENDING_REVIEW` (except closing it).
3. Recruiters can close (`CLOSED`) or repost their own jobs at any time.

### 3.3 Moderation (admin)

1. Admin queue lists `PENDING_REVIEW` jobs with diff-view for edited reposts.
2. Approve → `ACTIVE` (goes live, recruiter notified). Reject → `REJECTED` with required reason (recruiter notified, can edit and resubmit).
3. Admin can force-close or delete any job; deletions are soft (`DELETED`) and audit-logged via existing `audit_logs`.

### 3.4 Job lifecycle

`DRAFT → PENDING_REVIEW → ACTIVE → CLOSED / EXPIRED / REJECTED / DELETED`

- Auto-expiry: `ACTIVE` jobs expire on their deadline, or 60 days after approval if no deadline (daily cron/interval check).
- Expired/closed jobs stay reachable by direct URL with a prominent "no longer accepting applications" state (SEO-friendly, apply disabled).

### 3.5 Listing page (public)

1. URL `/Jobs/` — server-rendered or pre-rendered enough for SEO: title, meta description, `JobPosting` schema.org JSON-LD per listing.
2. Card shows: title, company, discipline badges, location/remote, experience level, employment type, salary (if shown), posted-X-days-ago, Featured flag (schema reserved for v2).
3. **Filters** (combinable, reflected in URL query params for shareability): discipline; experience level; employment type; location text + Remote-only toggle; skills tags; posted-within (24 h / 7 d / 30 d).
4. **Search:** keyword search across title, company, description, tags (Postgres `ILIKE`/`tsvector`).
5. **Sort:** newest (default), deadline soonest, relevance (when keyword present).
6. Pagination: 20 per page (server-side `limit/offset`), total count shown.
7. Empty state with suggestion to clear filters; loading skeletons per existing component patterns.
8. Logged-in users see save (bookmark) and "Applied" badges on cards.

### 3.6 Job detail page

1. URL `/Jobs/job.html?id=…` (or slugged path if routing allows) with full description, all metadata, recruiter/company block, share buttons, and `JobPosting` JSON-LD.
2. **Apply CTA logic:**
   - Not logged in → "Login to apply" → redirect to login with `returnTo` back to the job.
   - `IN_PLATFORM` job → application modal: pre-filled name/email/phone/LinkedIn from profile; resume upload (required, PDF/DOC/DOCX ≤ 5 MB) or reuse last-uploaded resume; optional cover note (≤ 2,000 chars).
   - `EXTERNAL` job → button opens apply URL in a new tab (or mailto:), and the click is recorded as an `EXTERNAL_CLICK` application event.
   - One in-platform application per user per job; re-apply blocked with "Already applied" state.
3. "Similar jobs" strip: same discipline, ACTIVE, excluding current (up to 4).

### 3.7 Candidate features

1. **My Applications** (`/User/my-applications.html`): list with job, date, status (`SUBMITTED → VIEWED → SHORTLISTED → REJECTED / HIRED`), external clicks listed separately as "Applied externally".
2. **Saved jobs:** toggle bookmark; saved list on the same page; saved jobs that expire are flagged.
3. Notifications (in-app + email): application submitted (confirmation), status changed by recruiter.

### 3.8 Recruiter dashboard

1. `/Recruiter/index.html` — gated by `requireRole('RECRUITER','ADMIN','SUPER_ADMIN')`.
2. My Jobs table: status, views, application count, actions (edit, close, view applicants).
3. Applicants view per job: candidate name, headline (`current_role` @ `org`), location, resume download, cover note, applied date; status dropdown (`VIEWED/SHORTLISTED/REJECTED/HIRED`) — changes notify the candidate; CSV export.
4. Recruiter sees aggregate stats: total views, applications, conversion per job.

### 3.9 Notifications & email summary

| Event | In-app | Email | Recipient |
|---|---|---|---|
| Job approved / rejected | ✔ | ✔ | Recruiter |
| New application received | ✔ | ✔ (batched max 1/hour/job) | Recruiter |
| Application status changed | ✔ | ✔ | Candidate |
| Job expiring in 3 days | ✔ | — | Recruiter |

### 3.10 Tracking events

`job_list_view`, `job_filter_used`, `job_detail_view`, `job_apply_click`, `job_apply_submitted`, `job_external_click`, `job_saved`, `job_posted` — via existing `/api/track`.

---

## 4. Non-functional requirements

1. **SEO:** unique title/meta per job; `JobPosting` JSON-LD (Google Jobs eligibility); sitemap entries for ACTIVE jobs; canonical URLs; expired jobs return 200 with `validThrough` past (per Google guidance) then 404/410 after 60 days.
2. **Performance:** listing API p95 < 300 ms at 10k jobs; indexed filter columns; images lazy-loaded.
3. **Security:** description sanitized server-side (allowlist HTML from markdown); resume uploads validated by MIME + extension + size, stored outside web root, served via authenticated download endpoint only to the job's recruiter and admins; rate-limit posting (10/day/recruiter) and applying (20/day/user); external apply URLs validated http(s) and shown with the target domain.
4. **Privacy:** resumes and applications visible only to owning recruiter + admins; candidate can withdraw an application (soft-delete); resumes deleted on user account deletion.
5. **Accessibility & responsive:** existing PWA standards; filters usable on mobile (drawer pattern); WCAG AA contrast via design tokens.

---

## 5. Data model (proposed PostgreSQL additions)

```sql
CREATE TABLE jobs (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  posted_by        TEXT NOT NULL REFERENCES users(id),
  title            TEXT NOT NULL,
  company_name     TEXT NOT NULL,
  company_logo_url TEXT,
  disciplines      TEXT[] NOT NULL,          -- HARDWARE_DESIGN | PCB_DESIGN | SI | PI | EMC | OTHER
  employment_type  TEXT NOT NULL CHECK (employment_type IN ('FULL_TIME','CONTRACT','INTERNSHIP')),
  experience_level TEXT NOT NULL CHECK (experience_level IN ('FRESHER','JUNIOR','MID','SENIOR','PRINCIPAL')),
  location         TEXT,
  work_mode        TEXT NOT NULL DEFAULT 'ONSITE' CHECK (work_mode IN ('ONSITE','REMOTE','HYBRID')),
  description_md   TEXT NOT NULL,
  skills           TEXT[] DEFAULT '{}',
  salary_min       INTEGER, salary_max INTEGER, salary_currency TEXT, salary_hidden BOOLEAN DEFAULT FALSE,
  apply_mode       TEXT NOT NULL CHECK (apply_mode IN ('IN_PLATFORM','EXTERNAL')),
  apply_url        TEXT,                     -- required when EXTERNAL
  deadline         DATE,
  status           TEXT NOT NULL DEFAULT 'PENDING_REVIEW'
                     CHECK (status IN ('DRAFT','PENDING_REVIEW','ACTIVE','REJECTED','CLOSED','EXPIRED','DELETED')),
  reject_reason    TEXT,
  views_count      INTEGER NOT NULL DEFAULT 0,
  approved_at      TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_jobs_status_created ON jobs(status, created_at DESC);
CREATE INDEX idx_jobs_disciplines ON jobs USING GIN (disciplines);
CREATE INDEX idx_jobs_skills ON jobs USING GIN (skills);

CREATE TABLE job_applications (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_id       TEXT NOT NULL REFERENCES jobs(id),
  user_id      TEXT NOT NULL REFERENCES users(id),
  kind         TEXT NOT NULL DEFAULT 'IN_PLATFORM' CHECK (kind IN ('IN_PLATFORM','EXTERNAL_CLICK')),
  resume_path  TEXT,
  cover_note   TEXT,
  status       TEXT NOT NULL DEFAULT 'SUBMITTED'
                 CHECK (status IN ('SUBMITTED','VIEWED','SHORTLISTED','REJECTED','HIRED','WITHDRAWN')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, user_id, kind)
);

CREATE TABLE saved_jobs (
  user_id    TEXT NOT NULL REFERENCES users(id),
  job_id     TEXT NOT NULL REFERENCES jobs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, job_id)
);
```

---

## 6. API surface (proposed, additive to `server.js`)

**Public**

- `GET /api/jobs` — list ACTIVE jobs; query params: `q, discipline, experience, type, work_mode, location, skills, posted_within, sort, page`
- `GET /api/jobs/:id` — job detail (also returns CLOSED/EXPIRED with flag); increments `views_count`

**Authenticated (candidate)**

- `POST /api/jobs/:id/apply` — multipart (resume) or `reuse_resume=true`; IN_PLATFORM jobs only
- `POST /api/jobs/:id/external-click` — record EXTERNAL_CLICK
- `POST /api/jobs/:id/save` · `DELETE /api/jobs/:id/save`
- `GET /api/me/applications` · `DELETE /api/me/applications/:id` (withdraw)
- `GET /api/me/saved-jobs`

**Recruiter (`requireRole('RECRUITER','ADMIN','SUPER_ADMIN')`)**

- `POST /api/recruiter/jobs` · `PATCH /api/recruiter/jobs/:id` · `POST /api/recruiter/jobs/:id/close`
- `GET /api/recruiter/jobs` (own) · `GET /api/recruiter/jobs/:id/applications`
- `PATCH /api/recruiter/applications/:id/status`
- `GET /api/recruiter/applications/:id/resume` — authenticated file download

**Admin (`admin` router, existing guard)**

- `GET /api/admin/jobs?status=PENDING_REVIEW` · `POST /api/admin/jobs/:id/approve` · `POST /api/admin/jobs/:id/reject` · `DELETE /api/admin/jobs/:id`

---

## 7. Frontend pages

| Page | Path | Notes |
|---|---|---|
| Jobs listing | `Jobs/index.html` | Public; filters in URL; JSON-LD; shared nav/footer via `core.js` |
| Job detail | `Jobs/job.html` | Public; apply modal; similar jobs |
| My applications + saved | `User/my-applications.html` | Follows `User/my-learning.html` patterns |
| Recruiter dashboard | `Recruiter/index.html` | My jobs, post/edit form, applicants view |
| Admin moderation | `Admin/jobs-admin.html` | Follows `Admin/users.html` patterns; queue + audit |

---

## 8. Success metrics

Monthly: ACTIVE job count; listing-page sessions (organic share); detail-view → apply conversion ≥ 8 %; applications per job (median ≥ 5); new registrations attributed to "login to apply"; recruiter retention (posts a 2nd job within 60 days).

---

## 9. Phased roadmap

- **Phase 1 (MVP):** listing + detail + filters/search, recruiter posting with admin approval, both apply modes, resume upload, My Applications, basic recruiter dashboard, notifications, JSON-LD.
- **Phase 2:** saved jobs UI polish, expiry cron + reminders, applicant CSV export, admin analytics tile, sitemap automation.
- **Phase 3 (monetization):** featured/pinned listings, recruiter plans & billing (reuse Cashfree/Razorpay), email job alerts, candidate profile visibility opt-in ("open to work" + WHDC rank/certificates surfaced to recruiters).

---

## 10. Open questions

1. Recruiter onboarding: self-signup with role request + admin grant, or admin-invited only? (v1 assumption: user registers normally, requests recruiter access, admin flips role in `Admin/users.html`.)
2. Resume storage: local disk vs S3-compatible bucket? (v1 assumption: local disk under `storage/resumes/`, abstracted for later move.)
3. Should INSTRUCTOR (unused role) ever post jobs? (Assumed no.)
4. Salary display policy — required, optional, or encouraged with a "salary transparent" badge?
5. Slugged SEO URLs (`/jobs/si-engineer-bangalore-xyz`) need server-side routing — acceptable in v1 or query-param URLs only?
