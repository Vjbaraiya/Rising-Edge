# Prompt: Complete the Optocoupler Design Academy Modules

> Paste everything below the line into Claude Code, or a similar coding agent, opened at the root of the `Rising-Edge1` repository. It is written for **one module per session**. Replace `{{MODULE}}` with the module number (e.g. `03`) and run it again for each module. The **Execution order** section at the end gives the recommended sequence.

---

## 1. Role and goal

You are a senior power-electronics and isolation-design engineer who is also an experienced technical-training author and front-end developer. Your task is to turn **Module {{MODULE}}** of the *Optocoupler (Opto-Isolator) Design Academy* from a "Coming Soon" placeholder into a complete, production-quality, interactive lesson. It must match the depth, tone, and interactivity of the modules that are already finished.

The site is Rising Edge Technologies (`https://www.risingedgetech.com`). The course lives in `Trainings/Circuit/Optocoupler/`. The audience is practising hardware engineers, from graduates to senior staff: people who design real products and need worst-case numbers, not hand-waving.

## 2. Current state of the course

| # | File | Status |
|---|---|---|
| 01 | `01-introduction.html` | ✅ Complete (~140 KB) — **primary style reference** |
| 02 | `02-why-optocouplers.html` | ✅ Complete (~250 KB) — reference for simulators/tabs |
| 03 | `03-construction.html` | ⏳ Placeholder |
| 04 | `04-working-principle.html` | ⏳ Placeholder |
| 05 | `05-types.html` | ⏳ Placeholder |
| 06 | `06-parameters.html` | ⏳ Placeholder |
| 07 | `07-datasheet.html` | ⏳ Placeholder |
| 08 | `08-selection-criteria.html` | ⏳ Placeholder |
| 09 | `09-derating.html` | ⏳ Placeholder |
| 10 | `10-design-examples.html` | ⏳ Placeholder |
| 11 | `11-pcb-guidelines.html` | ✅ Complete (~330 KB) — **reference for numbered collapsible sections** |
| 12 | `12-failure-mechanisms.html` | ⏳ Placeholder |
| 13 | `13-testing-validation.html` | ⏳ Placeholder |
| 14 | `14-applications.html` | ⏳ Placeholder |
| 15 | `15-vs-modern-isolation.html` | ⏳ Placeholder |
| 16 | `16-standards.html` | ⏳ Placeholder |
| 17 | `17-labs-case-studies.html` | ⏳ Placeholder (Capstone) |

Each placeholder already contains the correct `<head>`, sidebar, breadcrumb, progress bar, hero (title + subtitle), a **Learning Objectives** block, a **Planned Topics** grid, and a **Reserved Sections** block. Keep the head, sidebar, breadcrumb, progress bar, and hero. Replace everything from the `coming-banner` down to the end of `lesson-body` with real content.

## 3. Before writing anything: study the references

1. Read `01-introduction.html`, `02-why-optocouplers.html`, and `11-pcb-guidelines.html` completely. Take notes on:
   - the page skeleton, including `content-main`, `content-header`, `lesson-body`, `hero`, `section`, and `container`;
   - the collapsible numbered sections (`section-collapsible` → `section-header-btn[data-target]` → `section-body`, with a `chevron`, the first section `active`, the rest `collapsed`) and the JS that toggles them;
   - the component classes already in use: `widget-container`, `metric-card`, `metrics-grid`, `adv-card`/`adv-grid`, `info-box`, `warning-box`, `flow-strip`/`flow-step`/`flow-arrow`, `data-table`/`spec-table` inside `table-scroll`, `calc-grid`/`calc-inputs`/`calc-field`/`calc-results`/`calc-result-item`, `slider-group`, `plot-area`, `canvas-wrap`, `tool-tab`/`tool-panel`, `toggle-tab`/`tab-row`, `diagram-card`, `impact-card`, `checklist-item`, `gloss` (glossary tooltip), `scenario`/`scenario-head`/`scenario-body`/`scenario-solution` with `[data-reveal]` buttons, `tf-btn`, `dd-wrap`/`dd-slot` (drag-and-drop), and `cmp-btn`;
   - how the Knowledge Check is built (Part A MCQ, Part B True/False, Part C Match/Drag-drop, Part D/E Scenarios) and how it scores;
   - how `training-progress.js` and `core.js` are loaded, and what they expect (lesson IDs, completion hooks);
   - how dark/light theming works (`data-theme`, CSS variables such as `--text-sub`). **Never hard-code colours that break in either theme.** Use the existing tokens.
2. Read `training-compat.css` and skim `assets/css/components.css`, so you **reuse existing classes** before inventing new ones. Put any new CSS in the page's `<style>` block, name it clearly, and theme it with variables.
3. Read the target placeholder `{{MODULE}}-*.html`. Its **Learning Objectives** and **Planned Topics** are the contract: every objective must be taught and assessed, and every planned topic must become at least one section.

## 4. Required page structure (every module)

Follow this order, adapting it to the module where noted in §6:

1. **Hero** (keep it). Update the badge only if needed.
2. **Learning Objectives**: keep the existing 5 objectives, restyled like Module 01/11 (`metric-card` or `objective-card`).
3. **Prerequisites and "where this fits"**: a short `info-box` that links the previous and next modules and the specific earlier sections it builds on.
4. **Numbered collapsible sections**, 8–18 of them depending on scope, titled `Section N — …` exactly as in Module 11. Each section contains:
   - explanatory prose written for engineers (why it matters → how it works → numbers → pitfalls);
   - at least one visual: an inline **SVG** diagram, a schematic, or a characteristic curve (theme-aware strokes/fills via `currentColor`/CSS vars, and a `<title>` for accessibility);
   - equations in plain HTML (`<sub>`, `<sup>`, `&times;`, `&Delta;`), each with every variable defined and units stated;
   - a worked numeric example that uses **real part numbers and datasheet-typical/worst-case values**;
   - `warning-box` "Design traps" and `info-box` "Pro tips" where they apply;
   - `gloss` tooltips on first use of jargon.
5. **Interactive tools**: at least **2 calculators/simulators and 1 animation** per module (the specific ones are listed in §6). Requirements:
   - vanilla JS only, no external libraries, no network calls;
   - live update on slider/input change, input validation, and units always shown;
   - a pass/fail or colour-coded verdict wherever a design limit applies;
   - canvas/SVG plots that redraw on resize and on theme change;
   - animations that respect `prefers-reduced-motion` and have Play/Pause.
6. **Summary / Key takeaways**: 6–10 bullet `adv-card`s.
7. **Design checklist**: printable `checklist-item`s the reader can tick. Use `localStorage` wrapped in try/catch and prefix keys with `opto-m{{MODULE}}-`.
8. **Knowledge Check**, in the same format as Module 01/02:
   - Part A: 8–10 multiple choice, with an explanation for every option;
   - Part B: 6–8 True/False, with explanations;
   - Part C: a match-term-to-definition or drag-and-drop exercise (5–8 items);
   - Part D: 3 engineering scenarios with "Reveal solution" and fully worked numbers;
   - a score display, plus a completion hook into `training-progress.js` so the module is marked complete.
9. **Additional Resources**: application notes and standards, cited by title, number, and publisher (e.g. *Broadcom AN-1036*, *Vishay "Optocouplers — Application Note 02"*, *IEC 60747-5-5*). Don't invent URLs; cite by name/number only, unless a URL is already used in Modules 01/02/11.
10. **Prev/Next lesson navigation**, the same as the completed modules.

Target size: **120–300 KB** of HTML, comparable to Modules 01/02/11. Depth matters more than padding.

## 5. Global quality rules

- **Technical accuracy is non-negotiable.** Use worst-case (min/max) values for design and label typicals as typical. Where a figure depends on vendor, grade, or standard edition, say so. If you are unsure of a number, use a conservative, clearly labelled "representative" value and add a *"verify against the current datasheet/standard"* note. Never state a fabricated figure as fact.
- Use SI units with correct symbols (mA, µs, kV/µs, V<sub>rms</sub>, V<sub>peak</sub>, °C). Distinguish rms and peak isolation voltages every time.
- Use real, widely available representative parts: PC817, 4N35, 4N25, TLP185, H11B1/4N32 (Darlington), 6N135/6N136, 6N137, HCPL-2630, TLP2361, ACPL-064L, HCPL-3120/ACPL-332J/TLP250 (gate drivers), IL300/HCNR201 (linear), MOC3021/MOC3041/MOC3063 (TRIAC), H11C1/4N40 (SCR), AQY210/TLP222 (PhotoMOS/SSR), H11AA1 (AC-input), and TL431 + PC817 for SMPS feedback.
- Keep the voice consistent with Module 01: second person, confident, practical, with occasional field anecdotes ("the classic failure is…"). No marketing fluff and no emojis in body text.
- Accessibility: semantic headings (one `h1`; section `h2`s; `h3` inside), `aria-expanded` on collapsibles, labelled inputs, alt/`<title>` on graphics, keyboard-operable drag-and-drop fallback (click-to-place, as in Module 01), and colour never used as the only signal.
- Responsive: no horizontal page scroll at 360 px. Wide tables go in `table-scroll`.
- Keep the existing AdSense script, manifest, service-worker registration, canonical URL, and theme bootstrap exactly as they are.
- Cross-link other modules by filename where concepts overlap. Don't duplicate large chunks of Modules 01/02/11; reference them.

## 6. Module-specific content specifications

Each module's hero subtitle, Learning Objectives, and Planned Topics (already in the file) define the minimum scope. The detail below expands them.

### Module 03 — Optocoupler Construction (`03-construction.html`)
**Sections:** Anatomy overview (lead frame, emitter die, detector die, optical medium, barrier, mould) · LED die technologies (GaAs ~940 nm, GaAlAs ~850–880 nm, and why IR is used: efficiency and silicon spectral response) · detector technologies (phototransistor, photodiode + amplifier IC, Darlington, photovoltaic MOSFET-driver stacks, photo-TRIAC) and their spectral match · coupling constructions: co-planar/reflective (dome), face-to-face/stacked (silicone gel), and why distance-through-insulation (DTI) matters · isolation barrier materials (polyimide film, silicone, clear epoxy, and mould compound), with dielectric strength, partial discharge, CTI/material group, and ageing · package families (4-pin DIP, 6-pin DIP, SOP-4/LSOP, SO-8, stretched SO-6/SO-8, wide-body SO-16, SMD gull-wing, 0.4-inch "wide lead" DIP), with typical creepage/clearance/DTI per package · the manufacturing flow (die attach → wire bond → optical coupling medium → dome/transfer mould → trim/form → 100 % hi-pot and PD screening → electrical test and CTR binning).
**Interactives:** (1) an exploded-view SVG animation that assembles the package layer by layer, with hover labels; (2) a package comparator: select packages and see creepage, clearance, DTI, footprint, and max V<sub>IORM</sub> in a table; (3) an LED spectrum vs silicon responsivity plot with a wavelength slider showing coupling efficiency.
**Quiz focus:** why co-planar parts have higher isolation, package vs creepage, and what CTR binning letters mean.

### Module 04 — Working Principle (`04-working-principle.html`)
**Sections:** LED physics (radiative recombination, internal/external quantum efficiency, V<sub>F</sub> vs I<sub>F</sub> vs temperature, about −1.5 to −2 mV/°C) · optical path and coupling efficiency losses · the photodiode junction as a current source (responsivity A/W) · phototransistor action (I<sub>C</sub> = h<sub>FE</sub> × I<sub>PH</sub>), the CTR decomposition (CTR = η<sub>LED</sub> × η<sub>coupling</sub> × R × h<sub>FE</sub>), and why CTR peaks at mid I<sub>F</sub> and falls at high/low I<sub>F</sub> and temperature extremes · saturation vs linear operation, and the V<sub>CE(sat)</sub> dependence on I<sub>F</sub> overdrive · switching: t<sub>d</sub>, t<sub>r</sub>, t<sub>s</sub>, t<sub>f</sub>, the Miller-multiplied collector-base capacitance, and the effect of R<sub>L</sub> and base resistor (R<sub>BE</sub>) on speed · the small-signal model and the opto pole (for feedback loops, linking to Module 10).
**Interactives:** (1) a photon-flow animation (electrons → photons → photocurrent → amplified collector current) with an I<sub>F</sub> slider; (2) a CTR explorer showing CTR vs I<sub>F</sub> for 3 temperatures, driven by an I<sub>F</sub>/T<sub>A</sub>/V<sub>CE</sub> model; (3) a switching-waveform simulator where you vary R<sub>L</sub>, I<sub>F</sub>, and R<sub>BE</sub> to see t<sub>on</sub>/t<sub>off</sub> and the output waveform; (4) a saturation checker that says whether the output is saturated for given I<sub>F</sub>, CTR<sub>min</sub>, R<sub>L</sub>, and V<sub>CC</sub>.

### Module 05 — Different Types of Optocouplers (`05-types.html`)
**Sections:** one section per family, each with its schematic symbol (SVG), internal block, representative parts, key specs table, typical application, strengths, and traps:
Phototransistor (PC817, 4N35) · Photodarlington (4N32, H11B1) · Photodiode + transistor (6N135/6N136) · High-speed logic output (6N137, HCPL-2630, TLP2361, with totem-pole/open-collector outputs and enable pins) · Analog linear (IL300, HCNR201: a servo photodiode, transfer gain K3, and op-amp circuits) · MOSFET output/solid-state relay (PhotoMOS AQY210, TLP222; R<sub>ON</sub>, off-state leakage, AC/DC switching) · TRIAC output (random-phase MOC3021 vs zero-cross MOC3041/MOC3063; snubbers, dv/dt, driving a power TRIAC) · SCR output (H11C1/4N40) · gate-driver couplers (HCPL-3120, ACPL-332J with DESAT, TLP250; peak output current, UVLO, Miller clamp) · AC-input couplers (H11AA1).
**Interactives:** (1) a family comparison matrix (speed vs CTR/gain vs drive vs cost) as a filterable table plus a bubble chart; (2) a "Which family?" wizard with 5–6 questions that recommends a family and a representative part; (3) a TRIAC driver calculator for the series resistor and snubber RC; (4) an IL300 linear-circuit calculator for photovoltaic and photoconductive modes, giving transfer gain and output range.

### Module 06 — Optocoupler Parameters (`06-parameters.html`)
**Sections:** CTR in depth (definition, test conditions, bins, variation with I<sub>F</sub>/T/V<sub>CE</sub>/ageing) · the isolation voltage family: V<sub>ISO</sub> (UL 1577, 1 min, rms), V<sub>IORM</sub>, V<sub>IOTM</sub>, V<sub>IOSM</sub>, V<sub>PR</sub> (partial-discharge test voltage), and R<sub>IO</sub>, C<sub>IO</sub>; explain rms vs peak and working vs transient vs surge · forward-current limits (I<sub>F</sub> max, I<sub>FP</sub> pulse, V<sub>R</sub> reverse, LED reverse protection) · output ratings (V<sub>CEO</sub>, V<sub>ECO</sub>, I<sub>C</sub> max) · propagation delay t<sub>PLH</sub>/t<sub>PHL</sub>, pulse-width distortion (PWD), propagation-delay skew, data rate · CMTI (static vs dynamic, CM<sub>H</sub>/CM<sub>L</sub>, kV/µs, the test method, and what happens when it's exceeded) · thermal: R<sub>θJA</sub>, power dissipation budget (LED + output), junction temperature, and derating curves.
**Interactives:** (1) a worst-case CTR calculator (CTR<sub>min,bin</sub> × temperature factor × ageing factor × I<sub>F</sub> factor → CTR<sub>EOL</sub>, then required I<sub>F</sub>); (2) an isolation-voltage converter (rms ↔ peak ↔ DC hi-pot equivalent, with V<sub>IORM</sub> vs working voltage check); (3) a CMTI requirement calculator (dV/dt from switching node voltage and rise time, with margin vs the part rating); (4) a power-dissipation/T<sub>J</sub> calculator. A parameter-checklist table to download/print closes the module.

### Module 07 — Reading the Datasheet (`07-datasheet.html`)
**Sections:** anatomy of a datasheet (page map) · absolute maximum ratings (what "absolute" means, stress vs operating, and what physically fails beyond each limit) · recommended operating conditions · electrical characteristics tables (reading test conditions; typ vs min/max; which column you design to) · switching characteristics and their test circuits (why your R<sub>L</sub> ≠ their R<sub>L</sub>) · CTR curves: CTR vs I<sub>F</sub>, vs T<sub>A</sub>, normalised curves, and ageing curves; reading log axes correctly · derating graphs (I<sub>F</sub> and P<sub>D</sub> vs T<sub>A</sub>) · safety certification table (UL 1577 file number, VDE/IEC 60747-5-5 insulation characteristics table, CQC/CSA; interpreting V<sub>IORM</sub>, V<sub>IOTM</sub>, pollution degree, material group, CTI, insulation class) · package drawing and recommended land pattern (finding creepage/clearance/DTI, and wide-lead options) · ordering information and CTR rank codes · a side-by-side walk-through of a PC817-class sheet and a 6N137-class sheet.
**Interactives:** (1) an annotated mock datasheet (an original, generic layout; **do not copy a vendor's datasheet verbatim**) with hotspots that explain each line on click; (2) a "Spot the trap" exercise that highlights the value a novice would wrongly design to; (3) a curve reader: drag a cursor on a CTR vs I<sub>F</sub> plot to read values, then apply a temperature curve; (4) a certification-table decoder: enter a working voltage/pollution degree/insulation type to see whether the given table values are sufficient.

### Module 08 — Component Selection Criteria (`08-selection-criteria.html`)
**Sections:** the selection funnel overview · deriving the isolation requirement (functional/basic/supplementary/reinforced; working voltage; overvoltage category; pollution degree; altitude; end-product standard → required V<sub>IORM</sub>/V<sub>IOTM</sub>/creepage) · speed requirement (data rate, PWD, skew budget) → family filter · CTR selection with lifetime margin · output type selection · temperature range (commercial/industrial/automotive, AEC-Q101) · package selection (creepage, assembly, reflow MSL) · certification needs · cost optimisation (volume pricing, second-sourcing, pin-compatible alternates, and when a digital isolator is cheaper, linking to Module 15) · a full worked selection for 3 applications.
**Interactives:** (1) a step-by-step selection worksheet/wizard that outputs a requirement spec plus candidate families, is printable, and saves to localStorage; (2) an isolation-requirement calculator (working voltage + insulation class + pollution degree → minimum creepage/clearance and V<sub>IOTM</sub>, clearly labelled "representative values — confirm with the governing standard table"); (3) a cost-at-volume comparator.

### Module 09 — Optocoupler Derating (`09-derating.html`)
**Sections:** why derate (the part you'll have in year 10) · LED light-output degradation vs I<sub>F</sub>, T<sub>J</sub>, and time (manufacturer ageing curves; higher I<sub>F</sub> gives more light now but faster decay) · CTR margin stacking: bin minimum × temperature factor × end-of-life factor × unit-to-unit, plus a typical 50 % EOL design rule and its justification · temperature derating of I<sub>F</sub>, P<sub>D</sub>, and I<sub>C</sub> · reliability engineering basics (Arrhenius acceleration, activation energy, FIT/MTBF, and an intro to handbook models like SN 29500/IEC 61709, cited not reproduced) · lifetime estimation from mission profile · derating policies (e.g. company rules such as ≤ 50 % I<sub>F</sub> max, ≤ 80 % V<sub>CEO</sub>) and documenting the rationale for design review.
**Interactives:** (1) a CTR margin stack calculator (waterfall chart from initial CTR to EOL CTR, with verdict); (2) an LED ageing simulator (I<sub>F</sub> and T<sub>A</sub> sliders → projected CTR vs years curve, with an EOL threshold line); (3) an Arrhenius acceleration-factor calculator; (4) a derating-report generator that produces a copyable text table for the design file.

### Module 10 — Design Examples (`10-design-examples.html`)
Each example is a full section with: requirements → schematic (SVG) → step-by-step component calculations with worst-case values → BOM table → layout notes (link to Module 11) → common mistakes → test/verification.
**Examples:** MCU input isolation (3.3 V logic, PC817/TLP185, LED resistor, pull-up, speed-up R<sub>BE</sub>) · MCU output driving a relay/load · 24 V PLC digital input per IEC 61131-2 Type 1/3 (current limiting, threshold, reverse polarity, surge/TVS, LED indicator) · SMPS feedback with TL431 + PC817 (bias resistors, TL431 minimum cathode current ~1 mA, the opto pole, type-II compensation, gain calculation, and a Bode plot) · IGBT/SiC gate-drive stage with HCPL-3120/ACPL-332J (bootstrap or isolated supply, gate resistor, DESAT, Miller clamp, bypassing, CMTI margin) · mains zero-cross detection with H11AA1 or two-diode input (resistor power and voltage rating, timing offset) · isolated UART (6N137, pull-up sizing vs baud rate) and isolated RS-485 (data + DE control, and isolated power).
**Interactives:** (1) an LED-resistor + pull-up designer with a worst-case verdict; (2) a PLC input calculator (input threshold vs IEC 61131-2 region); (3) a TL431/PC817 feedback-loop designer with a live Bode plot (gain/phase, crossover, phase margin); (4) a gate-driver R<sub>G</sub>/peak-current calculator; (5) a UART baud-rate checker (edge rates vs bit time).

### Module 12 — Failure Mechanisms (`12-failure-mechanisms.html`)
**Sections:** failure-mode overview (FMEA-style table: mode → mechanism → cause → detection → prevention) · LED ageing physics (dislocation growth, non-radiative recombination, current density and temperature acceleration) · CTR degradation signatures in field returns and how to distinguish LED ageing vs detector damage vs contamination · thermal stress (T<sub>J</sub> excursions, wire-bond lift, package cracking, thermal cycling) · moisture (MSL, popcorning during reflow, ion migration, and leakage increase under humidity + bias) · ESD damage (LED reverse ESD, output-side damage, and latent damage) · isolation barrier breakdown (partial discharge, treeing, contamination-bridged creepage, over-voltage events, and precursors) · screening and prevention measures · failure-analysis workflow for a returned unit.
**Interactives:** (1) an interactive FMEA table with filtering and a severity/occurrence/detection → RPN calculator; (2) a "diagnose the return" game, where you're given symptoms and measurements and pick the mechanism; (3) an animated partial-discharge/treeing visualisation.

### Module 13 — Testing and Validation (`13-testing-validation.html`)
**Sections:** the test pyramid (component → board → system → production) · Hi-Pot testing (AC vs DC, 1.414× equivalence, ramp rate, dwell, trip current, type test vs production 1 s test, pin shorting of each side, safety of the operator and equipment, and pitfalls such as Y-caps, stored charge, and over-stressing the barrier with repeated tests) · partial-discharge testing concept · isolation resistance (500 V/1000 V megger, and interpreting GΩ values under humidity) · bench CTR characterisation (test circuit, sweep I<sub>F</sub> and temperature, and data plotting) · switching/CMTI bench test setup · EMC validation of isolated interfaces (IEC 61000-4-2/-4/-5 ESD, EFT, surge; common-mode injection; pass criteria) · thermal testing (thermocouples/IR, T<sub>J</sub> estimation) · production test strategies (coverage, ICT/functional, and sampling vs 100 %).
**Interactives:** (1) a Hi-Pot test planner (insulation class + working voltage → test voltage AC/DC, duration, and trip setting, clearly labelled representative); (2) a CTR measurement lab simulator (virtual bench: set I<sub>F</sub>, read I<sub>C</sub>, build the curve, compute CTR); (3) a leakage/insulation-resistance calculator; (4) an EMC test-level reference table with a pass-criteria explainer.

### Module 14 — Applications (`14-applications.html`)
One section per sector, each with: a typical isolation architecture diagram (SVG) · governing standards (link to Module 16) · a device-family choice and why · environmental stresses · a reference design snippet · pitfalls.
**Sectors:** industrial automation (PLC I/O, fieldbus, and 24 V systems) · medical (patient-connected, MOPP/MOOP, leakage current, and IEC 60601-1) · motor drives and inverters (gate drive, current/voltage sensing, high CMTI) · renewable energy (PV inverters, wind converters, high DC working voltages, and altitude) · EV chargers (AC/DC charging, pilot/communications isolation, and IEC 61851) · battery management systems (stack voltages, daisy-chain comms, and the automotive grade) · instrumentation (precision linear isolation with IL300/HCNR201, and isolated ADC front ends).
**Interactives:** (1) a clickable "system map" per sector: click an isolation point to see the recommended family, part, and rationale; (2) a sector comparison matrix (voltage, CMTI, speed, temperature, standard); (3) a medical MOPP/MOOP requirement helper (representative values, labelled "verify with IEC 60601-1 tables").

### Module 15 — Optocouplers vs Modern Isolation Technologies (`15-vs-modern-isolation.html`)
**Sections:** the technology landscape · capacitive digital isolators (on-off keying/edge encoding, SiO<sub>2</sub> barrier; e.g. TI ISO77xx, SiLabs Si86xx) · magnetic/transformer-based (Analog Devices iCoupler ADuM family, and isoPower) · isolation transformers (signal and power) · fibre-optic links · a quantitative benchmark: data rate, propagation delay, PWD, power consumption, CMTI, isolation rating and lifetime (TDDB for SiO<sub>2</sub> vs optocoupler ageing), EMI emission and susceptibility, magnetic-field immunity, temperature range, and cost · where optocouplers still win (simplicity, analog/linear, SSR/TRIAC functions, low cost at low speed, no secondary-side supply needed for some outputs) · a technology selection decision tree.
**Interactives:** (1) a benchmark radar/bar chart with toggles per technology and metric (use representative values, labelled); (2) a decision-tree wizard that outputs a recommended technology and justification; (3) a power-consumption comparison calculator vs data rate and channel count.

### Module 16 — Industry Standards and Certifications (`16-standards.html`)
**Important accuracy note:** the optocoupler component standard is **IEC 60747-5-5** (and its DIN EN / VDE 0884-5 counterpart). **IEC 60747-17 / VDE 0884-17** covers *magnetic and capacitive* couplers (digital isolators). The placeholder lists IEC 60747-17. Teach both and make the distinction explicit, and update the Planned Topics/objective wording if needed. Also note that VDE 0884-11 was superseded by VDE 0884-17.
**Sections:** component vs end-product standards (and why a certified part doesn't certify your product) · UL 1577 (withstand rating, V<sub>ISO</sub> 1 min, production test) · IEC 60747-5-5 / VDE 0884-5 (V<sub>IORM</sub>, V<sub>IOTM</sub>, V<sub>IOSM</sub>, PD testing, and safety-limiting values) · IEC 60747-17 / VDE 0884-17 (for comparison with digital isolators) · end-product standards: IEC 61010-1 (measurement/lab), IEC 60601-1 (medical: MOOP/MOPP), IEC 62368-1 (ICT/AV: hazard-based safety, which replaced IEC 60950-1/60065), IEC 61800-5-1 (drives), and IEC 60664-1 (insulation coordination fundamentals) · automotive: AEC-Q100/Q101, ISO 26262 functional-safety considerations, and FIT data · application-specific standards (IEC 61131-2, IEC 61851, IEC 62109) · building the certification argument (insulation diagram, table of isolation barriers, evidence file).
**Interactives:** (1) a standards navigator: pick a product type/market to see the applicable standards and required insulation class; (2) a certificate decoder: an annotated example UL/VDE certificate (generic, not copied); (3) an insulation-diagram builder: drag barriers onto a system block diagram and label each as B/S/R with the required rating.
**Caution:** do not reproduce copyrighted standard tables verbatim. Summarise and paraphrase, give representative values, and cite the clause/table number.

### Module 17 — Interactive Labs and Case Studies (Capstone) (`17-labs-case-studies.html`)
**Sections:** how to use the labs · **Hands-on design exercises** (6+ exercises with input fields and auto-checked answers within tolerance, covering Modules 03–16) · **LTspice labs** (for each: the objective, a netlist in a copy-to-clipboard code block, `.model` guidance, what to measure, expected results, and questions; cover the PC817 switching speed vs R<sub>L</sub>, the TL431 + PC817 loop with `.ac` Bode, a 6N137 UART at speed, an IL300 linear transfer, and the gate driver with CMTI-style common-mode step) · **PCB review exercises** (3 layouts as SVG with hidden defects; click to flag creepage violations, slot issues, and bypassing errors; score) · **Troubleshooting scenarios** (5 field failures told as stories, with a step-by-step investigation and branching choices) · **Component selection challenges** (3 briefs that each need a part chosen from a mini catalogue, with scoring and rationale) · **Final capstone project**: design an isolated 24 V PLC input + isolated RS-485 + isolated SMPS feedback for an industrial controller, with a requirements brief, a deliverables checklist, a self-assessment rubric, and a reference solution hidden behind reveal.
**Completion:** issue a course-completion state through `training-progress.js`, showing a summary of per-module scores if the progress API allows.

## 7. Also update when completing a module

1. In **`index.html`**, change the module card badge from `Coming Soon` to `Available` and add a time-estimate badge (e.g. `~70 min`) exactly as for modules 01/02. **Also fix module 11, which is complete but still shows "Coming Soon".**
2. In the module file's `<meta name="description">`, remove "Coming soon." and write a 150–160 character description.
3. Remove the `.coming-banner`, `.topic-grid`, `.topic-card`, `.reserved-block` placeholder CSS if they are no longer used.
4. Check that the progress label (`Lesson N/17`, `%` = round(N/17 × 100)) and the sidebar active state are correct.
5. Check that Prev/Next links point to the right files.

## 8. Verification before you finish

- Open the page in a headless browser (Playwright/Chromium). Confirm there are no console errors, every collapsible toggles, every calculator produces sane numbers for default and edge inputs, animations play/pause, and the quiz scores and marks completion.
- Test both dark and light themes, and widths of 360 px, 768 px, and 1440 px, with no horizontal scroll.
- Validate the HTML (no unclosed tags, unique IDs).
- Do a technical self-review: re-check every equation and every worked example numerically (compute them in a script). List any value you labelled "representative/verify" in your final summary.
- Confirm every Learning Objective is taught and assessed by at least one quiz item. Add a hidden comment map `<!-- objective → sections → quiz items -->`.
- Report the final file size and a list of sections, interactives, and quiz counts.

## 9. Output rules

- Edit files in place in `Trainings/Circuit/Optocoupler/`. Don't create new shared CSS/JS files unless asked.
- If a module is too large to write in one go, build it section by section (skeleton first, then fill), but never leave a half-written section behind.
- Don't commit or push unless asked. At the end, give a short summary: what was added, file size, open "verify" items, and the index.html changes.

## 10. Execution order (recommended)

Run this prompt once per module, in this order, because later modules reference earlier ones:
`03 → 04 → 05 → 06 → 07 → 09 → 08 → 10 → 12 → 13 → 15 → 16 → 14 → 17`
Do the Module 11 index badge fix in the first run.
