<!-- Rising Edge — Weekly Challenge bulk question template -->
<!-- Separate each question with a line containing only: --- -->
<!-- Mark correct option(s) with a leading * . Lines are "key: value". -->
<!-- type = mcq | multi | truefalse | numeric -->

type: mcq
topic: Reflections
difficulty: Intermediate
points: 10
image:
prompt: A transmission line is driven by a source with output impedance equal to the line's characteristic impedance, but the far end is left unterminated (open). What happens to a rising-edge wavefront when it reaches the open end?
options:
- It is absorbed completely and no reflection occurs
- *It reflects with the same polarity, roughly doubling the voltage at the open end
- It reflects with inverted polarity, driving the line toward 0 V
- It is converted into a common-mode signal only
explanation: An open termination presents a huge impedance mismatch (reflection coefficient near +1), so the incident wave reflects in phase with itself, doubling the voltage at the unterminated end before it travels back down the line.

---

type: mcq
topic: Crosstalk
difficulty: Intermediate
points: 10
image:
prompt: Near-end crosstalk (NEXT) on a coupled trace pair is primarily driven by which coupling mechanism, measured at the aggressor's driver end?
options:
- Only capacitive coupling, with inductive coupling canceling it out
- Only inductive coupling, with capacitive coupling canceling it out
- *The sum of capacitive and inductive coupling, which add constructively at the near end
- Radiative coupling through free space only, unrelated to trace geometry
explanation: At the near end, the capacitively-coupled and inductively-coupled crosstalk currents arrive in phase and add together, which is why NEXT is generally larger than far-end crosstalk (FEXT) for the same coupling length on many stack-ups.

---

type: mcq
topic: Differential Signaling
difficulty: Beginner
points: 10
image:
prompt: What is the main signal-integrity benefit of routing a differential pair with tight, consistent coupling along its entire length?
options:
- It eliminates the need for any termination
- It allows the pair to use half the trace width of a single-ended line
- *It maximizes common-mode noise rejection and keeps differential impedance consistent
- It removes the need for length matching between the two traces
explanation: Tight, consistent coupling keeps the differential impedance uniform (avoiding reflections from impedance steps) and ensures that any noise picked up equally by both traces cancels out as common-mode noise at the receiver — length matching is still required to control skew.

---

type: mcq
topic: Reference-Plane Integrity
difficulty: Advanced
points: 10
image:
prompt: A high-speed signal transitions from a layer referenced to ground (below it) to a layer referenced to power (below it), through a via placed 40 mm from the nearest power-to-ground stitching capacitor. What is the most likely signal-integrity consequence?
options:
- No consequence, since both planes are AC ground at high frequency
- Increased DC resistance in the signal path only
- *The return current must take a long detour to the stitching capacitor, increasing loop inductance and radiated emissions
- The signal's rise time will increase, improving EMI performance
explanation: The return current has to transfer from the ground plane to the power plane at the layer transition. Without a nearby low-impedance path (a stitching capacitor or via) between the two planes, it is forced into a large loop back to the distant stitching capacitor, increasing loop inductance, ringing, and radiated EMI — this is the same failure mode discussed in the DDR4 return-path scenario above.

---

type: mcq
topic: Termination
difficulty: Intermediate
points: 10
image:
prompt: Series (source) termination is typically placed near the driver and sized so that the driver output impedance plus the series resistor approximately equals the line's characteristic impedance. What signal behavior does this primarily prevent?
options:
- It prevents attenuation of the signal amplitude over long traces
- *It prevents reflections at the source from re-reflecting a wave that bounces back from the receiver
- It eliminates the need for a continuous reference plane
- It reduces the capacitance of the receiver's input pin
explanation: Series termination matches the driver's effective output impedance to the line, so any reflection coming back from an impedance discontinuity downstream is absorbed at the source instead of re-reflecting back down the line a second time.

---

type: mcq
topic: Eye Diagrams
difficulty: Beginner
points: 10
image:
prompt: On a serial-link eye diagram, a "closing" eye (reduced height and width compared to an ideal open eye) most directly indicates:
options:
- The link's DC resistance has increased
- *Reduced timing and voltage margin for the receiver to correctly sample each bit
- The board has failed a creepage and clearance check
- The connector has excessive contact resistance only
explanation: Eye closure is a direct visualization of accumulated jitter, noise, ISI (inter-symbol interference), and loss — all of which shrink the window in time and voltage where the receiver can reliably distinguish a 1 from a 0.

---

type: mcq
topic: Skew
difficulty: Intermediate
points: 10
image:
prompt: A differential pair has 15 ps of intra-pair skew (one trace routed longer than the other) on a link with very tight unit intervals. What is the primary risk this introduces?
options:
- It has no effect as long as both traces meet the impedance target
- *Skew converts part of the differential signal into common-mode noise, degrading EMI performance and reducing noise margin
- It only affects the DC bias point of the receiver
- It improves crosstalk immunity by desynchronizing the aggressor and victim edges
explanation: When the two legs of a differential pair arrive at slightly different times, the signal briefly stops being purely differential and develops a common-mode component — this both radiates more (since common-mode currents are a major EMI driver) and eats into the receiver's effective noise margin.

---

type: mcq
topic: Via Design
difficulty: Advanced
points: 10
image:
prompt: A high-speed signal via on a thick backplane has a long unused stub below the signal's exit layer. What is this stub's main effect on signal integrity, and what is the standard mitigation?
options:
- The stub adds resistive loss only; the mitigation is a wider trace
- *The stub acts as a resonant stub that causes signal degradation at frequencies related to its length; the mitigation is back-drilling to remove the unused portion
- The stub has no measurable effect below 10 Gbps
- The stub only matters for power vias, not signal vias
explanation: An unused via stub behaves like an open-ended transmission-line stub, creating a resonance that notches out energy at frequencies where the stub length is a quarter-wavelength (and odd multiples of it). Back-drilling mechanically removes the unused barrel, eliminating the resonance.

---

type: mcq
topic: Transmission Line Loss
difficulty: Advanced
points: 10
image:
prompt: As frequency increases into the multi-GHz range, which loss mechanism typically becomes the dominant contributor to attenuation on an FR-4 stripline, compared to conductor (skin-effect) loss?
options:
- Radiative loss into free space
- *Dielectric loss, driven by the laminate's loss tangent, which scales roughly linearly with frequency
- DC resistance of the copper trace
- Loss from the solder mask covering the trace
explanation: Conductor loss grows roughly with the square root of frequency (skin effect), while dielectric loss grows roughly linearly with frequency and the laminate's loss tangent — at high enough frequencies dielectric loss usually overtakes conductor loss as the dominant attenuation source, which is why low-loss-tangent laminates matter for multi-Gbps designs.

---

type: mcq
topic: Controlled Impedance
difficulty: Beginner
points: 10
image:
prompt: For a fixed dielectric material and a fixed distance to the reference plane, how does increasing trace width generally affect a single-ended trace's characteristic impedance?
options:
- Impedance increases as trace width increases
- Impedance is unaffected by trace width
- *Impedance decreases as trace width increases
- Impedance becomes undefined once width exceeds the dielectric height
explanation: Wider traces have more capacitance to the reference plane per unit length for a given dielectric height, and characteristic impedance is inversely related to that capacitance — so widening the trace (all else equal) lowers its characteristic impedance, which is why impedance-controlled traces are sized precisely against the stack-up.
