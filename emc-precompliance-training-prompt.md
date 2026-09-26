# Build Prompt — "EMC Pre-Compliance Testing & Debugging" Training

Use the prompt below to generate a new interactive training course for the Rising Edge
Technologies platform. It is written to match the existing **Radiated Emissions (RE)**
course (`Trainings/EMI/RE/`) exactly in structure, tech stack, and interaction style.

---

## ROLE & CONTEXT

You are building a self-contained, interactive web training course for **Rising Edge
Technologies**, a hardware-engineering education platform. The site is a **no-build static
site**: plain HTML, CSS, and vanilla JavaScript — no framework, no bundler, no npm build
step. Pages share a design-token CSS system and a small set of global JS helpers.

Study the existing course at `Trainings/EMI/RE/` (hub `index.html` + eleven module pages)
and treat it as the **canonical template**. The new course must look, feel, and behave
like it. Reuse the same components, class names, and conventions.

## OBJECTIVE

Create a complete course titled **"EMC Pre-Compliance Testing & Debugging"** in a new
folder: `Trainings/EMI/PreCompliance/`.

This course is the **capstone of the EMC track**. Rising Edge already has four courses that
teach how to *run and pass* individual tests: Radiated Emissions (RE), Conducted Emissions
(CE), ESD Immunity, and Surge Immunity. This course teaches the missing skill: how to
**find and fix EMC failures at your own bench, before booking an accredited lab** —
near-field probing, spectrum-signature root-cause analysis, source-level PCB fixes,
common-mode chokes and filtering, shielding, cable/grounding fixes, and a repeatable debug
methodology. Cross-reference the RE/CE/ESD/Surge courses throughout so it ties the track
together.

## AUDIENCE & LEVEL

Practicing hardware, PCB, and EMC engineers. Assume foundational electronics knowledge
(PCB layout, high-speed digital, switching converters, frequency-domain thinking). Same
prerequisites block as the RE course. Tone: practical, lab-bench-oriented, "here's what
you actually do," backed by correct physics and real standards.

## TECH STACK & FILE-STRUCTURE CONSTRAINTS (match RE course exactly)

- **Folder:** `Trainings/EMI/PreCompliance/` containing `index.html` (course hub),
  `01-…​.html` … `10-…​.html` module pages, a local `training-compat.css` (copy from
  `Trainings/EMI/RE/training-compat.css`), and an `images/` subfolder for any raster
  assets. Inline SVG is preferred for diagrams.
- **Relative paths are 3 levels deep.** From a course file, global assets are
  `../../../assets/...` and site pages are `../../../home.html`, `../../trainings.html`.
  Get every depth right.
- **Head of every page**, in this order (copy from RE):
  - the AdSense script snippet
    `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2385317738136367" crossorigin="anonymous"></script>`
  - standard meta (charset, viewport, manifest, theme-color, apple-touch-icon,
    a unique `description`), a unique `<title>` ending in `| Rising Edge Technologies`
  - Google Fonts (Inter) preconnect + stylesheet
  - the six global stylesheets: `tokens.css`, `themes.css`, `base.css`, `components.css`,
    `layouts.css`, `utilities.css` (from `../../../assets/css/`), then local
    `training-compat.css`
  - the inline theme-bootstrap script `(function(){var t=localStorage.getItem('re-theme')||'dark';document.documentElement.dataset.theme=t;})();`
- **Styling:** use the existing CSS variables/tokens only (e.g. `var(--bg-card)`,
  `var(--text-base)`, `var(--text-sub)`, `var(--border)`, `var(--cyan)`, `var(--radius-xl)`,
  `var(--sp-4)`). Do **not** invent a color palette or hardcode hex except where the RE
  course already does (e.g. `#22d3ee`, `#fb923c` accents). Support light/dark themes via
  the tokens. No external CSS frameworks.
- **Body scaffolding (every page):** `<div id="global-nav"></div>` at top;
  `<div id="global-footer"></div>` and `<div id="global-bottom-nav"></div>` at the bottom.
  Load, in order: `../../../assets/js/core.js`, `../../../assets/js/training-progress.js`,
  `../../../assets/js/training-social.js` (hub + modules), then a `<script>requireAuth();</script>`
  block, then the service-worker registration block. `core.js` injects nav/footer;
  `training-progress.js` drives the progress bars and the resume banner;
  `training-social.js` drives like/share. Do not reimplement these.
- **No browser storage beyond what the existing helpers already use.** Interactivity is
  in-page state only.
- **Charts:** if you need plotting, load Plotly from the same CDN the RE course uses
  (`https://cdn.plot.ly/plotly-2.32.0.min.js`). Otherwise prefer inline SVG.

## COURSE HUB (`index.html`) — mirror RE's hub

- `content-layout` with a left `content-sidebar` listing every module (`.module-item`
  links) under a "Course" label, and a `content-main`.
- Breadcrumb: Home / Trainings / EMC Pre-Compliance Testing & Debugging.
- `#course-resume-banner` div (populated by training-progress.js).
- `.si-hero` with badges (`EMI/EMC Academy`, `10 Modules`, `Interactive`), an H1 with a
  `.text-gradient` subtitle, a descriptive paragraph, four `.course-stat` tiles
  (Core Modules, Learning Time ~5h+, Standards Covered, Case Studies), and a
  "Start Learning" primary button to `01-…html`.
- A "Core Modules" section with a `.module-grid` of `.module-card`s (number, title, 1–2
  line summary, `Lesson`/`Case Study` + duration badges). Mark the capstone with
  `.module-num.capstone`.
- A "Prerequisites" card matching RE's.

## MODULE PAGE TEMPLATE — mirror RE's module pages

Each module page must include:
- Left `content-sidebar` with the full module list, the current one marked `active`.
- A hero with topic badges and a **lesson-progress bar**
  (`.lesson-progress` → `.progress-bar` → `.progress-fill`, with a `%` label) wired to
  `training-progress.js`.
- Body split into several **`.section-collapsible`** blocks, each opened/closed by a
  **`.section-header-btn`** (chevron), first one `active`/open.
- At least one **inline quiz** per module using the RE pattern:
  `.quiz-container` → `.quiz-slide`/`.quiz-question` → `.quiz-options` with
  `.quiz-option[data-correct]` buttons and a `.quiz-feedback` region (multi-question
  quizzes use `data-q`/`data-idx`; reveal the explanation on answer).
- Where useful, **`.toggle-tabs`** (e.g. Common-mode vs Differential-mode), interactive
  step-throughs (`data-step`/`data-target`), and **calculators** or **diagrams** (inline
  SVG or Plotly). Every module should have at least one diagram/visual and one interactive.
- Bottom prev/next navigation and `#global-bottom-nav`.
- Register progress with `training-progress.js` the same way RE modules do.

## MODULE OUTLINE (10 modules + capstone) — content to generate

Write substantial, technically correct content for each (aim for the depth of RE's
modules). For each module include: learning objectives, explanatory prose, a diagram/visual,
a worked example or bench walkthrough, a "common mistakes" callout, the required quiz, and
"how this connects to the RE/CE/ESD/Surge course" cross-links.

1. **Why Pre-Compliance — The Business & Engineering Case.** Cost/time of a failed
   accredited-lab visit; pre-compliance vs full compliance; where debugging fits in the
   design cycle (design-in vs find-late); realistic accuracy expectations and correlation
   to labs. *Quiz.*
2. **Building an Affordable Pre-Compliance Bench.** Spectrum analyzer vs EMI receiver;
   near-field probe sets (H-field loops, E-field stubs); LISN for conducted; current
   probes; TEM/GTEM cell; simple antennas; ambient/noise-floor management; safety.
   Correlation limits vs a 3 m/10 m chamber. *Interactive equipment comparison.*
3. **Measurement Technique & the Diagnostic Toolkit.** Near-field probing method
   (H vs E, scanning for hotspots, relative not absolute readings); current probes on
   cables; delta/comparative measurements (before/after a fix); capturing and annotating a
   spectrum; detectors recap (Peak/QP/Avg). *Interactive probe-selection tool.*
4. **Reading the Spectrum — Signatures & Root-Cause Analysis.** Narrowband vs broadband;
   clock harmonic combs and how spacing reveals the source; SMPS switching signatures and
   sidebands; cable/enclosure resonances; mapping a peak in the plot back to a physical
   source. *Plotly spectrum with toggleable overlays.*
5. **Fixing at the Source — PCB & IC Level.** Edge-rate/slew control, series termination,
   clock/spread-spectrum, decoupling and PDN, return-path integrity, split-plane and
   stitching fixes, connector-area layout. *Before/after emission diagram + quiz.*
6. **Common-Mode Chokes & Filtering.** Common-mode vs differential-mode noise; selecting
   and placing CM chokes; line filters (π, T, L); feedthrough/Y-caps and safety; ferrite
   beads (correct use, saturation, placement pitfalls); measuring a filter's real
   insertion loss. *CM-choke impedance-vs-frequency chart; CM/DM toggle-tabs; filter-corner
   calculator.*
7. **Shielding & Enclosure Techniques.** Shielding effectiveness (absorption/reflection);
   apertures, slots and the "longest-slot" rule; gaskets and contact; conductive coatings;
   shield grounding. *Shielding-effectiveness calculator (aperture size vs frequency).*
8. **Cables, Connectors & Grounding — the Dominant Radiators.** Why cables usually
   dominate RE; cable routing and length resonances; 360° shield terminations vs pigtails;
   chassis bonding; single-point vs multi-point ground strategy; I/O filtering at the
   connector. *Interactive cable-radiation demo.*
9. **Immunity Pre-Compliance & Debug (ESD / EFT / Surge / RI).** Quick, safe bench checks
   that approximate ESD, EFT/burst, surge, and radiated immunity; reproducing field
   failures; hardening (TVS/varistor selection, filtering, watchdog/firmware recovery);
   pass/fail performance-criteria recap. Cross-link ESD and Surge courses. *Quiz +
   decision aid.*
10. **Structured Debug Methodology + Case Studies (Capstone).** A repeatable flow —
    measure → localize (near-field) → hypothesize → apply one change → re-measure the delta
    → confirm compliance margin; a debug decision tree; a printable checklist; and 3–4
    fully worked case studies (e.g. FPGA clock harmonic over limit, SMPS broadband hash,
    cable-dominated radiation, ESD-induced reset) each with a failure plot, the debug steps,
    the fix, and the resulting margin. Ties the whole EMC track together. *Interactive
    decision tree + case-study picker (like RE module 11).*

Optionally add an **11th "Additional Case Studies" library** page mirroring RE's module 11
(dropdown-selectable real-world failures) if scope allows.

## CONTENT ACCURACY & STANDARDS

- Reference real standards correctly where relevant: **CISPR 11/14/22/32, FCC Part 15,
  IEC 61000-4-2 (ESD), -4-4 (EFT/burst), -4-5 (surge), -4-3/-4-6 (radiated/conducted
  immunity), CISPR 16** (measurement methods), and MIL-STD-461 / DO-160 for aerospace/mil.
- Physics must be correct (near-field vs far-field, CM vs DM, dB math, SE fundamentals).
  No hand-waving or invented numbers; use representative, plausible values and label them
  as illustrative.
- Keep it vendor-neutral. Describe tool *categories*, not specific brands, except common
  generic component types.

## DELIVERABLES & ACCEPTANCE CRITERIA

- `Trainings/EMI/PreCompliance/index.html` + `01…10.html` (+ optional `11`), local
  `training-compat.css`, `images/` as needed.
- Add the course to the trainings listing so it appears alongside RE/CE/ESD/Surge
  (follow how those are registered — DB `courses` row and/or `Trainings/trainings.html`
  card, matching category **"EMC & Compliance"**).
- Every page: valid HTML, correct 3-level relative paths, theme-aware via tokens, renders
  in light and dark, passes the site's asset-integrity/site-health audit, and works with
  `requireAuth()` + `training-progress.js` progress tracking.
- Each module is genuinely interactive (collapsibles + at least one quiz + at least one
  diagram/calculator) and technically accurate.
- No console errors; no external dependencies beyond the fonts, AdSense, and the Plotly CDN
  already used by the RE course.

## STYLE REMINDERS

- Match RE's class names and DOM shape so global JS and CSS "just work."
- Prefer inline SVG for schematics/plots; keep them theme-aware (use `currentColor` or
  tokens where possible).
- Reuse copy patterns (badges, `.course-stat`, prerequisites card) rather than inventing
  new layout primitives.
