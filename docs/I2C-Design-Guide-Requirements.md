# I2C Hardware Design Guide (One-Page) — Requirements Specification

**Product:** Rising Edge Technologies — Quick Hardware Design Guides series, Guide #1: I2C
**Document type:** Content & Page Requirements Specification
**Version:** 1.0 (Draft)
**Status:** For review
**Owner:** Content / Engineering, Rising Edge Technologies

---

## 1. Overview

A single-page, scroll-through hardware design guide for the I2C interface, aimed at engineers who need practical, immediately applicable design answers — not a full course. It is the first of a "Quick Design Guides" series (future: SPI, UART, USB, RS-485). The page lives alongside the existing trainings, reuses the platform design system (tokens.css, core.js nav/footer), and gets the standard Like / Share / Feedback bar (`training-social.js`).

### 1.1 Goals

1. Answer the 10 most common practical I2C design questions on one page.
2. Rank for "I2C pull-up resistor calculation", "I2C multiple slaves", and similar searches (SEO traffic).
3. Funnel readers to the paid Signal Integrity and Circuit trainings via cross-links.
4. Be usable as a desk reference: printable, anchor-linked, with a design checklist at the end.

### 1.2 Audience

Hardware design engineers, PCB designers, embedded engineers, and students. Assumes basic electronics knowledge; no prior I2C experience required.

### 1.3 Scope

**In scope:** one HTML page (`Trainings/Guides/I2C/index.html` or `resources/guides/i2c.html` — final location TBD), all content topics in §2, one interactive pull-up calculator, static SVG circuit diagrams, design checklist, FAQ block with schema.org markup.

**Out of scope (v1):** video content, quizzes/certificates, downloadable PDF (v2), I3C coverage beyond a short comparison note.

---

## 2. Content requirements (topic list)

### 2.1 What is I2C

- Definition: two-wire, synchronous, half-duplex, multi-drop serial bus (SDA data, SCL clock) invented by Philips.
- Why open-drain/open-collector drivers require pull-ups; wired-AND behavior.
- Bus speed classes: Standard (100 kHz), Fast (400 kHz), Fast+ (1 MHz), High-Speed (3.4 MHz), and Ultra-Fast (unidirectional, 5 MHz) — with a note on what real designs typically use.
- Comparison table: I2C vs SPI vs UART (pins, speed, topology, complexity, when to choose which).
- Terminology note: master/slave vs the newer controller/target naming (use both, prefer controller/target in headings).

### 2.2 Protocol essentials (just enough to design hardware)

- START / STOP / repeated START conditions.
- 7-bit and 10-bit addressing; read/write bit; reserved addresses table.
- ACK / NACK mechanics.
- Clock stretching: what it is, which targets use it, why the controller must support it.
- Typical transaction diagrams: single-byte write, single-byte read, register read (write-then-repeated-START-read).

### 2.3 How to select pull-up resistors ★ (core section)

- Why value matters: too weak → slow rise times / violated t_r spec; too strong → V_OL violation and wasted power.
- **R_min formula:** R_min = (V_CC − V_OL(max)) / I_OL — worked example at 3.3 V (≈ 1 kΩ at 3 mA).
- **R_max formula:** R_max = t_r / (0.8473 × C_bus) — derivation from RC rise time between 30 % and 70 % V_CC; worked examples at 100 kHz (t_r 1000 ns) and 400 kHz (t_r 300 ns).
- Estimating bus capacitance: per-device pin capacitance (~10 pF), trace capacitance (~1 pF/cm), connector/cable contributions; the 400 pF spec limit (550 pF Fast+).
- Practical value table: recommended starting values by V_CC and speed (e.g. 4.7 kΩ @ 100 kHz/3.3 V, 2.2 kΩ @ 400 kHz, 1 kΩ @ 1 MHz).
- Power vs speed trade-off; battery-powered design considerations.
- Where to place pull-ups (once per bus, near the controller or bus center; never per device).
- Internal MCU pull-ups: why 30–50 kΩ internal pull-ups are almost never sufficient.
- **Interactive element:** pull-up calculator — inputs: V_CC, bus speed, estimated C_bus (or device count + trace length helper); outputs: R_min, R_max, recommended E24 value, estimated rise time and power draw. (See §3.3.)

### 2.4 Connecting multiple slaves to one master ★

- Standard multi-drop topology diagram: shared SDA/SCL, single pull-up pair, star vs daisy-chain routing.
- Address planning: finding addresses from datasheets, address-select pins (A0–A2), a worked address-map example.
- **Address conflicts and solutions:**
  - address-select pins / ordering different address variants;
  - I2C multiplexers/switches (TCA9548A pattern) with diagram;
  - separate buses on spare MCU ports;
  - software-defined-address devices.
- Bus loading: how each target adds capacitance; when you hit the 400 pF wall; bus buffers/repeaters (PCA9515-style) and when to use them.
- Mixed-voltage buses: connecting 1.8 V and 3.3 V/5 V devices — bidirectional MOSFET level shifter (NXP AN10441 circuit) with diagram; dedicated level-translator ICs.
- Do's and don'ts diagram: stubs, pull-up duplication, crossing SDA/SCL.

### 2.5 Connecting multiple masters (multi-master, multi-slave) ★

- When multi-master actually appears in real designs (two MCUs sharing sensors, hot-swap backplanes) — and why to avoid it when possible.
- Topology diagram: two controllers + N targets on one bus.
- **Clock synchronization:** how wired-AND SCL lets the slowest controller stretch the clock.
- **Bus arbitration:** bit-by-bit SDA arbitration, how a controller detects loss (writes 1, reads 0), lossless arbitration property, what firmware must do after losing.
- Requirements checklist for multi-master silicon/firmware support (not all MCU I2C peripherals handle it well).
- Pitfalls: repeated-START during arbitration, targets that lock up, no START-byte support.
- Safer alternatives: bus multiplexer with request lines, I2C buffer with idle detect, moving one controller to target mode, or switching the design to SPI/UART sideband.

### 2.6 Signal integrity & PCB layout guidelines

- Routing: keep SDA/SCL adjacent but not tightly coupled; length limits by speed; via count.
- Return path and ground reference; avoid crossing splits.
- Crosstalk between SCL and SDA (and from adjacent aggressors); spacing rules of thumb.
- Series resistors (22–100 Ω) for edge-rate control and ringing damping — when they help and when they violate timing.
- Running I2C over cables/connectors: max practical length, twisted pair with ground, shielding; active bus extenders (P82B715-style) for long runs.
- Cross-link: Signal Integrity Academy for transmission-line depth.

### 2.7 Robustness, protection & bring-up

- ESD/TVS protection on externally exposed buses (connector-facing SDA/SCL); selecting low-capacitance TVS. Cross-link: EMI/ESD training.
- Bus lock-up: why it happens (target stuck mid-bit), and the 9-clock-pulse + STOP recovery sequence; hardware watchdog/bus-reset ICs.
- Hot-plugging I2C devices: risks and buffer ICs with pre-charge.
- Debugging: what to look for on a scope (rise time, V_OL levels, ACK position), logic analyzers, common failure signatures (missing ACK, SDA stuck low, double clocking).
- Noise margin levels: V_IH/V_IL thresholds (30 %/70 % V_CC) and why marginal rise time shows up as intermittent errors.

### 2.8 Related standards & variants (short section)

- SMBus vs I2C: timeout, minimum speed, ALERT line, fixed logic levels — why a device labelled SMBus may misbehave on a pure I2C bus.
- PMBus (one paragraph, points to power-management context).
- I3C: one-paragraph teaser comparison (in-band interrupts, dynamic addressing, higher speed) with "guide coming later".

### 2.9 Design checklist (printable)

A ~15-item tick-list covering: pull-up value calculated for actual C_bus; single pull-up pair; address map documented with no conflicts; level shifting where rails differ; C_bus under 400 pF or buffered; ESD on external connectors; bus-recovery strategy in firmware; test points on SDA/SCL; scope-verified rise time at bring-up; clock-stretching support verified; multi-master arbitration verified (if applicable).

### 2.10 FAQ block (SEO)

6–8 questions marked up with schema.org `FAQPage` JSON-LD, e.g. "What pull-up resistor should I use for I2C?", "How many devices can share one I2C bus?", "Can I2C have two masters?", "Why does my I2C bus hang?".

---

## 3. Page & UX requirements

### 3.1 Structure

1. Single page, sticky in-page table of contents (anchor links to §2 sections); reading time badge (~15 min).
2. Hero: title, one-line value promise, last-updated date, author credit.
3. Reuses existing head/CSS pattern (tokens/themes/base/components/layouts/utilities), `global-nav` / `global-footer` via core.js, breadcrumb (Home / Trainings / Guides / I2C).
4. `training-social.js` bar (Like / Share / Feedback) under the breadcrumb — slug `Guides/I2C`.
5. Public page — no login gate (goal is SEO + funnel); cross-sell cards to SI Academy and EMI trainings at mid-page and end.

### 3.2 Diagrams

Inline SVGs using theme CSS variables (consistent with existing training pages): bus topology (1 controller/N targets), open-drain driver + pull-up equivalent circuit, transaction waveform (START/addr/ACK/data/STOP), MOSFET level shifter, multiplexer topology, multi-master arbitration waveform. Each diagram gets a caption and alt text.

### 3.3 Interactive pull-up calculator

- Inputs: V_CC (1.8/2.5/3.3/5 V), speed class (100 k/400 k/1 M), C_bus directly **or** device count + total trace length (est. helper), I_OL (default 3 mA), V_OL (default 0.4 V).
- Outputs: R_min, R_max, nearest standard E24 value inside the window, estimated rise time with chosen value, per-pull-up static power when SDA/SCL low.
- Vanilla JS, no dependencies; warns when R_min > R_max (bus too capacitive → suggest buffer/lower speed).
- Optional v2: promote into the Tools section as a standalone tool.

### 3.4 Non-functional

- SEO: unique title/meta, `FAQPage` + `TechArticle` JSON-LD, canonical URL, sitemap entry; all headings anchor-linkable.
- Performance: no external JS libraries; SVGs inline; target < 200 KB total.
- Print stylesheet: checklist and formula tables print cleanly on 2–3 pages.
- Accessibility: WCAG AA contrast via tokens, diagrams with alt text, calculator labels/aria.
- Works in all three site themes (dark/light/night).

---

## 4. Acceptance criteria

1. All §2 topics present, with the three ★ sections (pull-ups, multi-slave, multi-master) each having at least one diagram and one worked example or table.
2. Calculator returns correct R_min/R_max for the worked examples (3.3 V / 400 kHz / 200 pF → R_min ≈ 967 Ω, R_max ≈ 1.77 kΩ).
3. Like/Share/Feedback bar functional; like count appears if the guide is listed on trainings.html.
4. Page passes Lighthouse ≥ 90 (SEO, accessibility) and renders correctly in all three themes.
5. Checklist section prints on A4 without clipped content.

---

## 5. Open questions

1. Final URL: under `Trainings/Guides/I2C/` (fits training-social slug pattern) or `resources/`? (Recommendation: `Trainings/Guides/I2C/index.html`.)
2. Should the guide be listed as a free card on trainings.html, or only cross-linked from resources? (Recommendation: free card — drives the like count and discovery.)
3. Author attribution and technical review owner?
4. Do we want a gated PDF download (email capture) in v1 or v2? (Recommendation: v2.)
