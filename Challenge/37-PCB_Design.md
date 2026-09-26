<!-- Rising Edge — Weekly Challenge bulk question template -->
<!-- Separate each question with a line containing only: --- -->
<!-- Mark correct option(s) with a leading * . Lines are "key: value". -->
<!-- type = mcq | multi | truefalse | numeric -->
<!-- Challenge 37 — PCB Design (20 MCQ: 10 Basic @4, 5 Moderate @6, 5 Difficult @6 = 100) -->

type: mcq
topic: Gerber Files
difficulty: Basic
points: 4
image:
prompt: What are Gerber files used for in PCB manufacturing?
options:
- To simulate the circuit's electrical behavior
- *To describe each fabrication layer (copper, solder mask, silkscreen, drill) so the board house can manufacture the PCB
- To program the microcontroller after assembly
- To store the 3D mechanical enclosure model
explanation: Gerber files are the standard 2D artwork format that conveys each PCB layer — copper, solder mask, silkscreen, paste, and (with drill files) hole data — to the fabricator. They define exactly what gets etched, coated, and drilled.

---

type: mcq
topic: Solder Mask
difficulty: Basic
points: 4
image:
prompt: What is the primary purpose of the solder mask on a PCB?
options:
- To carry high-current power between layers
- *To insulate and protect the copper, prevent solder bridging between adjacent pads, and resist oxidation
- To provide the controlled-impedance reference plane
- To label components for assembly
explanation: Solder mask is a thin polymer coating over the copper that leaves only intended pads exposed. It prevents accidental solder bridges during assembly, protects traces from oxidation and shorts, and provides insulation. Component labels are the separate silkscreen layer.

---

type: mcq
topic: Surface Finish
difficulty: Basic
points: 4
image:
prompt: ENIG and HASL are two common PCB surface finishes. What do they provide?
options:
- The controlled impedance of the traces
- *A solderable, oxidation-resistant coating on exposed copper pads
- The color of the solder mask
- Mechanical stiffness of the board
explanation: A surface finish coats the exposed copper pads so they stay solderable and don't oxidize before assembly. HASL (hot-air solder leveling) is low-cost; ENIG (electroless nickel / immersion gold) gives a flat, fine-pitch-friendly, long-shelf-life finish. Neither sets impedance or mask color.

---

type: mcq
topic: Copper Weight
difficulty: Basic
points: 4
image:
prompt: PCB copper thickness is often specified in "oz" (e.g., 1 oz). What does 1 oz copper mean?
options:
- The weight of the whole finished board
- *The thickness of copper equivalent to 1 ounce spread over 1 square foot (≈ 35 µm); heavier copper carries more current
- The number of copper layers in the stack-up
- The diameter of the plated vias
explanation: Copper weight expresses foil thickness as ounces per square foot: 1 oz ≈ 35 µm, 2 oz ≈ 70 µm. Heavier copper carries more current and spreads heat better for a given trace width, at higher cost and slightly harder fine-line etching.

---

type: mcq
topic: Design Rule Check
difficulty: Basic
points: 4
image:
prompt: What does a DRC (Design Rule Check) verify in PCB layout?
options:
- That the firmware compiles correctly
- *That the layout meets manufacturing/spacing rules — trace width, clearance, annular ring, drill sizes, etc.
- That the enclosure fits the board
- That the BOM cost is minimized
explanation: A DRC automatically checks the layout against the fabricator's and design's constraints: minimum trace width and spacing, clearances, annular ring, drill-to-copper, silkscreen-over-pad, and so on. Passing DRC catches manufacturability errors before the board is sent out.

---

type: mcq
topic: Reference Designators
difficulty: Basic
points: 4
image:
prompt: On a schematic and PCB silkscreen, which reference-designator prefix denotes an inductor?
options:
- R
- C
- *L
- D
explanation: Standard prefixes: R = resistor, C = capacitor, L = inductor, D = diode, Q = transistor, U (or IC) = integrated circuit, Y/X = crystal.

---

type: mcq
topic: Fiducials
difficulty: Basic
points: 4
image:
prompt: Small copper dots with a solder-mask opening placed near board corners, separate from any footprint, are used to:
options:
- Provide ESD grounding points
- *Give the pick-and-place machine's vision system optical reference points to align the board before placing components
- Mark where the panel is depanelized
- Act as in-circuit test points
explanation: Fiducials are optical alignment marks. The assembly machine's camera locates them to correct for board offset and rotation before placing parts. They are not test points, ESD points, or depanel marks.

---

type: mcq
topic: Vias — Types
difficulty: Basic
points: 4
image:
prompt: A via that connects an outer layer to an inner layer but does not go all the way through the board is called a:
options:
- Through via
- *Blind via
- Buried via
- Castellated via
explanation: A blind via connects an outer layer to one or more inner layers without passing through the whole board. A buried via connects only inner layers (invisible from outside), and a through via spans the full stack. Blind/buried vias save routing space at higher fabrication cost.

---

type: mcq
topic: Panelization
difficulty: Basic
points: 4
image:
prompt: "Mouse bites" and V-scoring on a PCB panel are used to:
options:
- Improve the board's electrical grounding
- *Allow individual boards to be separated (depanelized) cleanly from the manufacturing panel after assembly
- Set the controlled impedance of edge traces
- Mark the polarity of components
explanation: Boards are fabricated and assembled in panels for handling. Mouse-bite tab routing and V-score lines create weakened separation lines so the finished boards can be snapped or cut apart cleanly afterward, without damaging the circuitry.

---

type: mcq
topic: Silkscreen
difficulty: Basic
points: 4
image:
prompt: The silkscreen layer on a PCB is primarily used for:
options:
- Carrying signal current between components
- *Printing component outlines, reference designators, polarity marks and labels on the board surface
- Providing the impedance reference plane
- Insulating the copper from solder
explanation: The silkscreen is printed ink (usually white) showing component outlines, reference designators, pin-1/polarity marks and other human-readable labels. It carries no electrical signal; insulation is the solder mask.

---

type: mcq
topic: Microstrip vs Stripline
difficulty: Moderate
points: 6
image:
prompt: What is the key difference between a microstrip and a stripline transmission line on a PCB?
options:
- Microstrip has no reference plane; stripline has two
- *Microstrip runs on an outer layer over a single reference plane (fields partly in air); stripline runs on an inner layer between two reference planes (fields fully in dielectric)
- They are identical; the names are interchangeable
- Stripline can only be used for power, microstrip only for signals
explanation: A microstrip is an outer-layer trace referenced to one plane below it, with some field in air; it is faster (lower effective dielectric constant) but radiates more and is exposed. A stripline is an inner-layer trace sandwiched between two planes, fully enclosed in dielectric — better shielded and lower EMI, but slower and requiring more layers.

---

type: mcq
topic: Ground Stitching Vias
difficulty: Moderate
points: 6
image:
prompt: Ground stitching vias placed along a board edge and around a signal that changes reference layers primarily:
options:
- Increase the board's mechanical stiffness
- *Tie the ground/reference planes together with a short, low-inductance path so return current can follow the signal across a layer transition, reducing loop area and EMI
- Reduce the DC resistance of the power rail
- Provide mounting points for the enclosure
explanation: When a high-speed signal changes reference layers, its return current needs a nearby low-impedance path between the planes. Stitching vias (or a stitching capacitor between a power and ground reference) provide that path, keeping the return current tight under the signal, shrinking the loop area and cutting radiated emissions and plane resonances.

---

type: mcq
topic: Decoupling Capacitor Placement
difficulty: Moderate
points: 6
image:
prompt: Two identical decoupling capacitors are placed near an IC power pin — one connects to the planes with two short, wide vias, the other with a single long, narrow via. At high frequency, which is more effective and why?
options:
- Neither differs, since both have the same capacitance
- The long-via one, because added inductance improves filtering
- *The short, wide-via one, because lower mounting-loop inductance keeps the capacitor low-impedance to higher frequencies
- The long-via one, because it places the cap closer to resonance
explanation: At high frequency a decoupling capacitor's usefulness is limited by the parasitic inductance of its mounting loop (pads + vias + traces), not just its capacitance. Short, wide, and doubled vias minimize that loop inductance, keeping the capacitor's impedance low out to higher frequencies where the IC needs fast transient current.

---

type: mcq
topic: Controlled Impedance
difficulty: Moderate
points: 6
image:
prompt: To raise the characteristic impedance of a microstrip trace (all else equal), you can:
options:
- Widen the trace
- *Narrow the trace or increase the dielectric height to the reference plane
- Increase the copper weight
- Add solder mask over the trace
explanation: Microstrip impedance rises as the trace gets narrower or as the dielectric height to the reference plane increases (less capacitance per unit length, relatively more inductance). Widening the trace or moving the plane closer lowers impedance. Copper weight and solder mask have only secondary effects.

---

type: mcq
topic: Teardrops
difficulty: Moderate
points: 6
image:
prompt: Adding "teardrops" where a trace meets a pad or via primarily improves:
options:
- The trace's controlled impedance
- *Mechanical/electrical robustness of the junction against drill misregistration and stress cracking, improving yield
- The silkscreen legibility
- The board's dielectric constant
explanation: A teardrop is a copper fillet that smoothly blends a trace into a pad or via, increasing the connection area. This tolerates slight drill misregistration and mechanical/thermal stress, reducing the chance of a cracked trace-to-pad junction and improving manufacturing yield.

---

type: mcq
topic: Crosstalk & the 3W Rule
difficulty: Difficult
points: 6
image: /Challenge/question-images/w37-pcb-3w-crosstalk.svg
prompt: The "3W rule" is a common guideline for reducing crosstalk between two parallel PCB traces. What does it state and why does it work?
options:
- Make every trace three times as wide as the design minimum to lower resistance
- *Keep center-to-center spacing of adjacent traces at least three times the trace width; greater separation sharply reduces the mutual capacitance/inductance and thus the coupled noise
- Use exactly three ground vias between any two signals
- Route all signals at 3-mil width regardless of impedance
explanation: The 3W rule keeps the center-to-center distance between two signal traces at least three times a single trace's width (roughly 2× edge-to-edge). Coupling between adjacent traces falls off rapidly with separation, so this spacing keeps mutual capacitance and inductance — and the resulting crosstalk — low (often cited as containing most of the coupled field). For very sensitive nets a grounded guard trace or more spacing is used.

---

type: mcq
topic: Guard Traces
difficulty: Difficult
points: 6
image: /Challenge/question-images/w37-pcb-guard-trace.svg
prompt: A sensitive low-level analog trace runs near a noisy digital line on the same layer. A grounded guard trace is placed between them. For the guard trace to be effective it must:
options:
- Be left floating so it doesn't add capacitance
- *Be tied to the reference plane with vias at frequent intervals along its length, giving coupled noise a low-impedance path to ground before it reaches the victim
- Be wider than both signal traces and carry current
- Be placed only at the two ends, not along the middle
explanation: A guard trace works only if it is a true low-impedance ground: it must be stitched to the reference plane with vias at close, regular intervals along its length. Then it intercepts the coupled field and shunts it to ground before it reaches the victim. A floating or end-only-grounded guard trace can actually make coupling worse by acting as a resonant coupler.

---

type: mcq
topic: Via-in-Pad
difficulty: Difficult
points: 6
image: /Challenge/question-images/w37-pcb-via-in-pad.svg
prompt: On a fine-pitch BGA, designers place vias directly in the component pads (via-in-pad). What manufacturing risk does an open via-in-pad create, and how is it addressed?
options:
- It increases trace impedance; the fix is wider traces
- *During reflow, solder can wick down the open via, starving the joint and creating voids/opens; the fix is to fill and cap/plate the via (filled via-in-pad) before assembly
- It has no effect and needs no special treatment
- It only affects silkscreen alignment
explanation: An unfilled via in a solder pad lets molten solder wick down the barrel during reflow, robbing the joint of solder and producing voids, weak joints, or opens. The standard solution is via-in-pad plated over (VIPPO): the via is filled (usually with conductive or non-conductive epoxy), then capped and plated flat so the pad presents a solid, solderable surface. This enables tight fan-out on fine-pitch BGAs at added fabrication cost.

---

type: mcq
topic: Return Path — Layer Change
difficulty: Difficult
points: 6
image:
prompt: A high-speed trace changes from one signal layer referenced to a ground plane, to another signal layer referenced to a power plane, with no stitching. What is the consequence?
options:
- Nothing — any plane serves as a return
- *The return current cannot flow directly between the two different reference planes, so it detours (through the nearest decoupling cap or plane capacitance), increasing loop inductance, ringing and radiated EMI
- The trace's DC resistance rises sharply
- The propagation delay drops to zero
explanation: Return current mirrors the signal on its adjacent reference plane. When the signal moves to a layer referenced to a DIFFERENT plane (ground → power), the return has no direct path between the two planes at that point and must detour through the nearest decoupling capacitor or the planes' mutual capacitance. That detour enlarges the current loop, raising inductance and producing ringing and radiated EMI. The fix is a stitching via (same-reference change) or a stitching capacitor between the two planes right at the transition, plus keeping high-speed nets referenced to a continuous ground plane.

---

type: mcq
topic: Stack-up Symmetry
difficulty: Difficult
points: 6
image:
prompt: A multilayer PCB stack-up uses uneven copper weights and dielectric thicknesses between its top and bottom halves. What manufacturing risk does this asymmetry mainly create?
options:
- Reduced controlled-impedance accuracy only
- *Warping or bowing of the finished board from unequal mechanical stress during lamination and cooling, causing coplanarity problems at assembly
- Increased trace-to-trace crosstalk only
- Reduced solder-mask adhesion
explanation: A symmetric (balanced) stack-up mirrors copper weights and dielectric thicknesses about the board's center so thermal and mechanical stresses balance during lamination and cooldown. An asymmetric stack-up shrinks/expands unevenly and is a classic cause of board warp/bow, which then creates coplanarity and solder-defect problems during SMT assembly. Designers keep the stack-up balanced (and add balancing copper where needed) even on layers that carry no signals.
