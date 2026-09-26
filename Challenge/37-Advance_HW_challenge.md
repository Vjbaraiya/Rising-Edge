<!-- Rising Edge — Weekly Challenge bulk question template -->
<!-- Separate each question with a line containing only: --- -->
<!-- Mark correct option(s) with a leading * . Lines are "key: value". -->
<!-- type = mcq | multi | truefalse | numeric -->
<!-- Challenge 37 — Advanced Hardware Design (5 difficult questions, 20 pts each = 100) -->

type: mcq
topic: Power Integrity — PDN Target Impedance & Anti-Resonance
difficulty: Advanced
points: 20
image: /Challenge/question-images/w37-adv-pdn-impedance.svg
prompt: A power-distribution network must stay below a target impedance from DC to 200 MHz at an IC's power pins. Bulk and MLCC decoupling caps are added, yet a sharp impedance PEAK appears at a mid-band frequency, exceeding the target even though total capacitance is ample. What causes the peak, and what is the standard fix?
options:
- The IC is drawing too much DC current; the fix is to raise the supply voltage
- *A parallel anti-resonance between a capacitor's ESL and the plane/neighboring-cap capacitance; the fix is to spread decoupling across several capacitor values/packages so their self-resonant frequencies overlap and flatten the composite impedance
- There is too much bulk capacitance; the fix is to remove capacitors until the peak disappears
- The ground plane is too thick; the fix is to reduce copper weight
explanation: Every real capacitor is a series R-L-C: below its self-resonant frequency (SRF) it looks capacitive, at SRF it is minimum, and above SRF its ESL makes it inductive. When an inductive (above-SRF) capacitor sits in parallel with the capacitance of the plane or a larger cap, they form a parallel LC that anti-resonates, producing an impedance PEAK. Staggering capacitor values and packages (bulk + mid + small HF MLCC placed close to the die) spreads their SRFs so that as one cap rolls off inductive, the next is still capacitive — keeping the composite PDN impedance low and smooth across the band instead of amplifying it.

---

type: mcq
topic: Transmission Lines — Source (Series) Termination
difficulty: Advanced
points: 20
image: /Challenge/question-images/w37-adv-series-termination.svg
prompt: A fast CMOS driver with ~10 Ω output impedance drives a single high-speed net on a 50 Ω PCB trace to one receiver. To eliminate reflections with the lowest static power, what termination should you use and where?
options:
- A 50 Ω pull-down to ground at the driver
- *A series resistor at the driver sized so (driver output impedance + resistor) ≈ 50 Ω, i.e. about 39 Ω placed right at the driver pin
- A 50 Ω resistor to VCC at the receiver
- No termination — CMOS inputs are high impedance so reflections never matter
explanation: Series (source) termination matches the driver end: the added resistor plus the driver's own output impedance is set equal to the line impedance Z0 (here ~10 Ω + 39 Ω ≈ 50 Ω). The driver launches a half-amplitude wave; it reflects off the high-impedance receiver back to full amplitude, and because the source is now matched, that returning wave is absorbed instead of re-reflecting. It draws essentially no static current (unlike parallel/Thevenin termination), making it ideal for a point-to-point net with a single load. It must sit right at the driver pin to be effective.

---

type: mcq
topic: High-Speed Vias — Stub Resonance & Back-Drilling
difficulty: Advanced
points: 20
image: /Challenge/question-images/w37-adv-via-stub.svg
prompt: A multi-Gbps signal transitions from a top layer to an inner layer through a through-hole via on a thick backplane, leaving an unused via barrel ("stub") continuing to the bottom. Why does this hurt signal integrity, and what is the common fix?
options:
- The stub adds useful series inductance that sharpens the edges; no fix is needed
- *The stub acts as a resonant open transmission-line segment that creates an impedance discontinuity and a notch (suck-out) in the channel's frequency response near its quarter-wave frequency; back-drilling removes the unused barrel
- The stub only increases DC resistance; the fix is thicker plating
- The stub improves return-loss and should be lengthened
explanation: The leftover via barrel below the signal's exit layer is an unterminated transmission-line stub. It resonates and reflects energy, and around the frequency where the stub is a quarter-wavelength it creates a sharp dip (resonant null / "suck-out") in the channel's insertion-loss response, closing the eye. The standard fix is back-drilling (controlled-depth drilling from the far side) to remove the unused barrel, leaving only the used portion of the via. Alternatives include using blind/buried vias or thinner boards so the stub is short relative to the signal wavelength.

---

type: mcq
topic: Thermal Design — Power-QFN Thermal Vias
difficulty: Advanced
points: 20
image: /Challenge/question-images/w37-adv-thermal-vias.svg
prompt: A power QFN dissipates several watts through its exposed bottom pad. To reduce junction temperature, what is the most effective PCB measure, and what is the key detail?
options:
- Leave the exposed pad unconnected so heat stays in the package
- Use thermal-relief spokes on the exposed pad, the same as a signal through-hole pad
- *Provide an array of thermal vias under the exposed pad connecting to internal/bottom copper planes, and solid-fill the pad to the top plane; the vias must be filled/tented or capped to avoid solder wicking that starves the joint
- Increase the solder-mask opening so the pad radiates more heat to air
explanation: The dominant heat path from a power QFN is conduction through the exposed pad into the board's copper. An array of thermal vias under the pad carries heat to inner and bottom copper planes that act as heat spreaders, sharply lowering the junction-to-ambient thermal resistance. The pad should be flooded solid into the top plane (NOT thermal-relieved, which would throttle heat flow). The practical caveat is manufacturability: open vias in the pad can wick solder away during reflow, starving the joint and creating voids — so the vias are typically via-in-pad filled and capped/plated over, or tented, to keep a reliable, void-free solder connection.

---

type: mcq
topic: Clocking — Crystal Oscillator Negative Resistance & Drive Level
difficulty: Advanced
points: 20
image: /Challenge/question-images/w37-adv-xtal-oscillator.svg
prompt: A Pierce crystal oscillator sometimes fails to start on cold boards, and on units that do start the crystal is running warm. Which pair of design parameters explains both symptoms, and how are they set?
options:
- Supply voltage and clock duty cycle; both are fixed in firmware
- *Negative-resistance margin (must exceed the crystal's ESR with margin for reliable start-up) and drive level (must stay under the crystal's max, set by the series resistor and load caps); too little margin causes no-start, too much drive overheats/ages the crystal
- Trace width and solder-mask color; widen the trace and use black mask
- Only the load capacitor value; increasing it fixes everything
explanation: A Pierce oscillator must present enough NEGATIVE resistance to overcome the crystal's motional loss (ESR) plus a safety margin (commonly ≥5×) so it starts reliably across temperature and part spread — insufficient margin is the classic cold-start no-oscillation failure. Separately, the DRIVE LEVEL (power dissipated in the crystal) must stay below the crystal's rated maximum; excessive drive overheats the crystal, degrades frequency stability, and accelerates aging. The two are traded with the external components: the load capacitors set the load capacitance (frequency) and, together with a series/damping resistor, limit drive level, while the amplifier's transconductance and those caps determine the negative-resistance margin. Good designs verify both: measure start-up margin (e.g., add series R until it fails) and drive level.
