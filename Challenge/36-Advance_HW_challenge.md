<!-- Rising Edge — Weekly Challenge bulk question template -->
<!-- Separate each question with a line containing only: --- -->
<!-- Mark correct option(s) with a leading * . Lines are "key: value". -->
<!-- type = mcq | multi | truefalse | numeric -->
<!-- Challenge 36 — Advanced Hardware Design (5 difficult questions, 20 pts each = 100) -->

type: mcq
topic: Clock Domain Crossing — Metastability
difficulty: Advanced
points: 20
image: /Challenge/question-images/w36-adv-cdc-metastability.svg
prompt: A single-bit control signal generated in one clock domain is sampled directly by a flip-flop in an asynchronous, unrelated clock domain, with no synchronizer. Under what condition does this cause a functional failure, and what is the standard mitigation?
options:
- It never fails, because a flip-flop always resolves an input to a valid 0 or 1 within one cycle
- The only risk is a one-cycle latency error, fixed by adding a combinational buffer on the data path
- *If the source signal changes near the destination clock edge it violates setup/hold, and the flip-flop can go metastable and resolve to an unpredictable value; the fix is a two-flip-flop synchronizer to allow metastability to settle before the signal is used
- It fails only if the two clocks share the same frequency; unrelated frequencies are inherently safe
explanation: When an asynchronous signal transitions within the setup/hold window of the capturing clock, the flip-flop can enter a metastable state and take an indeterminate time to resolve, potentially propagating a bad value into the logic. A two-stage (double) flip-flop synchronizer gives the first stage's metastability a full destination clock period to settle before the second stage samples it, reducing the mean-time-between-failures to an acceptable level. Multi-bit buses need a handshake or gray-coded FIFO rather than per-bit synchronizers, since bits can resolve on different cycles.

---

type: mcq
topic: DDR Memory — Fly-by Topology & Termination
difficulty: Advanced
points: 20
image: /Challenge/question-images/w36-adv-ddr-flyby.svg
prompt: A DDR3/DDR4 address/command/clock bus is routed in a fly-by topology to several DRAM devices with a single VTT termination at the far end. Why is fly-by preferred over the older star/T-topology, and what feature compensates for the timing skew it introduces?
options:
- Fly-by is preferred because it removes the need for any termination; write leveling then corrects the impedance
- *Fly-by presents a clean, singly-terminated transmission line that preserves signal integrity at high data rates; the per-device flight-time skew it creates is compensated by the controller's write-leveling calibration
- Fly-by is chosen purely to shorten total copper; it has identical signal integrity to T-topology
- Fly-by eliminates timing skew entirely, so write leveling is unnecessary
explanation: A T/star topology creates impedance-discontinuity stubs at each branch, producing reflections that become unmanageable at DDR3+ speeds. Fly-by daisy-chains the signals past each device as one controlled-impedance line terminated once at the end, giving clean edges. The trade-off is that each DRAM sees the clock at a slightly different time (flight-time skew). DDR3/DDR4 solve this with write leveling — a calibration routine where the controller adjusts each byte-lane's DQS timing to match the clock arrival at that device.

---

type: mcq
topic: Power Supply Layout — Buck Converter Hot Loop
difficulty: Advanced
points: 20
image: /Challenge/question-images/w36-adv-buck-hotloop.svg
prompt: In a synchronous buck converter, which physical loop must be minimized in area above all others for good EMI and switching performance, and why?
options:
- The loop from the inductor to the output capacitor, because it carries the smoothed DC output current
- The feedback trace loop from the output back to the controller, because it carries the highest current
- *The "hot loop" formed by the high-side FET, low-side FET, and the input/high-frequency ceramic capacitor, because it carries the highest di/dt and its parasitic inductance causes ringing and radiated EMI
- The gate-drive loop, because it carries the converter's full load current
explanation: The current in the input-cap → high-side FET → low-side FET path switches on and off at very high di/dt every cycle. Any parasitic inductance in this "hot loop" resonates with the FETs' output capacitance, producing switch-node ringing, voltage overshoot (device stress), and broadband radiated EMI. Placing the high-frequency input ceramic capacitor immediately adjacent to the FETs to make this loop as small as possible is the single most important buck-layout rule. The inductor-to-output-cap path carries relatively smooth current and is far less critical.

---

type: mcq
topic: High-Speed Differential Pairs — Skew
difficulty: Advanced
points: 20
image: /Challenge/question-images/w36-adv-diffpair-skew.svg
prompt: On a multi-Gbps differential pair (e.g., USB 3.x, PCIe), one trace of the pair is routed slightly longer than the other, creating intra-pair skew. What is the primary consequence, and what is the correct fix?
options:
- It increases the pair's differential impedance and is fixed by widening both traces
- *The length mismatch converts part of the differential signal into common-mode noise, degrading the eye and radiating EMI; the fix is length-matching the pair, typically with a small serpentine on the shorter trace placed near the source of the mismatch
- It only adds harmless latency and requires no correction
- It improves common-mode rejection and is therefore desirable
explanation: Intra-pair skew means the two edges no longer arrive simultaneously, so during the skew interval the pair carries a net common-mode component instead of a pure differential signal. This closes the receiver's eye and turns the pair into a common-mode radiator (EMI). The remedy is to match the two trace lengths tightly, adding a compensating serpentine/bump to the shorter trace — ideally close to where the mismatch is introduced (e.g., near a connector or bend) so the pair is balanced along most of its run. Widening traces changes impedance, not skew.

---

type: mcq
topic: Gate Drive — Miller-Induced Turn-On
difficulty: Advanced
points: 20
image: /Challenge/question-images/w36-adv-gatedriver-miller.svg
prompt: In a half-bridge, when the high-side MOSFET turns on it slews the switch node quickly, and the low-side MOSFET (meant to stay off) briefly turns partly on, causing shoot-through. What mechanism causes this, and what is a standard mitigation?
options:
- Thermal runaway in the low-side FET; the fix is a larger heatsink
- *dV/dt across the low-side FET couples current through its gate-drain (Miller) capacitance into the gate; if the gate-drive impedance is too high the gate rises above threshold. Mitigations include a low-impedance gate pull-down, a negative off-bias, or a Miller-clamp driver
- Excess gate charge on the high-side FET; the fix is a larger bootstrap capacitor
- Body-diode reverse recovery in the high-side FET; the fix is a slower diode
explanation: The fast dV/dt at the switch node drives a current i = Cgd·(dV/dt) through the off FET's Miller (gate-drain) capacitance. That current flows through the gate-drive path's impedance; if the impedance is high enough, it lifts Vgs above the threshold and the "off" FET conducts, causing shoot-through and loss. Standard fixes reduce the gate loop's off-state impedance: a strong, low-resistance pull-down, a separate lower turn-off gate resistor, applying a negative gate off-bias, or using a driver with an active Miller clamp that shorts the gate to source during the off interval.
