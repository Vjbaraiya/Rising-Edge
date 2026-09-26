<!-- Rising Edge — Weekly Challenge bulk question template -->
<!-- Separate each question with a line containing only: --- -->
<!-- Mark correct option(s) with a leading * . Lines are "key: value". -->
<!-- type = mcq | multi | truefalse | numeric -->
<!-- Challenge 36 — PCB Design (20 MCQ: 10 Basic @4, 5 Moderate @6, 5 Difficult @6 = 100) -->

type: mcq
topic: Vias — Basics
difficulty: Basic
points: 4
image:
prompt: What is the primary purpose of a via in a printed circuit board?
options:
- To mechanically mount a component to the board surface
- *To make an electrical connection between traces on different copper layers
- To increase the board's dielectric constant
- To act as a test point for a multimeter only
explanation: A via is a plated hole that carries a signal or power connection vertically from one copper layer to another. Types include through-hole, blind, and buried vias.

---

type: mcq
topic: Silkscreen
difficulty: Basic
points: 4
image:
prompt: On a PCB, what is the silkscreen layer used for?
options:
- To carry high-current power between layers
- *To print component outlines, reference designators, polarity marks, and labels on the board surface
- To provide the controlled-impedance reference plane
- To insulate the copper from solder
explanation: The silkscreen is the printed ink layer (usually white) showing component outlines, reference designators (R1, C3…), pin-1 marks and other human-readable labels. It carries no electrical signal.

---

type: mcq
topic: Solder Mask
difficulty: Basic
points: 4
image:
prompt: What is the main function of the solder mask (the colored coating, often green) on a PCB?
options:
- To conduct heat away from every component
- *To insulate and protect the copper, prevent solder bridging between adjacent pads, and resist oxidation
- To provide the board's mechanical rigidity
- To store static charge safely
explanation: Solder mask is a thin polymer layer over the copper that leaves only pads and other intended areas exposed. It prevents accidental solder bridges during assembly, protects traces from oxidation and shorts, and provides electrical insulation.

---

type: mcq
topic: Copper Pour / Plane
difficulty: Basic
points: 4
image:
prompt: A large filled area of copper on a PCB layer, often connected to ground, is called a copper pour or plane. What is a common benefit of a ground pour?
options:
- It increases the board's weight for stability only
- *It provides a low-impedance return path and can improve shielding and heat spreading
- It removes the need for any vias
- It raises the impedance of nearby signal traces
explanation: A ground pour/plane gives signals a nearby low-impedance return path (reducing loop area and EMI), can help spread heat, and offers some shielding. It is one of the most common and important features in multilayer PCB design.

---

type: mcq
topic: Annular Ring
difficulty: Basic
points: 4
image:
prompt: The "annular ring" of a via or through-hole pad refers to:
options:
- The soldermask opening around the pad
- *The ring of copper remaining around the drilled hole
- The silkscreen circle printed on the pad
- The air gap between the pad and the plane
explanation: The annular ring is the copper that surrounds the drilled hole. A minimum annular ring width is a key fabrication rule — too little (or drill breakout) risks a broken connection, so designers keep pad diameter comfortably larger than the drill.

---

type: mcq
topic: Trace Width & Current
difficulty: Basic
points: 4
image:
prompt: For a copper trace carrying significant current, what generally happens if the trace is made too narrow?
options:
- Nothing; trace width does not affect current capacity
- The trace becomes a better conductor
- *Its resistance and temperature rise increase, risking excessive heating or an open (fused) trace
- The trace's impedance automatically drops to zero
explanation: A narrower trace has higher resistance and less copper cross-section to carry heat, so for a given current it runs hotter. Undersizing power traces causes excessive temperature rise and, in the extreme, the trace can act like a fuse and open. Width (and copper weight) are sized to the current per standards like IPC-2221.

---

type: mcq
topic: Reference Designators
difficulty: Basic
points: 4
image:
prompt: On a schematic and PCB, a capacitor is typically labeled with which reference-designator prefix?
options:
- R
- *C
- U
- L
explanation: Standard reference-designator prefixes include R for resistors, C for capacitors, L for inductors, U (or IC) for integrated circuits, D for diodes, and Q for transistors.

---

type: mcq
topic: Footprints / Land Pattern
difficulty: Basic
points: 4
image:
prompt: In PCB layout, what is a component "footprint" (land pattern)?
options:
- The 3D height the component occupies
- *The arrangement of copper pads, holes, and courtyard on the board that matches a physical component's leads
- The total power the component dissipates
- The schematic symbol used for the component
explanation: A footprint is the physical land pattern — pad sizes, spacing, hole sizes and keep-out/courtyard — that a specific component solders onto. It must match the part's package dimensions for reliable assembly; the schematic symbol is a separate logical representation.

---

type: mcq
topic: Layer Count
difficulty: Basic
points: 4
image:
prompt: Compared with a 2-layer board, a key advantage of a 4-layer PCB with dedicated power and ground planes is:
options:
- It is always cheaper to manufacture
- *Better signal integrity and EMI performance, because signals have adjacent reference planes for clean return paths
- It eliminates the need for decoupling capacitors
- It cannot be used for high-speed designs
explanation: Adding internal power and ground planes gives every signal layer a close reference plane, shrinking return-current loop area — which improves signal integrity, lowers EMI, and simplifies power distribution. The trade-off is higher fabrication cost than a 2-layer board.

---

type: mcq
topic: Drill / Hole Types
difficulty: Basic
points: 4
image:
prompt: What distinguishes a plated through-hole (PTH) from a non-plated (NPTH) hole?
options:
- A PTH is always larger in diameter
- *A PTH has copper plating on its walls to make an electrical connection between layers; an NPTH is a bare hole, typically for mechanical mounting
- An NPTH can carry signals but a PTH cannot
- There is no difference; the terms are interchangeable
explanation: A plated through-hole has copper on the barrel walls so it electrically connects layers (used for through-hole component leads and vias). A non-plated hole has no copper and is used for mechanical purposes such as mounting screws.

---

type: mcq
topic: Controlled Impedance
difficulty: Moderate
points: 6
image:
prompt: To achieve a target 50 Ω single-ended trace impedance, moving from 0.5 oz to 1 oz copper (all other stack-up dimensions unchanged) generally requires the designer to:
options:
- Increase the dielectric height above the plane
- *Narrow the trace width, since thicker copper adds fringing capacitance to the plane for a given width
- Widen the trace, since thicker copper always raises impedance
- Make no change; copper weight does not affect impedance
explanation: Thicker copper increases the trace's cross-section and fringing capacitance to the reference plane at a given width, which lowers impedance. Impedance calculators compensate by narrowing the trace for heavier copper to hit the same Z0.

---

type: mcq
topic: Thermal Reliefs
difficulty: Moderate
points: 6
image:
prompt: A through-hole pad inside a large ground pour connects to it through four thin spokes rather than being flooded solid. What is the main reason?
options:
- To increase the pad's current capacity
- *To limit heat sinking into the pour during soldering, preventing cold or incomplete joints
- To reduce the plane's DC resistance
- To meet controlled-impedance rules
explanation: A pad flooded directly into a large copper area conducts heat away so fast during soldering that the joint may not reach reflow temperature, causing a cold joint. Thin thermal-relief spokes limit conduction so solder wets properly, at the minor cost of slightly higher local resistance/inductance.

---

type: mcq
topic: Teardrops
difficulty: Moderate
points: 6
image:
prompt: Adding "teardrops" where a trace meets a pad or via primarily improves:
options:
- The board's dielectric constant
- *Mechanical/electrical robustness of the junction against drill misregistration and stress cracking
- The trace's controlled impedance target
- The silkscreen legibility
explanation: A teardrop is a fillet of copper that smoothly blends a trace into a pad or via. It increases the connection area so that slight drill misregistration or mechanical/thermal stress is less likely to crack the trace-to-pad junction, improving manufacturing yield and reliability.

---

type: mcq
topic: High-Speed Routing
difficulty: Moderate
points: 6
image:
prompt: Why do PCB designers route high-speed traces with 45° or curved bends instead of sharp 90° right angles?
options:
- 90° bends have no electrical effect; it is only convention
- *A 90° corner locally widens the effective copper, creating a small impedance discontinuity and an emissions hotspot
- 90° bends greatly increase the trace's DC resistance
- 90° bends prevent proper plating
explanation: At a right-angle corner the outer copper effectively bulges beyond the nominal width, causing a small localized impedance dip and concentrating radiated emissions there. It is minor at low speeds but worth avoiding as edge rates rise — hence the 45°/curved routing convention.

---

type: mcq
topic: Fiducials
difficulty: Moderate
points: 6
image:
prompt: Small copper dots with a soldermask opening, placed near board corners and separate from any footprint, serve primarily to:
options:
- Provide ESD grounding points
- *Give the pick-and-place vision system precise optical references to align the board before placing parts
- Mark where the panel is depanelized
- Act as in-circuit test points
explanation: Fiducials are optical alignment marks. The assembly machine's camera locates them to correct for any board offset or rotation before placing components. They are not test points, ESD points, or depanelization marks.

---

type: mcq
topic: Return Path — Plane Splits
difficulty: Difficult
points: 6
image: /Challenge/question-images/w36-pcb-return-split.svg
prompt: A high-speed single-ended trace on the top layer crosses a split between two isolated ground regions on the layer directly below, with no stitching capacitor nearby. What is the most significant consequence?
options:
- The trace's DC resistance increases measurably
- *The return current is forced to detour around the split, increasing loop inductance, ringing, and radiated EMI
- The trace's propagation delay decreases
- Nothing changes; plane splits only affect power traces
explanation: A high-speed signal's return current wants to flow on the reference plane directly beneath the trace. A split with no nearby stitching path forces that return into a large detour, increasing loop inductance and producing ringing and radiated EMI — the same failure mode as a layer transition far from a stitching via. Keep high-speed traces over continuous reference copper, or provide a stitching capacitor/via at the crossing.

---

type: mcq
topic: Via Stitching
difficulty: Difficult
points: 6
image: /Challenge/question-images/w36-pcb-via-stitching.svg
prompt: Ground stitching vias placed at regular intervals along board edges and around RF sections primarily serve to:
options:
- Increase the board's mechanical stiffness
- *Tie the ground layers together frequently, suppressing plane-cavity resonances and shortening return-current paths near the edge
- Provide mounting points for enclosure screws
- Reduce the DC resistance of the power rail
explanation: Stitching vias equalize potential between ground layers and give return currents short, low-inductance paths near board edges. This suppresses plane-cavity resonances and reduces edge radiation — a standard EMI mitigation, especially spaced at a fraction of the wavelength of the highest frequency of concern.

---

type: mcq
topic: DFM — Acid Traps
difficulty: Difficult
points: 6
image:
prompt: A trace enters a pad at a sharp acute angle, leaving a narrow copper sliver at the junction. During etching this feature is most at risk of:
options:
- Etching perfectly, since narrow copper etches faster and more precisely
- Improving solder wetting versus a perpendicular entry
- *Over-etching or trapping etchant in the sliver (an "acid trap"), which can undercut and weaken the trace-to-pad connection
- Nothing; only annular-ring size affects manufacturability
explanation: An acute-angle copper sliver — an "acid trap" — etches unevenly because etchant lingers in the narrow wedge, risking undercut and a weak or broken connection. Design rules require traces to enter pads near 90° or with a teardrop fillet rather than a sharp angle.

---

type: mcq
topic: Stack-up Symmetry
difficulty: Difficult
points: 6
image:
prompt: A multilayer PCB stack-up uses uneven copper weights and dielectric thicknesses between its top and bottom halves. What manufacturing risk does this asymmetry mainly create?
options:
- Reduced controlled-impedance accuracy only
- *Warping or bowing of the finished board from unequal mechanical stress during lamination and cooling
- Increased trace-to-trace crosstalk only
- Reduced solder-mask adhesion
explanation: Symmetric stack-ups (mirrored copper weights and dielectric thicknesses about the center) balance thermal/mechanical stress during lamination and cooldown. Asymmetric stack-ups are a classic cause of board warp/bow, which then creates coplanarity problems and defects during SMT assembly.

---

type: mcq
topic: Length Matching
difficulty: Difficult
points: 6
image: /Challenge/question-images/w36-pcb-length-match.svg
prompt: A parallel/source-synchronous bus (or a differential pair) is routed with serpentine "accordion" sections on some traces. What design goal does this serve?
options:
- To increase the total capacitance of the bus
- *To match the electrical length (propagation delay) of the traces so signals arrive within the timing/skew budget
- To add deliberate resistance to slow the signals
- To improve the board's thermal dissipation
explanation: Serpentine detours lengthen the shorter traces so that all bits (or both halves of a differential pair) have nearly equal propagation delay, keeping skew within budget. Too much skew misaligns data relative to clock (parallel bus) or converts differential signal into common-mode noise (differential pair). Bends are kept gentle to avoid impedance discontinuities.
