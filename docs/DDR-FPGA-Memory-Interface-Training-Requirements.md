# Requirements Document: DDR Memory Interface Design with FPGA — Training Module

## 1. Purpose

Create a training module that teaches hardware engineers how to **design**
a DDR memory interface between an FPGA and DRAM device(s) end to end — from
choosing the memory technology and reading datasheets, through topology,
signal grouping, signal integrity, termination, decoupling, and PCB
routing, to bring-up on real hardware.

This is a **design** module, not a verification one. The site already has
`Trainings/SI/capstone-ddr4.html`, a capstone that assumes a DDR4 interface
already exists on a board and walks through *post-layout SI
verification/sign-off* (eye diagrams, simulation, optimization). This new
module is the missing piece that comes **before** that capstone: how the
interface gets designed in the first place. The two should cross-reference
each other (this module ends where the capstone begins).

## 2. Audience & Prerequisites

- Hardware/PCB design engineers who have selected an FPGA for a project and
  need to add DDR3/DDR4/DDR5/LPDDR4/LPDDR5 memory to it for the first time.
- Assumes: basic digital hardware design experience, and ideally (not
  strictly required) completion of the Signal Integrity Academy's
  fundamentals module (`Trainings/SI/01-fundamentals.html` through
  `03-impedance-matching.html`) — reference/link to those rather than
  re-teach transmission-line basics from scratch.
- Does **not** assume prior memory-interface experience — datasheet
  literacy is taught from the ground up (Section 4, Module 2).

## 3. Format & Site Conventions

Follow the same interactive-lesson pattern already established across
`Trainings/EMI/RE/`, `Trainings/EMI/CE/`, and `Trainings/EMI/ESD/`:

- One numbered HTML lesson per topic (`01-...html`, `02-...html`, …) sharing
  the site's standard shell (`global-nav`, sidebar module list,
  `content-header`/breadcrumb, `section-collapsible` pattern).
- A per-lesson quiz (`.quiz-container` stepper pattern, one question at a
  time, ~80% pass threshold), 8–14 questions depending on lesson depth.
- Diagrams/animations for: fly-by topology, byte-lane grouping, VTT
  termination schematic, PDN decoupling stack-up, BGA breakout/escape
  routing, and length-matching examples (reuse the Plotly/canvas patterns
  already used in the EMI RE lessons where applicable — e.g., a
  length-matching visualizer, an eye-diagram-vs-skew interactive chart).
- Real datasheet excerpts/screenshots referenced with attribution (e.g., a
  Micron or SK Hynix DDR4 datasheet page, a Xilinx UltraScale+ or Intel/
  Altera EMIF memory interface guide page) — mirrors the existing
  Wikimedia-sourced real-image convention used in the EMI RE lessons.
- New course location: `Trainings/FPGA/DDR-Memory-Interface/` (parallel to
  the existing `Trainings/FPGA/Fundamentals-and-architecture/` course),
  with its own `index.html` course landing page, added to the sidebar of
  the existing FPGA course and to the `trainings.html` catalogue.

## 4. Module / Lesson Breakdown

### Module 1 — Introduction & the DDR Landscape

- Why memory-interface design is one of the hardest parts of FPGA board
  design (tight timing budgets, dense BGA routing, SI-sensitive).
- DDR generation overview and where each fits: DDR3, DDR4, DDR5, LPDDR4,
  LPDDR5 — data rate ranges, voltage, typical use case (cost-sensitive vs.
  high-bandwidth vs. low-power/mobile).
- FPGA-specific angle: hard memory controller IP (e.g., hardened PHY/
  controller blocks) vs. soft controller (fabric-based) — what that means
  for achievable speed, resource usage, and design effort.
- How this module relates to the existing DDR4 SI capstone (positioning
  diagram: Select → Design → **[this module]** → Layout → **[SI
  capstone: verify]** → Bring-up).

### Module 2 — Component Selection & Reading Datasheets

- Decision matrix: DDR3 vs. DDR4 vs. DDR5 vs. LPDDR4/5 (speed, voltage,
  power, cost, density, availability/EOL risk).
- FPGA memory controller/IP compatibility check: which memory standards
  and speed grades the target FPGA family actually supports; hard vs. soft
  controller trade-off revisited with a concrete resource/speed table.
- **How to read a DRAM datasheet**, section by section:
  - Part number decoding (organization x8/x16/x32, density, speed grade/
    CL, package)
  - Timing parameter table (see Module 3 for the parameters themselves)
  - Voltage/current specs (VDD, VDDQ, VPP for DDR4, IDD current tables)
  - Package/pinout diagram and ball map
  - AC/DC electrical characteristics table (I/O standard, VIH/VIL, VREF)
- **How to read an FPGA memory-interface datasheet/user guide**:
  - Supported standards and max rate per I/O bank
  - On-chip termination / DCI / OCT options and where they apply
  - Calibration requirements (read/write leveling) and what the tool
    (e.g., MIG, EMIF) needs from you
  - Pin-swap rules (which pins are freely swappable vs. fixed — sets up
    Module 9)
- Deliverable: a **component-selection checklist** artifact (interactive
  checklist widget) the learner can reuse per project.

### Module 3 — Key Electrical & Timing Parameters

- JEDEC parameter glossary with plain-language explanations: tCK, CL,
  tRCD, tRP, tRAS, tRC, tRFC, tFAW, tWTR, tRRD, tCCD, ODT settings, drive
  strength (RON), slew rate.
- I/O standards used at each generation: SSTL-15/SSTL-135 (DDR3/DDR4),
  POD (DDR4/DDR5), and what changes for LPDDR.
- VREF: what it is, why it must track supply/termination voltage, and why
  it's noise-sensitive (sets up Module 7's termination and Module 8's
  decoupling content).
- Read/write leveling concept (just enough to motivate why fly-by
  topology and length-matching rules exist in Modules 4 and 9 — full
  timing-closure math is out of scope, that's the SI capstone's job).

### Module 4 — Memory Topologies

- Single-rank vs. dual-rank; discrete (soldered-down) devices vs. DIMM/
  SODIMM sockets.
- Fly-by vs. T-branch/star topology for Command/Address/Clock (CA/CK) —
  why DDR3/4/5 mandate fly-by (write/read leveling requirement) while
  earlier/lower-speed designs could use T-branch.
- Point-to-point (P2P) topology for LPDDR4/5 (why it simplifies
  termination and topology choice vs. standard DDR).
- Devices-per-byte-lane and fan-out limits vs. trace-length/loading
  trade-offs.
- Diagram: side-by-side fly-by vs. T-branch vs. P2P topology sketches.

### Module 5 — Signal Groups & Their Roles

- Clock (CK/CK#, differential), Command/Address (CS, RAS/CAS/WE or ACT_n
  depending on generation, address, bank/bank-group), Control (CKE, ODT,
  RESET_n), Data (DQ), Data Strobe (DQS/DQS#, differential), Data Mask/
  DBI (DM/DBI), VREF, ZQ calibration resistor.
- Byte-lane grouping concept: each DQS pairs with its own DQ[7:0] + DM/
  DBI — why these must be treated as one routing/matching group
  (Module 9).
- Differential (CK, DQS) vs. single-ended (most CA, DQ) signal handling
  differences.

### Module 6 — Signal Integrity for DDR Interfaces

- Target characteristic impedance per signal class: ~40–50 Ω single-
  ended, ~80–100 Ω differential (typical; verify against the specific
  DRAM/FPGA datasheet).
- Reflections/ISI at DDR data rates; why they matter more as speed grade
  increases (DDR3-1600 vs. DDR4-3200 vs. DDR5).
- Crosstalk between adjacent address/data lines — spacing guidelines
  (e.g., 3W rule) and reference-plane dependence.
- Simultaneous Switching Output/Noise (SSO/SSN) — many DQ lines toggling
  together, ground bounce, and why decoupling/PDN design (Module 8)
  matters here.
- Eye diagram / timing margin as the metric that ties design decisions in
  this module back to verification — explicit pointer to
  `Trainings/SI/09-eye-diagram.html` and the DDR4 SI capstone.

### Module 7 — Termination Strategies

- On-Die Termination (ODT) for DQ/DQS — dynamically enabled by the
  controller; what "ODT value" settings mean.
- Discrete termination for CA/CK: VTT termination (legacy DDR3-style)
  vs. reduced/eliminated external termination on DDR4/DDR5 due to more
  capable on-die termination.
- VTT rail generation: regulator selection, single VTT plane vs.
  distributed VTT, and why VTT tracks VDDQ/2.
- Why LPDDR4/5 needs little to no external termination (short P2P
  traces).
- Schematic: connector/device → termination network → controller, per
  topology from Module 4.

### Module 8 — Decoupling & Power Delivery Network (PDN)

- Rails to decouple: VDD, VDDQ, VPP (DDR4), VREF — value/count/placement
  guidance per pin (typical bulk + high-frequency ceramic mix).
- PDN target-impedance concept in plain terms (what "flat impedance
  across frequency" buys you, without requiring the reader to already
  know PDN theory).
- VREF-specific guidance: dedicated low-noise generation, tight
  decoupling, isolation from switching rails — ties back to Module 6's
  SSO discussion.
- ZQ calibration resistor: what it's for, typical value, placement
  constraint (close to the device, dedicated to that function).

### Module 9 — Layout & Routing Guidelines

- Length-matching rules at two tiers: tight intra-byte-lane DQ/DQS
  matching (e.g., within a few mils) vs. looser CA/CK matching — with the
  reasoning (leveling compensates CA/CK skew; DQ/DQS skew directly eats
  into the read/write data eye).
- Fly-by daisy-chain routing mechanics: matching each branch relative to
  first-load/last-load, not just to a single fixed target.
- Layer assignment and reference planes: which layers typically carry
  CA/CK vs. DQ, microstrip vs. stripline trade-offs, keeping a continuous
  reference plane under every memory signal (no plane splits/slots
  underneath).
- Via usage: minimizing via count on high-speed signals, stub-length
  limits, via stitching near layer transitions for return-path
  continuity.
- BGA breakout/escape routing for both the FPGA and DRAM packages —
  where most of the practical routing difficulty actually lives.
- Crosstalk mitigation in practice: spacing rules, guard traces where
  needed (ties back to Module 6).
- Deliverable: a **routing checklist** artifact + one worked breakout-
  routing example diagram.

### Module 10 — FPGA-Specific Considerations

- I/O bank assignment rules: bank voltage grouping, dedicated clock
  pins, which pins are eligible to be DQS.
- Pin-swap rules revisited from Module 2 with concrete examples of what
  can/can't be freely reassigned during layout.
- Calibration/training process overview: what read/write leveling
  actually does at power-up and why the layout choices in Modules 4–9
  exist to make that calibration succeed.
- Vendor tool touchpoint (mention only, not a tutorial): pin-planner/
  memory-interface-generator tools (e.g., Xilinx MIG, Intel/Altera EMIF)
  as where topology and pin-swap constraints get entered and validated.

### Module 11 — Design Checklist, Common Mistakes & Bring-Up

- Consolidated pre-layout checklist (pulls together Modules 2–10 into one
  reference list — candidate for a downloadable/printable summary, same
  spirit as the RS232/485/422 one-pager already produced).
- Common failure modes and their symptoms: VREF noise → intermittent
  bit errors; missed length matching → reduced timing margin/random
  errors at speed; ODT misconfiguration → reflections/ringing;
  insufficient decoupling → SSO-induced errors under load; fly-by
  topology violations → leveling failure at power-up.
- Bring-up/debug tips: scope probing points, what a "good" vs. "bad" eye
  looks like at a glance, basic memory test-pattern strategy for first
  power-on.

### Module 12 — Capstone Bridge / Mini-Project

- Explicit hand-off to `Trainings/SI/capstone-ddr4.html`: "you've just
  designed the interface — now go verify it."
- Suggested hands-on mini-project: given a target DDR4-2400 x16
  component and a chosen FPGA family, produce (a) a topology choice with
  justification, (b) a byte-lane/signal-group map, (c) a length-matching
  budget, and (d) a termination/decoupling plan. This becomes the input
  the existing SI capstone's scenario already assumes.

## 5. Interactive/Visual Elements Needed

- Fly-by vs. T-branch vs. P2P topology comparison diagram.
- Byte-lane grouping diagram (DQS + DQ[7:0] + DM/DBI as one unit).
- VTT termination schematic (per topology).
- PDN/decoupling stack-up diagram for VDD/VDDQ/VPP/VREF.
- BGA breakout/escape routing worked example.
- Length-matching visualizer (tight DQ/DQS group vs. looser CA/CK group),
  ideally interactive/adjustable like the existing SI calculators
  (`calc-impedance.html`, `calc-crosstalk.html`, `calc-eye.html` are the
  established pattern to follow).
- Real datasheet excerpt callouts (DRAM part-number decoder, FPGA I/O bank
  table) with source attribution.

## 6. Relationship to Existing Site Content (avoid duplication)

- `Trainings/SI/01-fundamentals.html`–`03-impedance-matching.html`:
  reference for transmission-line/impedance basics rather than
  re-teaching them — link out, don't duplicate.
- `Trainings/SI/capstone-ddr4.html`: the verification phase that follows
  this module — cross-link both directions once both exist.
- `Trainings/FPGA/Fundamentals-and-architecture/`: general FPGA
  architecture course; this new module assumes that level of FPGA
  familiarity but doesn't require having taken it.

## 7. Out of Scope

- Full timing-closure math/derivations (setup/hold budget calculations at
  the controller) — conceptual coverage only, deep derivation belongs to
  the SI capstone or a future advanced module.
- Protocol/controller firmware or RTL configuration details.
- Non-DDR memory types (SRAM, Flash, HBM) — DDR3/4/5 and LPDDR4/5 only.
- Full PDN impedance simulation methodology — concept-level only per
  Module 8.

## 8. Acceptance Criteria

- [ ] All 12 modules present with lesson pages following the site's
      existing interactive-lesson template (sections, quiz, diagrams).
- [ ] Every module includes at least one real image/diagram and one quiz
      of appropriate length for its depth.
- [ ] Component-selection checklist (Module 2) and routing checklist
      (Module 9) exist as reusable, standalone artifacts within their
      lessons.
- [ ] Explicit cross-links added: this module → `capstone-ddr4.html`, and
      (once built) `capstone-ddr4.html` → this module's Module 1.
- [ ] Course added to `Trainings/FPGA/` sidebar navigation and to
      `Trainings/trainings.html`'s catalogue.
- [ ] Technical content spot-checked against at least one real DDR4/DDR5
      datasheet and one real FPGA memory-interface user guide for
      accuracy (parameter names, typical values, package/pin terminology).
