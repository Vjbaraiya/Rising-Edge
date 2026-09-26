<!-- Rising Edge — Weekly Challenge bulk question template -->
<!-- Separate each question with a line containing only: --- -->
<!-- Mark correct option(s) with a leading * . Lines are "key: value". -->
<!-- type = mcq | multi | truefalse | numeric -->

type: mcq
topic: Plane Splits
difficulty: Intermediate
points: 10
image:
prompt: A high-speed single-ended trace on the top layer must cross a split between two isolated ground plane regions on the layer directly below it, and no stitching capacitor is present near the crossing. What is the most significant consequence for that trace?
options:
- The trace's DC resistance increases measurably
- *The return current is forced to detour around the split, increasing loop inductance, ringing, and radiated EMI
- The trace's propagation delay decreases
- Nothing changes, since plane splits only affect power traces
explanation: Crossing a plane split without a nearby stitching path forces the return current into a large detour to find a way across, increasing loop inductance and creating ringing and radiated EMI — the same failure mode as a layer-transition via far from a stitching capacitor.

---

type: mcq
topic: Via Stitching
difficulty: Intermediate
points: 10
image:
prompt: Ground stitching vias are placed at regular intervals along a PCB's edges and around sensitive RF sections. What is their primary signal-integrity/EMI purpose?
options:
- To increase the board's mechanical stiffness
- *To tie the ground plane layers together at frequent intervals, suppressing plane resonances and shortening return-current paths near the board edge
- To provide mounting points for enclosure screws
- To reduce the DC resistance of the power rail
explanation: Stitching vias equalize potential between ground layers and give return currents a short, low-inductance path near board edges, which suppresses plane-cavity resonances and reduces edge radiation — a standard EMI mitigation technique.

---

type: mcq
topic: Decoupling Capacitor Placement
difficulty: Intermediate
points: 10
image:
prompt: Two identical decoupling capacitors sit near the same IC power pin — one connects to the planes through two short, wide vias, the other through a single long, narrow via. At high frequency, which is more effective, and why?
options:
- Neither is different, since both have the same capacitance value
- The one with the long, narrow via, because added inductance improves filtering
- *The one with two short, wide vias, because lower via/loop inductance keeps the capacitor low-impedance at higher frequencies
- The one with the long via, because it places the capacitor closer to resonance
explanation: At high frequency, the capacitor's effectiveness is limited by the parasitic inductance of its mounting loop (pads + vias), not just its capacitance value. Short, wide vias minimize that loop inductance, keeping the capacitor's impedance low out to higher frequencies.

---

type: mcq
topic: Trace Routing
difficulty: Intermediate
points: 10
image:
prompt: Compared to a 45° or curved bend, why do PCB designers avoid routing high-speed traces with sharp 90° right-angle corners?
options:
- 90° bends have no real electrical effect; they're avoided purely by convention
- *A 90° corner locally widens the trace's effective copper area, creating a small impedance discontinuity and a hotspot for radiated emissions
- 90° bends significantly increase the trace's DC resistance
- 90° bends prevent the fabricator from plating the trace correctly
explanation: At a right-angle corner, the outer edge of the copper effectively bulges beyond the nominal trace width over a short stretch, causing a small localized impedance dip and concentrating radiated emissions at that point — small at low speeds, but worth avoiding as edge rates increase, which is why 45°/curved bends are the routing convention.

---

type: mcq
topic: Stack-up Design
difficulty: Intermediate
points: 10
image:
prompt: A 6-layer PCB stack-up uses uneven copper weights and dielectric thicknesses between the top and bottom halves of the board. What manufacturing risk does this asymmetry primarily create?
options:
- Reduced controlled-impedance accuracy only
- *Warping or bowing of the finished board, from unequal mechanical stress during lamination and cooling
- Increased trace-to-trace crosstalk
- Reduced solder mask adhesion
explanation: Symmetric stack-ups (mirrored copper weights and dielectric thicknesses above and below the center) balance thermal and mechanical stress during lamination and cooldown. Asymmetric stack-ups are a classic cause of board warp/bow, which then creates coplanarity problems during SMT assembly.

---

type: mcq
topic: DFM — Acid Traps
difficulty: Intermediate
points: 10
image:
prompt: A trace enters a pad at a sharp acute angle, leaving a narrow sliver of copper at the junction. During etching, this feature is most at risk of:
options:
- Etching perfectly, since narrow copper etches faster and more precisely
- Improving solder wetting compared to a perpendicular entry
- *Over-etching or trapping acid in the sliver (an "acid trap"), which can undercut and weaken the trace-to-pad connection
- Nothing; only the pad's annular ring size affects manufacturability
explanation: An acute-angle copper sliver — an "acid trap" — etches unevenly because etchant lingers in the narrow wedge, risking undercut and a weak or broken connection. Design rules address this by requiring traces to enter pads near 90° or with a teardrop fillet rather than a sharp angle.

---

type: mcq
topic: Controlled Impedance
difficulty: Intermediate
points: 10
image:
prompt: For a target 50 Ω single-ended impedance, moving from 0.5 oz to 1 oz copper weight (all other stack-up dimensions unchanged) generally requires the designer to:
options:
- Increase the dielectric height above the reference plane to compensate
- *Narrow the trace width, since thicker copper adds sidewall/fringing capacitance to the plane for a given width
- Widen the trace, since thicker copper always raises impedance
- Make no change, since copper weight does not affect impedance
explanation: Thicker copper increases the trace's cross-section and fringing capacitance to the reference plane at a given width, which lowers impedance for that width. Impedance calculators compensate by narrowing the trace for heavier copper to hit the same target Z0.

---

type: mcq
topic: Thermal Reliefs
difficulty: Intermediate
points: 10
image:
prompt: A through-hole pad sits inside a large ground copper pour and connects to it through four thin thermal-relief spokes instead of being directly flooded into the plane. What is the main reason for this choice?
options:
- Thermal reliefs improve the pad's current-carrying capacity
- *Thermal reliefs limit heat sinking into the large copper pour during soldering, preventing cold or incomplete solder joints
- Thermal reliefs reduce the plane's overall DC resistance
- Thermal reliefs are required to meet controlled-impedance rules
explanation: A pad flooded directly into a large copper area conducts heat away so quickly during soldering that the joint may never reach reflow temperature, causing a cold joint. Thin spokes limit thermal conduction so the solder wets properly, at the minor cost of slightly higher local resistance and inductance — an intentional manufacturing trade-off.

---

type: mcq
topic: EMI Mitigation
difficulty: Intermediate
points: 10
image:
prompt: A sensitive low-level analog trace is routed on the same layer next to a noisy switching digital trace. Which of the following is the most effective mitigation?
options:
- Increase the analog trace's width only
- *Route a grounded guard trace between them, stitched to the reference plane with vias at regular intervals
- Route the two traces closer together so the noise averages out
- Remove the reference plane beneath both traces
explanation: A grounded, via-stitched guard trace gives coupled noise a low-impedance path to intercept before it reaches the sensitive trace. Widening the victim trace or moving the traces closer does not address the coupling mechanism, and removing the reference plane would make crosstalk and impedance control drastically worse.

---

type: mcq
topic: Fabrication & Assembly
difficulty: Intermediate
points: 10
image:
prompt: A PCB design includes three small fiducial marks — copper pads with a soldermask opening — near two corners and the board center, separate from any component footprint. What is their primary purpose?
options:
- They serve as grounding points for ESD protection
- *They give the pick-and-place machine's optical vision system precise reference points to align the board before placing components
- They mark where the panel should be depanelized
- They are test points used for in-circuit testing
explanation: Fiducials are optical alignment references for automated SMT assembly — the pick-and-place machine's camera locates them to correct for any offset or rotation of the board before placing parts. They are not electrical test points, ESD points, or depanelization markers.
