# FPGA Power Supply Design Guide (One-Page) — Requirements Specification

**Product:** Rising Edge Technologies — Quick Hardware Design Guides series, Guide #2: FPGA Power Supply
**Document type:** Content & Page Requirements Specification
**Version:** 1.0 (Draft)
**Status:** For review
**Owner:** Content / Engineering, Rising Edge Technologies

---

## 1. Overview

A single-page, practical design guide for powering an FPGA — the follow-up to the I2C guide (Guide #1, now live as the I2C Academy). FPGAs are the hardest common power problem a board designer meets: many rails, tight tolerances, sequencing requirements, and amp-level transients. The guide walks a designer from "the FPGA datasheet lists nine rails" to a complete, verified power tree. Same platform treatment as Guide #1: design-token styling, `training-social.js` Like/Share/Feedback bar, animated SVG diagrams, Plotly charts, and an interactive calculator.

### 1.1 Goals

1. Answer the practical questions: which rails, how much current, which regulator type, what sequence, how to connect and decouple.
2. Rank for searches like "FPGA power supply design", "FPGA power sequencing", "VCCINT decoupling".
3. Funnel readers to the SI Academy (PDN/PI content) and FPGA trainings.
4. Serve as a desk reference: printable power-tree worksheet and design checklist.

### 1.2 Audience

Hardware/board designers integrating an FPGA (Xilinx/AMD, Intel/Altera, Lattice, Microchip) for the first few times; embedded engineers reviewing a power tree. Assumes basic DC-DC knowledge.

### 1.3 Scope

**In scope:** one HTML page (recommended: `Trainings/Guides/FPGA-Power/index.html`, or a module set under `Trainings/FPGA/` if built as a course like the I2C Academy); all topics in §2; one interactive power-estimation/decoupling calculator; SVG power-tree and sequencing diagrams; checklist and FAQ with schema.org markup.

**Out of scope (v1):** vendor-tool tutorials (Xilinx XPE / Intel EPE walkthroughs beyond a pointer), PMBus firmware, battery/energy-harvesting supplies, radiation-tolerant design.

---

## 2. Content requirements (topic list)

### 2.1 Introduction: why FPGA power is different ★

- The multi-rail reality: a mid-range FPGA needs 4–9 rails; a table of the standard rail families and what they feed:
  - **VCCINT** — core logic (0.7–1.0 V, highest current, tightest tolerance ±3 %);
  - **VCCAUX** — auxiliary/config logic (1.8 V typical);
  - **VCCO (per bank)** — I/O banks (1.2–3.3 V, set by I/O standard);
  - **VCCBRAM / VCC_PLL / VMGTAVCC / VMGTAVTT** — block RAM, PLLs and transceiver rails (the noise-sensitive ones);
  - config/eFuse/ADC rails (VCCADC, VBATT etc.).
- Load profile: static vs dynamic current, why FPGA current is design-dependent (same chip, 10× current difference), inrush at configuration, and amp-per-nanosecond transients from clock gating.
- Vendor power estimators (XPE/EPE) — the required first step; deriving worst-case vs typical numbers, and margin policy (recommend 20–30 %).
- Tolerance stack concept: DC set-point accuracy + ripple + transient droop must all fit inside the datasheet's ±3–5 % window.
- Comparison callout: powering an MCU (one rail, 100 mA) vs an FPGA (many rails, tens of amps) — sets expectations.

### 2.2 How to select components ★ (core section)

- **Architecture choice first:** discrete regulators vs multi-rail PMIC vs FPGA-vendor-blessed power modules (e.g. module families pre-mapped to rail requirements); decision table by rail count, current, board area, and design effort.
- **Switching regulator (buck) selection per rail:**
  - input range, output current with margin, switching frequency vs efficiency vs size;
  - transient response / control topology (why fast control loops matter for VCCINT);
  - external FET vs integrated; current-sharing/multi-phase above ~20 A;
  - remote sense for high-current core rails.
- **LDO selection — when and where:** noise-sensitive rails (transceiver AVCC/AVTT, PLL rails); PSRR vs frequency (a 60 dB @ 1 kHz LDO may be 20 dB at 1 MHz — post-filter implications); dropout and thermal math (P = (Vin−Vout)·I); "buck then LDO" cascade pattern.
- **Inductor selection:** ripple-current rule (ΔI ≈ 30–40 % of I_out), saturation vs thermal current ratings, DCR trade-off.
- **Capacitor selection:** input vs output caps; ceramic DC-bias derating (an "22 µF" 0402 X5R at 1.8 V may be 8 µF — with a chart); bulk (polymer) + MLCC mix; ESR/ESL basics feeding into §2.4.
- **Sequencing/supervision components:** PMIC built-in sequencers, discrete PGOOD daisy-chains, voltage supervisors/monitors, PMBus managers — when each is enough.
- Worked example: component selection for a Zynq/Artix-class device power tree (~5 rails), with a parts table.

### 2.3 How to connect ★ (core section)

- **Power tree topologies:** 12 V or 5 V input → intermediate rail(s) → point-of-load bucks; when to cascade vs parallel from the input; sharing rails between FPGA and companion devices (DDR, clocks) — and when *not* to share (transceivers).
- **Rail merging rules:** which FPGA rails may legally share a regulator (consult vendor tables — e.g. VCCINT+VCCBRAM at the same voltage often may; VMGTAVCC almost never) and the ripple/isolation conditions (ferrite bead + local decoupling vs separate regulator).
- **Power sequencing:** why sequence order matters (latch-up, I/O contention, configuration failure); typical required order (core → aux → I/O up, reverse down); ramp-rate limits; sequencing implementation patterns — PGOOD chaining, PMIC sequencer, supervisor + enable tree — each with a diagram; monotonic ramp requirement.
- **Animated SVG:** sequencing timing diagram — rails coming up in order with PGOOD handoffs (the "gif" element, like the I2C course animations).
- **PDN and decoupling:** target-impedance concept (Z_target = V·tolerance% / ΔI_transient); per-rail decoupling networks — bulk + mid + high-frequency MLCCs; per-pin vs per-region placement; following the vendor's decoupling tables vs computing your own; ferrite beads on analog rails (and the anti-resonance trap).
- **Interactive element (Plotly):** PDN impedance vs frequency for a configurable capacitor mix (sliders for bulk/µF counts), with Z_target line — mirrors the I2C course's interactive rise-time chart.
- **Layout guidelines:** regulator placement close to load, power-plane strategy per rail, via stitching for high-current paths, Kelvin/remote-sense routing, keeping switchers away from transceiver rails, thermal copper for LDOs and bucks.
- **Connection checklist diagram:** annotated example power tree schematic (SVG) for the worked example device.

### 2.4 Verification, monitoring & bring-up

- Pre-power checks: rail-to-rail shorts, sequence dry-run with FPGA unfitted (if socket/riser possible).
- First power-up ritual: current-limited bench supply, per-rail voltage/set-point verification, sequence capture on a 4-channel scope, ripple measurement technique (tip-and-barrel, 20 MHz BW limit).
- Load-transient testing of VCCINT; thermal survey at max load.
- In-system monitoring: XADC/SYSMON internal rail sensing, PGOOD aggregation to a status LED/supervisor, PMBus telemetry as an option.
- Common failure signatures table: FPGA won't configure (sequence/ramp), configures then crashes under load (droop), transceiver bit errors (rail noise), random block RAM errors (VCCBRAM sag).

### 2.5 Related standards & references (short)

- Vendor design guides (UG483/UG583-class PCB & power guides, Intel power delivery guides) — what to pull from them.
- PMBus/telemetry pointer; Guide cross-links: SI Academy (PDN deep-dive), Heat Sink training (thermal), EMI trainings (switcher noise/EMC).

### 2.6 Design checklist (printable)

~15 items: every rail listed with current + margin; estimator report archived; tolerance stack per rail; merge decisions verified against vendor tables; sequencing order and ramp rates per datasheet; monotonic ramps; decoupling per vendor table or Z_target; DC-bias derating applied; remote sense on core rail; ripple spec on transceiver rails; ferrite anti-resonance checked; thermal calc for every LDO/buck; PGOOD tree matches sequence; scope-verified sequence at bring-up; load-transient test passed.

### 2.7 FAQ block (SEO)

6–8 `FAQPage`-marked questions: "How many power rails does an FPGA need?", "Can VCCINT and VCCBRAM share a regulator?", "What order should FPGA rails power up?", "Buck or LDO for transceiver rails?", "How much decoupling does an FPGA need?", "Why won't my FPGA configure after a power change?".

---

## 3. Page & UX requirements

1. Same structure as Guide #1: sticky in-page ToC (or module sidebar if built as an academy), hero with reading time, breadcrumb, `training-social.js` bar (slug `Guides/FPGA-Power` or `FPGA/Power`), public access (SEO + funnel), cross-sell cards to SI Academy / FPGA / Heat Sink trainings.
2. Diagrams as inline theme-aware SVGs: multi-rail power tree, buck vs LDO decision flow, sequencing timing (animated), decoupling placement map, remote-sense routing. Captions + alt text on all.
3. **Interactive calculators (vanilla JS + Plotly, as in the I2C course):**
   - Rail budget worksheet: per-rail voltage/current entry → total power, per-regulator loss estimate, margin check;
   - PDN helper: Z_target from tolerance and transient current + capacitor-mix impedance plot;
   - LDO thermal quick-check: (Vin−Vout)·I vs θJA → junction temperature warning.
4. Non-functional: `TechArticle` + `FAQPage` JSON-LD, no heavy dependencies beyond Plotly CDN, < 250 KB/page, print stylesheet for the checklist, WCAG AA, three-theme support.

---

## 4. Acceptance criteria

1. All §2 topics present; the three ★ sections each have at least one diagram and one worked example or decision table.
2. Worked example produces a complete, plausible power tree for a named mid-range device (rails, parts, sequence).
3. PDN calculator draws Z(f) and flags violations of Z_target; LDO thermal check flags T_J > 125 °C.
4. Sequencing animation renders in all three themes; checklist prints on A4.
5. Social bar functional; guide reachable from trainings.html once added via the admin panel.

---

## 5. Open questions

1. Single one-page guide, or full 8-module academy like I2C? (Recommendation: start one-page; promote to academy if traffic justifies.)
2. Worked example device family: AMD Artix-7/Zynq-7000 (largest audience) vs Lattice ECP5 (simpler tree)? (Recommendation: Zynq-7000 with a note on scaling down.)
3. Include vendor-module (e.g. TI/ADI FPGA-ready modules) BOM alternatives in the worked example?
4. Gate the printable power-tree worksheet behind login for lead capture, or keep fully open? (Recommendation: open in v1.)
