# Requirements Document: RS232 / RS485 / RS422 Hardware Design Guide (One-Pager)

## 1. Purpose

Produce a single-page (one sheet, front side only) quick-reference hardware
design guide covering the RS232, RS485, and RS422 serial interfaces. The
guide is intended as a bench/desk reference for hardware engineers laying
out a new board with one or more of these interfaces — not a tutorial or
protocol deep-dive.

## 2. Audience

Hardware design engineers (junior to mid-level) who need a fast reminder of
signal levels, pinouts, protection, and layout rules while designing a
schematic or PCB. Assumes basic familiarity with serial communication
concepts.

## 3. Format Constraints

- Single page, landscape orientation recommended (fits more side-by-side
  comparison content than portrait).
- Delivered as a print-ready PDF (and an editable source, e.g. Figma/
  PowerPoint/Illustrator or an HTML/SVG artifact), at minimum 300 DPI
  equivalent for any diagrams.
- Dense but legible: target 8–9 pt minimum body text at final print size.
- Color-coded by interface (e.g., one accent color per RS232/RS485/RS422)
  so a reader can visually jump to the relevant column/section.
- No more than ~150 words of prose total — content should lean on tables,
  diagrams, and bullet callouts rather than paragraphs.

## 4. Content Requirements

Because only one page is available, content is split into **Must Have**
(fits comfortably) and **Nice to Have** (include only if space allows after
Must Have content is laid out — candidates to cut first if the page is
overcrowded).

### 4.1 Must Have

1. **Interface comparison table** — RS232 vs RS485 vs RS422 side by side:
   - Signal type (single-ended vs. differential)
   - Logic/voltage levels (e.g., RS232 ±3V to ±15V; RS485/422 differential
     ±1.5V to ±5V typ.)
   - Max cable length vs. max data rate (reference points, not full curve)
   - Topology (point-to-point vs. multidrop/multipoint)
   - Max number of drivers/receivers on a bus
   - Duplex mode (full vs. half duplex)

2. **Connector & pinout reference**
   - RS232: DE-9 (DB9) pinout — TX, RX, RTS, CTS, DTR, DSR, DCD, RI, GND
   - RS485/RS422: common terminal block / RJ45 pin conventions —
     A/B (or D+/D−), Y/Z (RS422 second pair), GND
   - Call-out on the A/B naming ambiguity across vendors (no universal
     standard — verify against the datasheet, not just silkscreen labels)

3. **ESD protection circuit**
   - Recommended TVS diode topology per signal line (uni- vs. bidirectional
     TVS, placement immediately at the connector, before any series
     resistor/ferrite)
   - Reference ESD test levels to design against (IEC 61000-4-2: ±8 kV
     contact / ±15 kV air, as a common baseline)
   - Small schematic snippet: connector → TVS → series resistor/ferrite →
     transceiver

4. **Termination & bias network**
   - 120 Ω termination at each end of an RS485/RS422 bus (why: matches
     twisted-pair characteristic impedance, suppresses reflections)
   - Fail-safe biasing resistors (pull-up on A/D+, pull-down on B/D−) and
     why they're needed (idle-bus indeterminate state without them)
   - Note that RS232 point-to-point links do not need bus termination

5. **Transceiver IC selection notes**
   - RS232: charge-pump transceiver requirement (e.g., MAX232-family) to
     generate ±V rails from a single supply
   - RS485/422: half-duplex (single transceiver, DE/RE control) vs.
     full-duplex (separate driver/receiver pairs) options
   - Slew-rate-limited parts for noise-sensitive/long-cable installs vs.
     high-speed parts for short, high-baud-rate links

6. **PCB layout callouts**
   - Route RS485/RS422 pairs as controlled-impedance differential pairs
     (~120 Ω differential), length-matched
   - Keep ESD/TVS components tight to the connector, before the protected
     boundary crosses onto the board
   - Maintain ground-plane continuity under differential pairs; avoid
     splits/slots crossing the routing

7. **Quick decision guide** — "which interface should I use?" one-line
   decision aid (e.g., short cable/single device → RS232; long cable or
   multidrop bus → RS485; full-duplex point-to-point over distance →
   RS422)

### 4.2 Nice to Have (include if space allows)

8. Isolation guidance — when to use isolated transceivers/digital isolators
   (ground-loop-prone industrial installs, mixed-ground multidrop buses)
9. Common-mode voltage range note for RS485/RS422 receivers (why exceeding
   it corrupts data even with correct differential levels)
10. Cabling guidance — shielded twisted pair, one-end shield grounding,
    baud-rate-vs-distance reference curve (condensed to 3–4 data points)
11. Multidrop topology diagram — daisy-chain "line" topology recommended;
    star topology called out as unsupported/unreliable for RS485
12. Half-duplex turnaround timing note — DE/RE switching delay budget
    relevant to protocol timing (e.g., Modbus RTU inter-frame gap)
13. Power/decoupling — local bypass capacitor value/placement at each
    transceiver
14. Standards reference footer — TIA/EIA-232-F, TIA/EIA-485-A,
    TIA/EIA-422-B, IEC 61000-4-2 (ESD), IEC 61000-4-4 (EFT), IEC 61000-4-5
    (surge)
15. Common failure modes callout box (e.g., missing termination → reflected
    glitches; missing bias → garbage on idle bus; A/B swapped → no
    communication but no damage)

## 5. Visual/Diagram Requirements

- One small schematic for the ESD/protection front-end (connector → TVS →
  series element → transceiver), reusable across all three interfaces with
  interface-specific notes.
- One pinout diagram per interface (DE-9 for RS232; terminal block/RJ45 for
  RS485 and RS422).
- One small topology diagram contrasting point-to-point (RS232/RS422) vs.
  multidrop bus (RS485).
- Comparison table (Section 4.1, item 1) as the visual anchor of the page.

## 6. Out of Scope

- Protocol-layer content (Modbus, framing, error checking, etc.) beyond the
  one half-duplex-timing callout in 4.2.
- Software/driver configuration.
- Detailed derivations of cable-length-vs-baud-rate curves (reference
  values only, not full theory).
- Multi-page appendices — if content doesn't fit, cut from the Nice to Have
  list first (Section 4.2), in reverse order (cut item 15 first, item 8
  last).

## 7. Acceptance Criteria

- [ ] All Section 4.1 (Must Have) content present and legible at final
      print size.
- [ ] Fits on one page with no overflow or truncated text/tables.
- [ ] Comparison table, pinouts, and ESD schematic are all readable without
      zooming on a standard printed A4/Letter sheet.
- [ ] Reviewed against at least one real transceiver datasheet (e.g., a
      MAX232/MAX485 family part) to confirm voltage levels and pin
      functions are accurate.
- [ ] No protocol-layer content beyond what's listed in Section 4.2.
