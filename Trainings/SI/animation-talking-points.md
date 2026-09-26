# Animation Talking Points — Signal Integrity Academy

All narration scripts used by the animation play buttons across the SI training modules.
Each entry is keyed by the canvas element ID rendered in the page.

---

## Module 01 — Fundamentals of Signal Integrity

### `slowEdgeCanvas` / `fastEdgeCanvas` — Slow Edge vs Fast Edge
A slow edge — one with a rise time of several nanoseconds — has its energy concentrated at low frequencies, well below 500 MHz. The signal behaves as a lumped circuit and trace length is irrelevant. Now watch what happens as we switch to a fast edge with a rise time under 200 picoseconds. The bandwidth now extends past 1.5 gigahertz, which means the wavelength of the signal's harmonics approaches the physical length of the trace. At that point, the trace stops being a wire and becomes a transmission line. Impedance, propagation delay, and reflections all become critical parameters.

### `idealWaveCanvas` / `realWaveCanvas` — Ideal vs Real Waveform
The ideal digital waveform has perfectly vertical edges, flat rails at logic high and low, and zero transition time. The real waveform tells a different story. Notice the finite rise and fall times driven by driver output impedance and load capacitance. The overshoot at the high rail is caused by inductive energy stored during the fast edge being released into the load. The ringing you see is a classic sign of an impedance mismatch — the signal reflecting between the driver and receiver, losing energy on each bounce until it settles.

### `overshootCanvas` — Overshoot
Overshoot occurs when a signal exceeds its intended logic-high voltage after a rising edge. This happens when the load impedance is higher than the characteristic impedance of the trace — a common case with unterminated CMOS receivers. The incident wave arrives at the high-impedance load and reflects with the same polarity, adding to the incident voltage. The result is a voltage spike that can exceed the absolute maximum input rating of the receiver, causing permanent damage or random bit errors. The fix is always termination — either at the source or at the load.

### `undershootCanvas` — Undershoot
Undershoot is the mirror image of overshoot — the signal drops below ground after a falling edge. This is again caused by impedance mismatch, but now the reflected wave drives the receiver input negative. In CMOS logic, forward-biasing the substrate protection diodes at the input can inject charge into the substrate and trigger latch-up, a potentially destructive condition. Undershoot greater than 300 millivolts below ground should be considered a design failure. Source termination eliminates undershoot by absorbing the first reflection at the driver before it reaches the receiver.

### `ringingCanvas` — Ringing
Ringing is the oscillatory behavior you see after a transition, caused by the signal bouncing multiple times between source and load impedances. Each bounce decays by the product of the reflection coefficients at both ends. The time between ring peaks equals twice the one-way propagation delay of the trace — so you can actually measure trace length from an oscilloscope. Ringing that persists beyond the receiver's setup time window causes setup violations and timing failures. Traces longer than one sixth of the signal's rise-time distance must be treated as transmission lines and properly terminated.

### `noiseCanvas` — Noise on Digital Signals
This waveform shows how external noise couples onto a signal trace. The three dominant mechanisms are: capacitive coupling from adjacent traces through mutual capacitance, inductive coupling through shared return paths and mutual inductance, and power supply noise from simultaneous switching events on the same power domain. Notice how noise appears as high-frequency spikes superimposed on the signal. If any noise spike causes the signal to cross the logic threshold during the receiver's aperture window, a bit error occurs. Increasing trace separation, adding a solid ground plane, and using differential signaling are the main defenses.

### `edgeWaveCanvas` / `edgeSpectrumCanvas` — Edge Rate and Frequency Content
The frequency spectrum of a digital signal is not a single frequency — it's a rich collection of harmonics extending up to approximately 0.35 divided by the rise time. A 100-picosecond edge generates significant energy up to 3.5 gigahertz. Each harmonic interacts independently with the physical transmission line. This is why signal integrity problems are strongly frequency-dependent, and why increasing data rates from one gigabit to ten gigabit per second doesn't just make existing problems ten times worse — it introduces entirely new failure modes related to dielectric loss, skin effect, and mode conversion.

### `waveformCanvas` — Waveform Anatomy
This annotated waveform shows the key measurements used in signal integrity verification. Rise time is measured from 20% to 80% of the voltage swing. Propagation delay is the time from the 50% crossing at the driver output to the 50% crossing at the receiver input. Overshoot is measured as a percentage above the nominal high rail. The settling time indicates how long ringing persists — this directly subtracts from your available timing margin. Understanding these measurements is the foundation of all SI analysis, from simple scope measurements to full IBIS simulation.

### `goodSignalCanvas` / `badSignalCanvas` — Good Signal vs Bad Signal
A good signal has fast, clean edges with minimal overshoot — typically less than 10% — settles quickly to a stable rail, and has well-defined timing margins at the receiver. A bad signal shows excessive overshoot that may exceed device absolute maximums, prolonged ringing that eats into setup and hold margins, and noise on the rails that reduces noise immunity. The difference between these two cases is usually not component selection — it's routing geometry, layer stackup, and termination strategy. All of these are under the PCB designer's control.

---

## Module 02 — Transmission Line Theory

### `s1Canvas` — Wave Propagation on a Transmission Line
Watch the electromagnetic wave propagate from left to right on the transmission line. Unlike a lumped circuit where voltage appears simultaneously everywhere, the signal on a transmission line travels at a finite velocity — approximately 60% of the speed of light on FR4, or about 6 inches per nanosecond. This propagation speed is determined by the dielectric constant of the substrate: velocity equals the speed of light divided by the square root of the relative permittivity. A 6-inch trace on FR4 introduces exactly one nanosecond of propagation delay — a critical budgeting parameter in high-speed designs.

### `s2Canvas` — Characteristic Impedance and the Telegrapher's Model
This animation shows the distributed circuit model of a transmission line — an infinite ladder network of series inductance and shunt capacitance per unit length. The characteristic impedance Z-zero is the square root of L over C, where L and C are the per-unit-length inductance and capacitance. For a microstrip over FR4 with a 50-ohm target, a trace width of approximately 90 mils on a 62-mil substrate gives Z-zero equal to 50 ohms. Changing the trace width, dielectric thickness, or board material all shift the impedance. The entire point of controlled impedance PCB fabrication is to maintain this L-to-C ratio within specification across the whole board.

### `s3Canvas` — Impedance Discontinuities
Every deviation from the characteristic impedance — a via, a connector pin, a stub, a trace width change — is a discontinuity. At each discontinuity, the signal partially transmits and partially reflects. The reflection coefficient Gamma equals Z-load minus Z-zero, divided by Z-load plus Z-zero. A perfect match gives Gamma equals zero — no reflection. An open circuit gives Gamma equals plus one — the full incident wave reflects back in phase. A short circuit gives Gamma equals minus one — the full wave reflects inverted. In practice, vias typically look like a shunt capacitance of 0.5 to 1 picofarad, causing localized impedance dips.

### `s4Canvas` — Time-Domain Reflectometry
TDR — Time-Domain Reflectometry — is the measurement technique shown here. A fast step edge is launched onto the line and the reflected waveforms are captured at the source. Positive reflections indicate high-impedance discontinuities: stubs, opens, and via anti-pads. Negative reflections indicate low-impedance discontinuities: shorts and excess capacitance from wide traces or pads. The time axis directly maps to physical distance — two inches from the discontinuity appears as a reflection 667 picoseconds after the launch, since the round trip covers four inches at 150 picoseconds per inch. TDR is the single most powerful diagnostic tool for transmission line analysis.

### `s5Canvas` — Insertion Loss and Dielectric Loss
At high frequencies, a transmission line is not lossless. Two dominant loss mechanisms degrade the signal as it travels. Conductor loss is proportional to the square root of frequency — it's caused by the skin effect concentrating current on the outer skin of the copper trace, increasing effective resistance. Dielectric loss is proportional to frequency itself — it's caused by energy absorbed by the rotating polar molecules in the FR4 substrate, quantified by the loss tangent. At 10 gigabits per second, a 12-inch trace on standard FR4 can introduce 15 to 20 decibels of insertion loss at Nyquist frequency — enough to completely close an eye diagram. Low-loss laminates like Megtron 6 or Rogers 4350B reduce this by two to five times.

### `s7Canvas` — Lattice Diagram
The lattice diagram is a graphical tool for tracing every reflection event on a transmission line over time. The vertical axis is time, the horizontal axis spans from driver to receiver. Each diagonal line represents a wave traveling at the propagation velocity. At each boundary, the wave splits: a transmitted component continues forward and a reflected component bounces back, each scaled by the appropriate transmission or reflection coefficient. The lattice diagram lets you manually calculate the voltage waveform at any point on the line at any time — an invaluable technique for understanding why double-termination eliminates all reflections, and how Thevenin termination achieves a specific initial launch amplitude.

### `s8aPcbCanvas` — PCB Signal Path Topology
This view shows the physical PCB signal path from driver IC to receiver IC. The copper trace — shown in yellow — is the transmission line with characteristic impedance Z-zero of 50 ohms. The driver has a source impedance Z-S, and the receiver presents a load impedance Z-L. When Z-L does not equal Z-zero, part of the incident wave reflects back toward the driver. If the driver source impedance also mismatches — as is common with CMOS drivers that have Z-S of 10 to 25 ohms — the reflected wave re-reflects off the source and returns to the load, creating the ringing pattern visible on the oscilloscope view. The red dot at the receiver indicates the severity of the load mismatch.

### `s8aCanvas` — Oscilloscope: Driver vs Receiver
Channel 1 in yellow shows the ideal driver output — a clean square wave with instantaneous edges. Channel 2 in green shows what the receiver actually sees. Notice the delay equal to the one-way propagation time, followed by the ringing waveform caused by multiple reflections. The dashed cyan line is the ideal delayed waveform — the difference between this and the green trace is the distortion caused entirely by impedance mismatch. Adjust the load impedance toward 50 ohms and watch the ringing disappear. This is exactly what a source termination resistor achieves: it makes the driver's effective source impedance match Z-zero, eliminating re-reflections after the first incident wave.

---

## Module 03 — Impedance Matching & Reflection Control

### `s1LatticeCanvas` — Lattice Diagram: Reflection Timing
This lattice diagram shows the complete sequence of reflections for the selected termination strategy. Read it top to bottom: time increases downward. Each zigzag line is a wave front propagating across the transmission line. The amplitude of each successive wave decays by the product of the load and source reflection coefficients. With source termination, Gamma-S equals zero, so the first reflection from the load is absorbed — no second reflection occurs. With parallel termination, Gamma-L equals zero, so the wave is absorbed at the receiver on the first pass. Understanding the lattice diagram is the key to choosing the right termination strategy for your topology.

### `s1Canvas` — Step Response: Termination Comparison
This simulation shows the time-domain step response at the receiver for different termination strategies. Unterminated is shown in red — the worst case, with massive ringing that takes many nanoseconds to settle. Source termination in cyan settles cleanly after one round trip but has a reduced initial amplitude. Parallel termination in green gives a clean monotonic step with no ringing but continuously draws DC current. Thevenin termination in amber biases the line at mid-rail and gives clean settling with both high and low pull capability. The correct choice depends on your topology, power budget, and receiver specifications.

### `s3bPcbCanvas` / `s3bScopeCanvas` — Source Termination: PCB Layout and Waveform
Source termination places a resistor in series with the driver output, chosen to bring the effective driver source impedance up to match the transmission line impedance. The series resistor is placed as close as possible to the driver pin — within 200 mils — to minimize the unterminated stub between the driver and resistor. On the oscilloscope view, Channel 1 shows the pre-termination waveform with heavy ringing. Channel 2 shows the post-termination result — a single clean transition with no reflections. The trade-off is a slight reduction in signal amplitude until the line charges to full swing, and a half-unit-interval eye penalty for multi-drop topologies.

### `s4bPcbCanvas` / `s4bScopeCanvas` — Parallel Termination: PCB Layout and Waveform
Parallel termination places the termination resistor directly at the receiver, in parallel with the load to the power supply reference. Because the termination impedance matches the line, the load reflection coefficient is zero — the wave is fully absorbed on the first pass. The oscilloscope shows a perfect step response with no overshoot. The cost is continuous DC current: a 50-ohm termination on a 3.3-volt signal draws 66 milliamps, 24 hours a day. For a 64-bit DDR bus, that's over four amps of termination current alone. This is why DDR4 uses On-Die Termination — the termination resistance is built into the DRAM die and powered only during active transfers.

### `s5Canvas` — AC Termination Frequency Response
AC termination uses a capacitor in series with the termination resistor. At DC and low frequencies, the capacitor blocks current — the static power consumption is near zero. At the signal frequency, the capacitive reactance drops and the termination becomes effective. This plot shows the impedance magnitude of the RC network across frequency. The knee frequency — where the termination becomes effective — is 1 divided by 2-pi times R times C. Choose C too small and high-frequency components terminate correctly but low-frequency content reflects. Choose C too large and you approach the power consumption of a simple parallel termination. The optimal value is typically 100 picofarads for signals above 500 megahertz.

### `s6bPcbCanvas` / `s6bScopeCanvas` — Thévenin Termination: PCB Layout and Waveform
Thévenin termination uses two resistors: one pulling to the supply, one pulling to ground. Their parallel combination equals Z-zero, creating a matched termination. Their ratio sets the bias voltage on the transmission line — typically chosen to be at the receiver's input switching threshold. This gives equal noise margins for both high and low transitions. The waveform shows excellent signal quality with clean monotonic transitions. The two-resistor network does consume DC power like parallel termination, but the current is split between the two rails. Thévenin termination is common on backplane buses and in situations where the driver output is not strong enough to swing the full voltage range unassisted.

### `s8PcbCanvas` / `s8ScopeCanvas` — Termination Comparison: Interactive PCB and Scope
This interactive view lets you compare all four termination strategies side-by-side. The PCB topology view shows where each termination element is placed relative to the driver and receiver. The scope view shows the resulting receiver waveform. Key metrics to compare: settling time (time from edge to within 10% of final value), overshoot percentage, and static power dissipation. Notice that the optimal strategy is topology-dependent: source termination is ideal for point-to-point, parallel is ideal for multi-drop buses where the driver is at one end, and Thévenin works well for bidirectional buses where either device can drive.

### `s8GammaPlot` — Reflection Coefficient vs Load Impedance
This plot shows how the reflection coefficient Gamma varies as a function of load impedance, for a fixed 50-ohm characteristic impedance. Read the curve from left to right. At Z-L equals zero (short circuit), Gamma is minus one — the entire incident wave reflects with inverted polarity. At Z-L equals 50 ohms (matched), Gamma is zero — no reflection. At very high Z-L approaching open circuit, Gamma approaches plus one — full reflection in phase. The current load impedance from your slider is shown as the red dot on the curve. Notice how Gamma changes rapidly near the matched condition but saturates toward plus or minus one for extreme mismatches. This is why impedance control within plus or minus 10 percent gives much better than 10 percent improvement in reflection performance.

---

## Module 04 — Crosstalk Analysis

### `s1ConceptCanvas` — Crosstalk Concept Visualization
When a digital signal transitions on the aggressor trace, its changing electric and magnetic fields couple energy into the adjacent victim trace. Two mechanisms act simultaneously: capacitive coupling through mutual capacitance injects a current proportional to the aggressor's rate of voltage change, creating a displacement current in both directions on the victim. Inductive coupling through mutual inductance injects a voltage proportional to the aggressor's rate of current change. These two mechanisms add together at the near end — the NEXT location — and partially cancel at the far end — the FEXT location. The sign of the cancellation determines whether FEXT is larger or smaller than NEXT for a given geometry.

### `s2EMCanvas` — Combined Coupling: NEXT and FEXT Formation
This animation separates the capacitive and inductive coupling contributions. The capacitive component creates a bipolar pulse that travels in both directions on the victim. The inductive component also creates a bipolar pulse, but with polarities arranged so that at the near end it adds to the capacitive component, and at the far end it subtracts. For a microstrip, NEXT typically dominates. For a stripline embedded between two reference planes, the inductive and capacitive components nearly cancel at the far end, making FEXT very small. This is one reason why critical signals in DDR and PCIe designs are routed in inner layers.

### `crossSectionCanvas` — Coupled Trace Cross-Section
This cross-section view shows the electric and magnetic field lines between two coupled microstrip traces. The electric field originates on the aggressor trace and terminates on the victim trace, the reference plane, and adjacent structures — this is the capacitive coupling path. The magnetic field loops around the aggressor current — the inductive coupling path. Both coupling mechanisms weaken with increased trace separation. The 3W rule — maintaining a center-to-center spacing of at least three times the trace width — keeps the mutual coupling coefficient below approximately 3 percent, which is acceptable for most designs. Tight spacing for length matching should never bring traces closer than 1W.

### `s3NextCanvas` / `s3NextPcbCanvas` — NEXT: Near-End Crosstalk
NEXT — Near-End Crosstalk — is the crosstalk voltage that appears at the near end of the victim, the same end where the aggressor signal originates. Since both the forward-traveling inductive and capacitive coupling terms add at the near end, NEXT is typically the larger of the two components. NEXT is measured in decibels — a NEXT of negative 20 dB means the victim sees 10% of the aggressor amplitude. In parallel bus architectures like DDR, NEXT between address and data lines is a critical specification because multiple aggressors can switch simultaneously, stacking their NEXT contributions on the victim.

### `s4FextCanvas` / `s4FextPcbCanvas` — FEXT: Far-End Crosstalk
FEXT — Far-End Crosstalk — appears at the far end of the victim, the opposite end from where the aggressor signal originates. Unlike NEXT, FEXT is a single-polarity pulse whose amplitude is proportional to coupling length and aggressor slew rate. FEXT is particularly problematic in high-speed serial links like PCIe because it arrives at the receiver at the same time as the intended data. There is no temporal separation to exploit. The FEXT coefficient for microstrip is dominated by inductive coupling and scales with the square of the coupling length, which is why PCIe layout guidelines strictly limit parallel run lengths between differential pairs.

### `xtkPcbCanvas` / `crosstalkCanvas` — Crosstalk Waveform on Victim
This waveform shows the total crosstalk voltage on the victim trace as measured at the far end. The pulse shape is the derivative of the aggressor waveform — faster edges generate larger crosstalk peaks for the same spacing. Peak FEXT amplitude equals the FEXT coefficient multiplied by the aggressor edge amplitude. For a 1-volt edge with a 5% FEXT coefficient, the victim sees a 50-millivolt pulse. In a system with 100-millivolt noise margin, this single aggressor already consumes half the budget. Real systems have dozens of parallel traces, which is why the total crosstalk budget must account for worst-case simultaneous switching of all aggressors.

### `s6GuardCanvas` — Guard Traces and Spacing Strategies
Guard traces are grounded traces routed between the aggressor and victim to reduce coupling. They work by intercepting the electric field lines — reducing capacitive coupling — and by providing a low-impedance return path that reduces mutual inductance. A guard trace must be connected to the reference plane at intervals of no more than one quarter wavelength at the highest frequency of concern. Unconnected guard traces can actually make crosstalk worse by acting as a floating conductor that re-radiates energy. The most effective spacing strategy remains the 3W rule — no guard trace needed if center-to-center spacing exceeds three trace widths.

### `calcSweepCanvas` — Crosstalk vs. Spacing Sweep
This sweep plots crosstalk coefficient as a function of trace separation for the geometry you've configured. Notice the rapid improvement as spacing increases from 1W to 3W — a factor of 3 improvement in coupling. Beyond 3W the improvement continues but at a diminishing rate. The curve flattens because at large separations, the electromagnetic coupling decays as the inverse square of distance. This is why design rules specify 3W rather than 5W or 10W — you get 90% of the benefit at 3W and the remaining improvement requires disproportionately more board area. Layer changes and orthogonal routing on adjacent layers can achieve similar isolation with tighter pitch.

---

## Module 05 — Return Path & Grounding

### `currentLoopCanvas` — Current Must Return
Every signal current must complete a circuit — and it always does, even when the return path is not explicitly designed. The question is where the return current flows. At DC and low frequencies, return current follows the path of least resistance: typically a meandering path through the ground plane. At high frequencies — above about 100 kilohertz — return current follows the path of least inductance, which means it concentrates directly beneath the signal trace on the reference plane. This is a fundamental result of electromagnetic field theory. When you route a signal over a continuous reference plane, the return current automatically mirrors the signal, minimizing loop inductance and radiated emissions.

### `returnFormationCanvas` — Return Current Distribution
This animation shows how the return current distribution narrows and concentrates as frequency increases. At 1 kilohertz, the current spreads broadly across the reference plane. At 100 megahertz, 90% of the return current flows within a width of approximately three times the dielectric thickness beneath the trace. At 1 gigahertz, the concentration is even tighter, and the return current density follows a Lorentzian profile centered under the trace. Disrupting this concentrated return path — by routing over a plane split, a slot, or a via anti-pad — forces the return current to detour, creating a large current loop that radiates EMI and couples noise to adjacent traces.

### `heatmapCanvas` — Return Current Density Heatmap
The heat map shows return current density in the reference plane beneath the signal trace. Red indicates high current density — directly beneath the trace. Blue indicates low density — the far field. This spatial distribution determines the effective loop inductance of the signal-return pair, which in turn controls the characteristic impedance, propagation delay, and radiation efficiency. A via transition from one layer to another disrupts this field distribution — the return current must find a path through the via field to the new reference plane. This is why via stitch capacitors are required at every layer transition for signals above 500 megahertz.

### `detourCanvas` — Return Current Detour at Split Plane
When the signal trace crosses a gap in the reference plane, the high-frequency return current cannot cross the gap directly. It must detour around the split, traveling through whatever conductive path is available — usually the long way around through DC decoupling capacitors or via stitching. This creates a current loop with an area proportional to the split width and the detour length. Loop area is the key parameter in EMI: radiated field intensity scales linearly with current and quadratically with frequency times loop area. A 100-mil split at 1 gigahertz radiates like an antenna with effective aperture proportional to that loop. The fix: never cross a plane split with a high-speed signal.

### `s3ErrorPcbCanvas` — Common Design Error: Signal Crossing a Split Plane
This is the most common and most costly signal integrity error on PCBs: a high-speed signal crossing a power or ground plane split. The via anti-pads from the power domain boundary create a slot in the reference plane. The return current for the signal must detour around this slot, creating a large inductive current loop. The resulting EMI can cause a board to fail FCC or CE radiated emissions testing even if all component and trace impedances are correct. In DDR4 memory systems, a single address signal crossing the VDD-VSS boundary on the reference plane can corrupt entire read transactions. Design rule checks must flag all such crossings.

### `splitPlaneCanvas` — Plane Split Width Effect on EMI
Drag the split width slider and observe how the detour loop area — and therefore the EMI potential — scales with the gap. Even a 50-mil split creates a measurable increase in return path inductance. The EMI risk indicator changes from green to amber to red as the gap widens or signal frequency increases, because EMI power scales as frequency squared times loop area squared. In practice, splits in reference planes should never occur beneath high-speed signal layers. If power domain boundaries are unavoidable, bridge them with stitching capacitors — 100 nanofarad in parallel with 1 nanofarad — placed within 50 mils of every signal crossing point.

### `s4StitchPcbCanvas` — Stitching Capacitors
Stitching capacitors provide a local AC return path across a DC power domain boundary. At DC, the capacitor is an open circuit — the two power domains remain separated. At high frequencies, the capacitive reactance drops and the capacitor becomes a low-impedance connection for the return current, allowing it to cross the boundary near the signal crossing rather than detour the entire plane. For a 1-nanofarad capacitor to provide a return path at 500 megahertz, its impedance is 1 divided by 2-pi times 500 megahertz times 1 nanofarad, which equals approximately 0.32 ohms — well below the milliohm-level impedance target. Place one 100-nanofarad and one 1-nanofarad capacitor within 50 mils of each signal via transition.

### `xcPlotCanvas` — Capacitive Reactance vs Frequency
This plot shows the impedance of different decoupling capacitor values as a function of frequency. Each curve shows three regions: at low frequencies, the curve slopes downward — this is the capacitive regime where impedance decreases with frequency. At the self-resonant frequency, impedance reaches its minimum — this is where the capacitor provides maximum decoupling effectiveness. Above self-resonance, the parasitic lead inductance dominates and impedance increases with frequency. The self-resonant frequency of a 100-nanofarad 0402 capacitor is approximately 50 megahertz. Above that frequency, use a 1-nanofarad 0201 capacitor for better high-frequency decoupling.

---

## Module 06 — Power Integrity

### `s1PcbCanvas` / `s1ScopeCanvas` — PDN Noise: Source to Die
This animation shows the complete power delivery network from voltage regulator to silicon die. At the moment of a switching event — such as a DDR burst write — the die demands a pulse of current in tens of picoseconds. The VRM cannot respond this fast — it has a bandwidth of only a few hundred kilohertz. The decoupling capacitors on the board and package bridge the gap, providing instantaneous charge while the VRM ramps up. The oscilloscope shows the resulting PDN noise: an initial dip as local capacitors are depleted, followed by resonances as energy sloshes between inductors and capacitors in the PDN ladder network.

### `s2PcbCanvas` / `s2ScopeCanvas` — Target Impedance and PDN Design
The goal of PDN design is to keep the impedance from die to VRM below a target value across all frequencies. Target impedance equals the allowable voltage ripple divided by the maximum current step. For a 3.3-volt supply with 5% ripple tolerance and a 2-amp transient, the target impedance is 3.3 times 0.05 divided by 2, which equals 82 milliohms. The scope shows VDD ripple before and after adding proper decoupling. The impedance must be maintained flat — this is the target impedance profile — from DC to the maximum frequency of the current transient, which is approximately 0.35 divided by the current rise time.

### `s3DiagCanvas` / `s3ScopeCanvas` — Anti-Resonance in PDN
Anti-resonance is a peak in PDN impedance that occurs when adjacent decoupling capacitor values interact. Between two capacitor decades, their inductances create a parallel resonance — an impedance peak instead of a valley. At the anti-resonant frequency, the PDN impedance can be 10 to 100 times higher than at adjacent frequencies, causing severe supply noise at exactly those frequencies. The standard mitigation is to use a hierarchical decoupling strategy: bulk capacitors for the VRM bandwidth, mid-frequency ceramics for board-level resonances, and package capacitors for frequencies above 100 megahertz — each sized and placed to fill the gaps left by the previous stage.

### `s4DiagCanvas` / `s4ScopeCanvas` — Simultaneous Switching Noise (SSN)
Simultaneous Switching Noise — also called SSO or ground bounce — occurs when multiple output drivers switch at the same time, sharing a common package inductance. The transient current di-dt flows through the package lead inductance, inducing a voltage Ldi/dt on the supply rail. For 64 bits switching simultaneously with 1-nanosecond rise times, 20-milliamp per bit, the total di/dt is over 1 ampere per nanosecond. Through a 1-nanohenry package lead, this creates 1 volt of ground bounce — enough to cause false switching on adjacent non-switching pins. This is why modern high-speed packages have hundreds of VDD and VSS pins: to divide the shared inductance by the number of parallel paths.

### `s5ScopeACanvas` / `s5ScopeBCanvas` — Decoupling Strategy: Before and After
Channel A shows the PDN noise waveform without proper decoupling — large voltage spikes coincident with data transitions, settling slowly. Channel B shows the same switching activity after implementing a hierarchical decoupling strategy with values spanning six decades from 100 microfarads to 100 picofarads. The peak noise is reduced by more than 10 dB and settling is ten times faster. Notice that simply adding more of the same capacitor value has diminishing returns — the benefit plateaus because all capacitors have the same self-resonant frequency. Effective PDN design requires distributed values, not more bulk capacitance.

---

## Module 07 — Differential Signaling

### `s1ScopeACanvas` / `s1ScopeBCanvas` — Differential vs Single-Ended Noise Rejection
This comparison shows the same signal route in single-ended and differential configurations, subjected to the same common-mode noise source. The single-ended signal on scope A shows the noise clearly superimposed on the data. The differential pair on scope B: observe that the noise appears identically on both the positive and negative conductors — it is common-mode. At the receiver, the differential amplifier subtracts the two signals, canceling the common-mode noise entirely. The data — which is differential-mode — adds in the subtraction. This is the fundamental advantage of differential signaling: CMRR — Common Mode Rejection Ratio — of 60 to 80 dB means the receiver rejects millivolts of noise while responding to hundreds of millivolts of differential signal.

### `s2CrossCanvas` / `s2ScopeCanvas` — Differential Pair Routing and Skew
This cross-section shows a tightly coupled differential pair. When the two conductors are routed symmetrically with equal width, equal spacing, and identical length, any environmental perturbation — coupling from adjacent traces, via transitions, bends — affects both conductors equally, maintaining common-mode rejection. When lengths differ — called skew — the delayed conductor causes one side of the differential pair to arrive later. The receiver sees a distorted differential waveform: instead of the clean transition from plus to minus amplitude, the edge is smeared over the skew time. For USB 3.2 at 10 gigabits per second with a 100-picosecond unit interval, skew must be held below 10 picoseconds — roughly 60 mils of length mismatch on FR4.

---

## Module 08 — High-Speed Interface Design

### `s3DiagCanvas` / `s3ScopeCanvas` — SerDes Link Budget Analysis
High-speed serial links use a channel loss budget to ensure reliable communication. The total insertion loss from transmitter to receiver must remain within the receiver's sensitivity specification. For PCIe Gen 4 at 16 gigatransfers per second, the channel loss limit is 28 dB. This budget is consumed by trace loss, connector insertion loss, via loss, and package loss. The scope view shows the received eye diagram before and after equalizer training. The transmitter de-emphasis pre-shapes the signal — boosting high frequencies that the lossy channel will attenuate — while the receiver's CTLE and DFE equalizers reconstruct the open eye from the closed, distorted waveform at the wire.

---

## Module 09 — Eye Diagram Analysis

### `eyeCanvas` — Eye Diagram Construction
An eye diagram is constructed by overlaying thousands of bit transitions — all time-aligned to the bit clock edge — in a single persistence display. Each pass through the display traces one unit interval of data. The result is a characteristic eye shape: open in the center where bits are stable, closed at the edges where transitions occur. The height of the eye opening is the voltage margin — how much noise can be added before a bit error occurs. The width is the timing margin — how much jitter can accumulate before the sampling instant falls outside the valid data region. Both measurements directly predict the bit error rate of the link.

### `eyeDashCanvas` — Eye Mask and Compliance Testing
The eye mask is a shaded region in the center of the eye diagram that the waveform must never enter. If any transition trajectory intersects the mask, the device fails compliance testing. The mask dimensions are specified in the interface standard — for PCIe Gen 3, the inner mask is 75 millivolts high and 0.175 unit intervals wide. Mask testing is the pass-fail criterion for all high-speed link validation. The key contributions to mask violations are random jitter — Gaussian distributed, caused by thermal noise — and deterministic jitter — bounded, caused by ISI, crosstalk, and power supply noise. The bathtub curve plot separates these components and allows extrapolation of BER at the target clock recovery sampling point.

---

## SI Demo — Signal Integrity in 5 Minutes

### `demoReflCanvas` — Impedance Mismatch: Reflection Waveform
This animated waveform shows what happens when a signal encounters a load impedance that doesn't match the transmission line's 50-ohm characteristic impedance. The cyan wave is the incident signal traveling toward the load. The red wave is the reflected component traveling back toward the source. The reflection coefficient Gamma shown at the top right tells you the fraction of voltage that reflects: zero means perfect match, plus one means full reflection at an open load, minus one means full reflection with inversion at a short circuit. Select the open load condition and notice how the reflected wave equals the incident wave — this is why unterminated CMOS inputs see double the driver's launch amplitude.

### `demoEyeCanvas` — DDR4 Eye Diagram — Channel Loss Effect
This live eye diagram shows how increasing channel insertion loss progressively closes the eye opening. At low loss — 4 dB — the eye is wide open with clear voltage and timing margins. As loss increases to 12 dB, the eye height shrinks due to frequency-dependent attenuation of the signal harmonics, and the eye width narrows as inter-symbol interference distorts the transition timing. Above 15 dB of loss, the eye closes completely — the receiver can no longer distinguish logic high from logic low without equalization. This is the fundamental challenge of DDR5 at 4800 megatransfers per second and PCIe Gen 5 at 32 gigatransfers per second: channel loss budgets are extremely tight and equalization is mandatory.

### `demoPlaneCanvas` — PCB Return Current and Plane Split
This interactive PCB view demonstrates return current behavior around a ground plane split. In the top view, watch the animated current flow arrows — cyan lines representing the return current path. When the reference plane is continuous, return current flows directly beneath the signal trace in a tight, low-inductance path. As you widen the split, the return current must detour around the gap, dramatically increasing the current loop area. This loop radiates electromagnetic energy as an antenna. The EMI risk indicator turns red when the split width and signal frequency combine to create a loop large enough to cause potential emissions compliance failures. The coupling percentage shows how much energy from the signal path couples into adjacent structures through the enlarged return path loop.

---

## Calculators

### `crosstalkCanvas` (calc-crosstalk.html) — Crosstalk Estimator Victim Waveform
The victim waveform shows the calculated crosstalk noise induced on the victim trace by the aggressor switching event you've configured. The waveform shape is the derivative of the aggressor edge — faster rise times produce taller, narrower crosstalk pulses for the same coupling geometry. The peak amplitude equals the FEXT or NEXT coefficient multiplied by the aggressor swing. Observe how increasing trace spacing from 1W to 3W dramatically reduces the peak noise, while increasing coupling length increases both the peak amplitude and the pulse width. The timing of the peak — aligned with the far end of the coupled region for FEXT, or coincident with the aggressor transition for NEXT — is a key diagnostic signature for identifying crosstalk in oscilloscope measurements.

### `eyeMainCanvas` / `eyeDashCanvas` (calc-eye.html) — Interactive Eye Diagram Calculator
This eye diagram calculator lets you control the signal parameters that determine eye quality. Jitter — shown as horizontal scatter at the crossing points — compresses the eye width. Random noise — shown as vertical spread on the rails — reduces eye height. ISI — inter-symbol interference — caused by bandwidth-limited channels creates pattern-dependent timing variations that close the eye asymmetrically. The bathtub curve in the lower panel plots BER as a function of the sampling offset from the ideal center of the eye. The flat region in the center is the timing margin — the window within which the receiver can sample without incurring bit errors at the target BER of 10 to the minus 15.

### `jitterHistCanvas` (calc-eye.html) — Jitter Histogram
The jitter histogram shows the statistical distribution of edge positions relative to the ideal clock. Random jitter has a Gaussian distribution — theoretically unbounded, which is why its contribution to BER is extrapolated using Q-factor analysis. Deterministic jitter has a bounded, non-Gaussian distribution — often bimodal, with peaks corresponding to the worst-case pattern dependencies. The total jitter at a given BER is the sum: DJ plus N times sigma-RJ, where N is determined by the target BER. For BER 10 to the minus 12, N is approximately 14. This is why jitter decomposition into random and deterministic components is essential — you cannot extrapolate BER from total jitter alone.

### `bathtubCanvas` (calc-eye.html) — Bathtub Curve
The bathtub curve is the key deliverable of jitter analysis for serial link compliance. It plots the probability of a bit error as a function of sampling offset from the ideal bit center. The two sides of the curve correspond to early and late sampling. The minimum BER — at the center of the curve — is the achievable bit error rate for the link. The curve is U-shaped like a bathtub: high BER at the edges where sampling falls outside valid data, dropping to the noise floor at the center. Compliance specifications define a required eye opening at a specific BER — typically 10 to the minus 12 — and the bathtub curve must show this opening is met. Systems that pass mask testing can still fail bathtub analysis if random jitter is too high.

---

## Capstone — DDR4 SI Verification

### `p3TopoCanvas` / `p3ReflCanvas` — DDR4 Fly-By Topology and Reflections
DDR4 uses a fly-by topology for the command and address bus: a single trace daisy-chains past each DRAM device without branching. This topology avoids the stub reflections of the T-topology used in DDR3, but it creates skew between the first and last devices in the chain — the command signal arrives at different times along the chain. This skew is compensated by write leveling: each DRAM device independently adjusts its DQS sampling phase to align with when the command signal arrives at its location. The reflection plot shows how the fly-by stub at each DRAM's ball is minimized by keeping the breakout trace as short as possible — less than 200 mils for DDR4 at 2400 megatransfers per second.

### `p4StackCanvas` / `p4ImpCanvas` — DDR4 Stackup and Impedance
The DDR4 stackup must balance multiple competing requirements: differential impedance of 100 ohms for the DQS pairs, single-ended impedance of 40 ohms for the data lines, tight dielectric control for impedance repeatability, and sufficient copper weight for current capacity on the power planes. This simulation shows the field distribution around the microstrip and stripline geometries in your configured stackup. The impedance profile across the operating frequency range must remain within plus or minus 10 percent of the target — achievable with 0.5-ounce copper, 3.8 dielectric constant, and tight laminate thickness control. Out-of-tolerance impedance directly degrades the DDR4 eye mask margin.

### `p6WaveCanvas` / `p6XtalkCanvas` — DDR4 Crosstalk Analysis
DDR4 memory interfaces have one of the most challenging crosstalk environments in PCB design: 64 data lines, 8 DQS differential pairs, and 17 address lines all switching simultaneously at 2400 megatransfers per second and above. The waveform plot shows the victim data line waveform with simulated crosstalk from adjacent aggressors in a worst-case simultaneous switching pattern. The crosstalk plot shows NEXT and FEXT contributions as a function of trace pair spacing. DDR4 design guidelines require a minimum of 4W spacing between byte lanes and 3W within a byte lane to keep crosstalk within the 50-millivolt noise budget allocated in the DDR4 specification.

### `p8EyeCanvas` / `p8MarginCanvas` — DDR4 Eye Diagram and Margin Summary
This is the final system-level eye diagram for the DDR4 interface you've designed — the engineering sign-off deliverable. The eye must clear the DDR4-2400 voltage eye mask: minimum 120 millivolts of eye height and minimum 0.3 unit intervals of eye width at the target BER. The margin summary panel breaks down the budget: lane-to-lane skew contribution, ISI from channel insertion loss, crosstalk from adjacent lanes, and jitter from the clock distribution. Green indicates margin positive, amber indicates less than 20% margin remaining — a warning to review the design, red indicates mask violation requiring redesign. All margins positive at sign-off means first-pass silicon success.
