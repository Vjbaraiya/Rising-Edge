<!-- Rising Edge — Weekly Challenge bulk question template -->
<!-- Separate each question with a line containing only: --- -->
<!-- Mark correct option(s) with a leading * . Lines are "key: value". -->
<!-- type = mcq | multi | truefalse | numeric -->

type: mcq
topic: Signal Integrity & EMI — Via Return Path
difficulty: Advanced
points: 50
image: /Challenge/question-images/w35-adv-si-emi-via-antipad.svg
prompt: A high-speed single-ended clock trace transitions from the top layer to an inner stripline layer through a via. To ease manufacturing tolerance, the anti-pad (clearance hole) in the ground plane it passes through is made significantly larger than necessary. At multi-GHz edge rates, what is the primary signal-integrity and EMI consequence of this oversized anti-pad?
options:
- The oversized anti-pad only affects the DC resistance of the ground plane, with no high-speed impact
- *The anti-pad creates a local high-impedance discontinuity in the return path, causing reflections and radiating as an effective slot antenna at the via transition
- The anti-pad improves impedance matching by reducing the plane's parasitic capacitance
- The anti-pad has no effect, since ground planes behave as AC ground everywhere
explanation: An oversized anti-pad enlarges the clearance the return current must cross around the via, raising the local impedance of the return path and physically opening a slot in the reference plane. This shows up as two linked failure modes — a signal-integrity reflection at the impedance discontinuity, and an EMI problem, since the gap is driven by the high-frequency return current and radiates like a slot antenna. The standard mitigation is keeping anti-pads no larger than required and placing ground-stitching vias close to the signal via so the return current has a short path across the layer transition.

---

type: mcq
topic: Power Integrity — PDN Design
difficulty: Advanced
points: 50
image: /Challenge/question-images/w35-adv-pi-pdn-impedance.svg
prompt: A power distribution network (PDN) must stay below a 25 mΩ target impedance from DC to 100 MHz at the IC's power pins. The board uses a single decoupling capacitor value and package size everywhere. Measurements show the impedance dips nicely below target at low and high frequencies, but exceeds the target at a mid-band frequency even though there is plenty of total capacitance on the board. What is the most likely cause, and the standard fix?
options:
- There is too much bulk capacitance at DC; the fix is removing some of the bulk capacitors
- *A parallel anti-resonance between the bulk capacitors' inductance and the plane's inductance/capacitance at that frequency; the fix is spreading decoupling across multiple capacitor values and package sizes so their self-resonant frequencies overlap
- The IC is drawing excess DC current; the fix is raising the supply voltage
- The ground plane is too thick; the fix is reducing the copper weight
explanation: A single capacitor value leaves a frequency gap between where the bulk capacitors stop being effective (their own ESL takes over) and where the board/plane capacitance takes over. In that gap, the bulk capacitor's parasitic inductance can parallel-resonate with the plane's inductance, producing an impedance peak — an anti-resonance — instead of a dip. Staggering capacitor values and package sizes (bulk, mid-value ceramic, small high-frequency ceramic near the die) spreads their individual self-resonant frequencies across the band so the composite PDN impedance curve stays low and smooth, closing the gap instead of amplifying it.
