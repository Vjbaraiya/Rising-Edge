/* animation-narrations.js
 * Talking-point narrations for every SI Academy animation canvas.
 * Keys are canvas element IDs. Values are the spoken narration strings.
 * Loaded before animation-player.js on every training page.
 */
var SI_NARRATIONS = {
  /* ── Module 01: Fundamentals ── */
  slowEdgeCanvas:
    'A slow edge — one with a rise time of several nanoseconds — has its energy concentrated at low frequencies, well below 500 megahertz. The signal behaves as a lumped circuit and trace length is irrelevant. Now watch what happens as we switch to a fast edge with a rise time under 200 picoseconds. The bandwidth now extends past 1.5 gigahertz, which means the wavelength of the signal harmonics approaches the physical length of the trace. At that point, the trace stops being a wire and becomes a transmission line. Impedance, propagation delay, and reflections all become critical parameters.',
  fastEdgeCanvas:
    'The fast edge has a rise time under 200 picoseconds, placing its significant frequency content well above 1.5 gigahertz. At these frequencies the trace length is comparable to the signal wavelength, and transmission line effects dominate. Every trace becomes a controlled-impedance element, every via a discontinuity, and every routing decision impacts signal quality.',

  idealWaveCanvas:
    'The ideal digital waveform has perfectly vertical edges, flat rails at logic high and low, and zero transition time. The real waveform tells a different story. Notice the finite rise and fall times driven by driver output impedance and load capacitance. The overshoot at the high rail is caused by inductive energy stored during the fast edge being released into the load. The ringing you see is a classic sign of an impedance mismatch — the signal reflecting between the driver and receiver, losing energy on each bounce until it settles.',
  realWaveCanvas:
    'This is what a real waveform looks like at the receiver end of an unterminated trace. Compare it to the ideal — the overshoot, undershoot, and ringing are all caused by impedance mismatch. The difference between ideal and real is your design challenge in every high-speed layout.',

  overshootCanvas:
    'Overshoot occurs when a signal exceeds its intended logic-high voltage after a rising edge. This happens when the load impedance is higher than the characteristic impedance of the trace — a common case with unterminated CMOS receivers. The incident wave arrives at the high-impedance load and reflects with the same polarity, adding to the incident voltage. The result is a voltage spike that can exceed the absolute maximum input rating of the receiver, causing permanent damage or random bit errors. The fix is always termination — either at the source or at the load.',
  undershootCanvas:
    'Undershoot is the mirror image of overshoot — the signal drops below ground after a falling edge. This is again caused by impedance mismatch, but now the reflected wave drives the receiver input negative. In CMOS logic, forward-biasing the substrate protection diodes at the input can inject charge into the substrate and trigger latch-up, a potentially destructive condition. Undershoot greater than 300 millivolts below ground should be considered a design failure. Source termination eliminates undershoot by absorbing the first reflection at the driver before it reaches the receiver.',
  ringingCanvas:
    "Ringing is the oscillatory behavior you see after a transition, caused by the signal bouncing multiple times between source and load impedances. Each bounce decays by the product of the reflection coefficients at both ends. The time between ring peaks equals twice the one-way propagation delay of the trace — so you can actually measure trace length from an oscilloscope. Ringing that persists beyond the receiver's setup time window causes setup violations and timing failures. Traces longer than one-sixth of the signal's rise-time distance must be treated as transmission lines and properly terminated.",
  noiseCanvas:
    "This waveform shows how external noise couples onto a signal trace. The three dominant mechanisms are: capacitive coupling from adjacent traces through mutual capacitance, inductive coupling through shared return paths and mutual inductance, and power supply noise from simultaneous switching events. Notice how noise appears as high-frequency spikes superimposed on the signal. If any spike causes the signal to cross the logic threshold during the receiver's aperture window, a bit error occurs. Increasing trace separation, adding a solid ground plane, and using differential signaling are the main defenses.",
  crosstalkCanvas:
    "Crosstalk is the unwanted coupling of energy from an aggressor signal onto a victim trace. Even a small percentage of the aggressor amplitude appearing on the victim — just 50 millivolts on a 1-volt swing — can corrupt a bit if the victim is near its switching threshold. The coupling is proportional to trace spacing, coupling length, and the aggressor's slew rate. This is an introductory visualization — Module 04 covers crosstalk analysis in full depth.",

  edgeWaveCanvas:
    'The frequency spectrum of a digital signal extends up to approximately 0.35 divided by the rise time. A 100-picosecond edge generates significant energy up to 3.5 gigahertz. Each harmonic interacts independently with the physical transmission line, which is why signal integrity problems are strongly frequency-dependent.',
  edgeSpectrumCanvas:
    'This frequency spectrum plot shows the harmonic content of the digital edge. The envelope rolls off at 20 dB per decade until the rise time corner frequency, then at 40 dB per decade. Everything above the corner frequency is where transmission line effects dominate. Increasing data rates shifts this corner up, introducing new failure modes from dielectric loss, skin effect, and mode conversion.',
  waveformCanvas:
    'This annotated waveform shows the key measurements used in signal integrity verification: rise time from 20 to 80 percent of swing, propagation delay to the 50-percent crossing, overshoot as a percentage above the high rail, and settling time. Understanding these measurements is the foundation of all SI analysis.',

  goodSignalCanvas:
    'A good signal has fast, clean edges with minimal overshoot — typically less than 10 percent — settles quickly to a stable rail, and has well-defined timing margins at the receiver.',
  badSignalCanvas:
    "A bad signal shows excessive overshoot that may exceed device absolute maximums, prolonged ringing that eats into setup and hold margins, and noise on the rails that reduces noise immunity. The difference between these two cases is routing geometry, layer stackup, and termination strategy — all under the designer's control.",

  /* ── Module 02: Transmission Lines ── */
  s1Canvas:
    'Watch the electromagnetic wave propagate from left to right on the transmission line. Unlike a lumped circuit where voltage appears simultaneously everywhere, the signal on a transmission line travels at a finite velocity — approximately 60 percent of the speed of light on FR4, or about 6 inches per nanosecond. This propagation speed is determined by the dielectric constant of the substrate: velocity equals the speed of light divided by the square root of the relative permittivity. A 6-inch trace on FR4 introduces exactly one nanosecond of propagation delay — a critical budgeting parameter in high-speed designs.',
  s2Canvas:
    'This animation shows the distributed circuit model of a transmission line — an infinite ladder network of series inductance and shunt capacitance per unit length. The characteristic impedance Z-zero is the square root of L over C. For a microstrip over FR4 with a 50-ohm target, a trace width of approximately 90 mils on a 62-mil substrate achieves Z-zero of 50 ohms. Changing trace width, dielectric thickness, or board material all shift the impedance.',
  s3Canvas:
    'Every deviation from the characteristic impedance — a via, a connector pin, a stub, a trace width change — is a discontinuity. At each discontinuity, the signal partially transmits and partially reflects. The reflection coefficient Gamma equals Z-load minus Z-zero, divided by Z-load plus Z-zero. A perfect match gives Gamma equals zero. An open circuit gives Gamma equals plus one. A short circuit gives Gamma equals minus one.',
  s4Canvas:
    'TDR — Time-Domain Reflectometry — launches a fast step edge onto the line and captures reflected waveforms at the source. Positive reflections indicate high-impedance discontinuities: stubs, opens, via anti-pads. Negative reflections indicate low-impedance discontinuities: shorts and excess capacitance. The time axis directly maps to physical distance — the round trip at 150 picoseconds per inch lets you locate discontinuities precisely. TDR is the most powerful diagnostic tool for transmission line analysis.',
  s5Canvas:
    'At high frequencies a transmission line is not lossless. Two dominant loss mechanisms degrade the signal. Conductor loss is proportional to the square root of frequency — caused by the skin effect. Dielectric loss is proportional to frequency itself — caused by energy absorbed by the FR4 substrate. At 10 gigabits per second, a 12-inch trace on standard FR4 can introduce 15 to 20 decibels of insertion loss at Nyquist frequency — enough to completely close an eye diagram without equalization.',
  s7Canvas:
    'The lattice diagram is a graphical tool for tracing every reflection event on a transmission line over time. The vertical axis is time, the horizontal axis spans from driver to receiver. Each diagonal line is a wave traveling at the propagation velocity. At each boundary the wave splits into transmitted and reflected components, each scaled by the appropriate reflection coefficient. The lattice diagram lets you manually calculate the voltage at any point on the line at any time.',
  s8aPcbCanvas:
    'This view shows the physical PCB signal path from driver IC to receiver IC. The trace is the transmission line with characteristic impedance Z-zero of 50 ohms. The driver has source impedance Z-S, and the receiver presents load impedance Z-L. When Z-L does not equal Z-zero, part of the incident wave reflects back toward the driver. If the driver source impedance also mismatches — common with CMOS drivers at 10 to 25 ohms — the reflected wave re-reflects, creating the ringing pattern visible on the oscilloscope view.',
  s8aCanvas:
    'Channel 1 in yellow shows the ideal driver output — a clean square wave. Channel 2 in green shows what the receiver actually sees: the propagation delay followed by ringing caused by multiple reflections. The dashed cyan line is the ideal delayed waveform — the difference from the green trace is distortion caused entirely by impedance mismatch. Adjust the load impedance toward 50 ohms and watch the ringing disappear.',

  /* ── Module 03: Impedance Matching ── */
  s1LatticeCanvas:
    'This lattice diagram shows the complete sequence of reflections for the selected termination strategy. Read it top to bottom — time increases downward. Each zigzag line is a wave front propagating across the transmission line. The amplitude of each successive wave decays by the product of the load and source reflection coefficients. With source termination, Gamma-S equals zero, so the first reflection from the load is absorbed — no second reflection occurs.',
  s3bPcbCanvas:
    'Source termination places a resistor in series with the driver output, chosen to bring the effective driver source impedance up to match Z-zero. The series resistor is placed as close as possible to the driver pin — within 200 mils — to minimize the unterminated stub between the driver and resistor.',
  s3bScopeCanvas:
    "Channel 1 shows the pre-termination waveform with heavy ringing. Channel 2 shows the post-termination result — a single clean transition with no reflections. Source termination achieves this by making the driver's effective source impedance match Z-zero, eliminating re-reflections after the first incident wave.",
  s4bPcbCanvas:
    "Parallel termination places the termination resistor directly at the receiver. Because the termination impedance matches the line, the load reflection coefficient is zero — the wave is fully absorbed on the first pass. The cost is continuous DC current: a 50-ohm termination on a 3.3-volt signal draws 66 milliamps continuously. For a 64-bit DDR bus that's over four amps of termination current alone.",
  s4bScopeCanvas:
    'The oscilloscope shows a perfect step response with no overshoot. This is the ideal receiver waveform — clean monotonic transition, no reflections, maximum timing margin. Parallel termination achieves this at the cost of static power dissipation.',
  s6bPcbCanvas:
    "Thévenin termination uses two resistors: one pulling to the supply, one pulling to ground. Their parallel combination equals Z-zero, creating a matched termination. Their ratio sets the bias voltage on the line — typically chosen to be at the receiver's input switching threshold, giving equal noise margins for both high and low transitions.",
  s6bScopeCanvas:
    'The Thévenin-terminated waveform shows excellent signal quality with clean monotonic transitions and no reflections. The two-resistor network does consume DC power, but the current is split between the two rails. This termination is common on backplane buses and bidirectional interfaces.',
  s8PcbCanvas:
    'This interactive PCB topology view shows where each termination element is placed relative to the driver and receiver. Compare all four strategies: source termination at the driver, parallel at the receiver, AC capacitor-series at the receiver, and Thévenin two-resistor at the receiver. The optimal choice is topology-dependent.',
  s8ScopeCanvas:
    'Compare the receiver waveforms for all four termination strategies. Key metrics: settling time from edge to within 10 percent of final value, overshoot percentage, and static power dissipation. Source termination is ideal for point-to-point, parallel is ideal for multi-drop buses, and Thévenin works well for bidirectional buses.',
  s8GammaPlot:
    'This plot shows how the reflection coefficient Gamma varies as a function of load impedance for a fixed 50-ohm transmission line. At Z-L equals zero — short circuit — Gamma is minus one. At Z-L equals 50 ohms — matched — Gamma is zero. At very high Z-L approaching open circuit, Gamma approaches plus one. The current load impedance from your slider is shown as the red dot. Notice how Gamma changes rapidly near the matched condition, which is why impedance control within plus or minus 10 percent gives much better than 10 percent improvement in reflection performance.',

  /* ── Module 04: Crosstalk ── */
  s1ConceptCanvas:
    "When a digital signal transitions on the aggressor trace, its changing electric and magnetic fields couple energy into the adjacent victim trace. Two mechanisms act simultaneously: capacitive coupling through mutual capacitance injects a displacement current in both directions on the victim. Inductive coupling through mutual inductance injects a voltage proportional to the aggressor's rate of current change. These two mechanisms add together at the near end — NEXT — and partially cancel at the far end — FEXT.",
  s2EMCanvas:
    'This animation separates the capacitive and inductive coupling contributions. The capacitive component creates a bipolar pulse traveling in both directions on the victim. The inductive component also creates a bipolar pulse, but with polarities arranged so that at the near end it adds to the capacitive component, and at the far end it subtracts. For stripline embedded between two reference planes, these components nearly cancel at the far end, making FEXT very small — which is why critical signals are routed in inner layers.',
  crossSectionCanvas:
    'This cross-section shows the electric and magnetic field lines between two coupled microstrip traces. The electric field — capacitive coupling — and magnetic field loops — inductive coupling — both weaken with increased trace separation. The 3W rule — maintaining center-to-center spacing of at least three times the trace width — keeps the mutual coupling coefficient below approximately 3 percent, acceptable for most designs.',
  s3NextCanvas:
    'NEXT — Near-End Crosstalk — appears at the near end of the victim, the same end where the aggressor signal originates. Since both the forward-traveling inductive and capacitive coupling terms add at the near end, NEXT is typically the larger of the two components. In parallel bus architectures like DDR, multiple aggressors switching simultaneously stack their NEXT contributions on the victim.',
  s3NextPcbCanvas:
    'The PCB layout view shows the aggressor and victim trace routing with the measurement point at the near end. Key design parameter visible here: the parallel coupling length. NEXT power scales with coupling length and the square of the aggressor slew rate.',
  s4FextCanvas:
    'FEXT — Far-End Crosstalk — appears at the far end of the victim, opposite from the aggressor source. Unlike NEXT, FEXT is a single-polarity pulse arriving at the receiver at the same time as the intended data. There is no temporal separation to exploit. FEXT is particularly problematic in PCIe because it arrives coincident with data, directly reducing the eye opening.',
  s4FextPcbCanvas:
    'The PCB layout shows the measurement point at the far end of the victim trace. For microstrip, FEXT scales with the square of the coupling length, which is why PCIe layout guidelines strictly limit parallel run lengths between differential pairs.',
  xtkPcbCanvas:
    'This waveform shows the total crosstalk voltage on the victim trace at the far end. The pulse shape is the derivative of the aggressor waveform — faster edges generate larger crosstalk peaks for the same spacing. Peak FEXT amplitude equals the FEXT coefficient multiplied by the aggressor edge amplitude.',
  s6GuardCanvas:
    'Guard traces are grounded traces routed between aggressor and victim to reduce coupling. They intercept electric field lines, reducing capacitive coupling, and provide a low-impedance return path that reduces mutual inductance. A guard trace must be connected to the reference plane at intervals no greater than one quarter wavelength. An unconnected guard trace can actually worsen crosstalk by acting as a floating re-radiator.',
  s6PlaneCanvas:
    'The plane view shows how a continuous solid reference plane beneath the signal layer provides a uniform return current path that minimizes inductive coupling between adjacent traces. Gaps, slots, or anti-pads in this plane force return currents to detour, increasing mutual inductance between signal pairs.',
  s6OrthoCanvas:
    'Routing signal layers orthogonally — horizontal traces on one layer, vertical on the adjacent layer — virtually eliminates broadside coupling between layers. The coupling length in the orthogonal direction is limited to via-to-via spans, reducing mutual capacitance by more than 20 dB compared to parallel routed layers.',
  s6DiffCanvas:
    'Differential pairs are self-shielding to common-mode noise. The electric and magnetic fields of the positive and negative conductors largely cancel in the far field, dramatically reducing both emissions and susceptibility to external coupling. This is why PCIe, USB 3, and HDMI all use differential signaling for high-speed data.',
  calcSweepCanvas:
    'This sweep plots crosstalk coefficient as a function of trace separation. Notice the rapid improvement from 1W to 3W spacing — a factor of 3 improvement in coupling. Beyond 3W the improvement continues at a diminishing rate. This is why design rules specify 3W rather than 10W — you get 90 percent of the benefit at 3W and the remaining improvement requires disproportionately more board area.',

  /* ── Module 05: Return Path ── */
  currentLoopCanvas:
    'Every signal current must complete a circuit — and it always does, even when the return path is not explicitly designed. The question is where the return current flows. At high frequencies — above about 100 kilohertz — return current follows the path of least inductance, which means it concentrates directly beneath the signal trace on the reference plane. When you route a signal over a continuous reference plane, the return current automatically mirrors the signal, minimizing loop inductance and radiated emissions.',
  returnFormationCanvas:
    'This animation shows how the return current distribution narrows and concentrates as frequency increases. At 1 kilohertz the current spreads broadly across the reference plane. At 100 megahertz, 90 percent of the return current flows within a width of approximately three times the dielectric thickness beneath the trace. At 1 gigahertz the concentration is even tighter. Disrupting this concentrated return path forces the current to detour, creating a large current loop that radiates EMI.',
  heatmapCanvas:
    'The heat map shows return current density in the reference plane beneath the signal trace. Red indicates high current density directly beneath the trace. Blue indicates low density in the far field. This spatial distribution determines the effective loop inductance of the signal-return pair, which controls characteristic impedance, propagation delay, and radiation efficiency.',
  detourCanvas:
    'When the signal trace crosses a gap in the reference plane, the high-frequency return current cannot cross the gap directly. It must detour around the split, traveling through whatever conductive path is available. This creates a current loop with area proportional to the split width and detour length. Loop area is the key parameter in EMI: radiated field intensity scales linearly with current and quadratically with frequency times loop area.',
  s2ScopeCanvas:
    'This scope view shows the noise signature caused by return path disruption. The spike coincides exactly with the signal transition — the return current detour creates an inductive kick that appears as noise on adjacent nets and on the power supply. This is the electrical signature of a return path problem.',
  s3ErrorPcbCanvas:
    'This is the most common and most costly signal integrity error on PCBs: a high-speed signal crossing a power or ground plane split. The via anti-pads from the power domain boundary create a slot in the reference plane. The return current must detour around this slot, creating a large inductive current loop. The resulting EMI can cause a board to fail FCC or CE radiated emissions testing even if all component and trace impedances are correct.',
  splitPlaneCanvas:
    'Drag the split width slider and observe how the detour loop area — and therefore the EMI potential — scales with the gap. Even a 50-mil split creates a measurable increase in return path inductance. The EMI risk indicator changes from green to amber to red as the gap widens or signal frequency increases. In practice, splits in reference planes should never occur beneath high-speed signal layers.',
  s3ScopeCanvas:
    'The scope trace shows the signal waveform at the receiver with and without the plane split in the return path. The plane split adds noise and degrades the signal edge quality because the return path inductance increases the effective transmission line impedance and reduces the damping of reflections.',
  s4StitchPcbCanvas:
    'Stitching capacitors provide a local AC return path across a DC power domain boundary. At DC, the capacitor is open — the two power domains remain separated. At high frequencies, the capacitive reactance drops and the capacitor becomes a low-impedance connection for the return current, allowing it to cross the boundary near the signal crossing rather than detour the entire plane. Place one 100-nanofarad and one 1-nanofarad capacitor within 50 mils of each signal via transition.',
  stitchCapCanvas:
    'This animation shows the return current flowing through the stitching capacitor at the plane split. Compare the current path with and without the capacitor: without, the return current must travel the full detour around the split — a large loop. With the stitching capacitor, the current crosses locally through the capacitor — a tiny loop. The difference in radiated EMI can be 20 dB or more.',
  s4ScopeCanvas:
    'The scope shows the improvement in signal quality after adding stitching capacitors at the plane crossing. The noise spike caused by the return path detour is dramatically reduced, and the signal waveform approaches the quality seen over a continuous reference plane.',
  xcPlotCanvas:
    'This plot shows the impedance of different decoupling capacitor values as a function of frequency. Each curve has three regions: capacitive — impedance decreasing — at low frequencies, a minimum at the self-resonant frequency where the capacitor is most effective, and inductive — impedance increasing — above self-resonance. The self-resonant frequency of a 100-nanofarad 0402 capacitor is approximately 50 megahertz. Above that frequency, use a 1-nanofarad 0201 capacitor for better high-frequency decoupling.',
  designExCanvas:
    'This design example shows the complete return path strategy for a real DDR4 board: continuous reference planes on all inner layers, via stitching at every layer transition, stitching capacitors at every power domain boundary crossing, and guard vias around sensitive differential pairs. Applying all of these simultaneously is what achieves first-pass EMC compliance.',
  s5ScopeCanvas:
    'The final scope view shows the signal quality achievable with a properly designed return path compared to a poor one. Clean signal with minimal noise, correct impedance, and no EMI coupling — versus the noisy, distorted signal from a design with plane splits and missing stitching. The difference is entirely in the routing and stackup choices, not the components.',

  /* ── Module 06: Power Integrity ── */
  s1PcbCanvas:
    'This animation shows the complete power delivery network from voltage regulator to silicon die. At the moment of a switching event, the die demands a pulse of current in tens of picoseconds. The VRM cannot respond this fast — it has a bandwidth of only a few hundred kilohertz. The decoupling capacitors on the board and package bridge the gap, providing instantaneous charge while the VRM ramps up.',
  s1ScopeCanvas:
    'The oscilloscope shows the resulting PDN noise: an initial dip as local capacitors are depleted, followed by resonances as energy sloshes between inductors and capacitors in the PDN ladder network. The size of this dip determines whether the device operates within its power supply rejection specification.',
  s2PcbCanvas:
    'The goal of PDN design is to keep the impedance from die to VRM below a target value across all frequencies. Target impedance equals the allowable voltage ripple divided by the maximum current step. For a 3.3-volt supply with 5 percent ripple tolerance and a 2-amp transient, the target impedance is 82 milliohms. The impedance must be maintained flat from DC to the maximum frequency of the current transient.',
  s2ScopeCanvas:
    'Scope shows VDD ripple before and after adding proper decoupling. The peak noise is reduced by more than 10 dB and settling is ten times faster. Notice that simply adding more of the same capacitor value has diminishing returns — effective PDN design requires distributed values spanning multiple decades, not more bulk capacitance.',
  s3DiagCanvas:
    'Anti-resonance is a peak in PDN impedance that occurs when adjacent decoupling capacitor values interact. Between two capacitor decades, their inductances create a parallel resonance — an impedance peak instead of a valley. At the anti-resonant frequency, PDN impedance can be 10 to 100 times higher than at adjacent frequencies, causing severe supply noise.',
  s3ScopeCanvas:
    'The scope shows supply noise at the anti-resonant frequency — the worst-case operating condition for the PDN. The standard mitigation is a hierarchical decoupling strategy: bulk capacitors for VRM bandwidth, mid-frequency ceramics for board-level resonances, and package capacitors for frequencies above 100 megahertz.',
  s4DiagCanvas:
    'Simultaneous Switching Noise — SSN — occurs when multiple output drivers switch at the same time, sharing a common package inductance. The transient current di-dt flows through the package lead inductance, inducing a voltage L times di-dt on the supply rail. For 64 bits switching simultaneously with 1-nanosecond rise times and 20-milliamp per bit, the total di-dt is over 1 ampere per nanosecond — creating 1 volt of ground bounce through a 1-nanohenry package lead.',
  s4ScopeCanvas:
    'The scope shows ground bounce on a non-switching output caused by simultaneous switching of adjacent outputs. The ground bounce can be large enough to cause false switching on the non-switching pins. This is why modern high-speed packages have hundreds of VDD and VSS pins — to divide the shared inductance by the number of parallel paths.',
  s5ScopeACanvas:
    'Scope A shows the PDN noise waveform without proper decoupling — large voltage spikes coincident with data transitions, settling slowly. This is the baseline PDN performance for a design with only bulk capacitance.',
  s5ScopeBCanvas:
    'Scope B shows the same switching activity after implementing a hierarchical decoupling strategy with values spanning six decades from 100 microfarads to 100 picofarads. The peak noise is reduced by more than 10 dB and settling is ten times faster.',

  /* ── Module 07: Differential Signaling ── */
  s1ScopeACanvas:
    'Scope A shows a single-ended signal subjected to common-mode noise. The noise is clearly superimposed on the data and can cause bit errors if it pushes the signal across the logic threshold.',
  s1ScopeBCanvas:
    'Scope B shows the same signal routed as a differential pair with the same noise source. At the receiver, the differential amplifier subtracts the two conductors, canceling the common-mode noise entirely. The data — which is differential-mode — adds in the subtraction. Common-Mode Rejection Ratio of 60 to 80 dB means the receiver rejects millivolts of noise while responding to hundreds of millivolts of differential signal.',
  s2CrossCanvas:
    'This cross-section shows a tightly coupled differential pair. When the two conductors are routed symmetrically with equal width, equal spacing, and identical length, any environmental perturbation affects both conductors equally, maintaining common-mode rejection. The coupling between the pair also means that differential impedance is lower than twice the single-ended impedance.',
  s2ScopeCanvas:
    'When differential pair lengths differ — called skew — the delayed conductor causes one side to arrive later. The receiver sees a distorted differential waveform. For USB 3.2 at 10 gigabits per second with a 100-picosecond unit interval, skew must be held below 10 picoseconds — roughly 60 mils of length mismatch on FR4.',

  /* ── Module 08: High-Speed Interfaces ── */
  s3DiagCanvas:
    'High-speed serial links use a channel loss budget to ensure reliable communication. The total insertion loss from transmitter to receiver must remain within the receiver sensitivity specification. For PCIe Gen 4 at 16 gigatransfers per second, the channel loss limit is 28 dB. This budget is consumed by trace loss, connector insertion loss, via loss, and package loss.',
  s3ScopeCanvas:
    "The scope view shows the received eye diagram before and after equalizer training. The transmitter de-emphasis pre-shapes the signal — boosting high frequencies the lossy channel will attenuate — while the receiver's CTLE and DFE equalizers reconstruct the open eye from the closed, distorted waveform at the wire.",

  /* ── Module 09: Eye Diagrams ── */
  eyeCanvas:
    'An eye diagram is constructed by overlaying thousands of bit transitions — all time-aligned to the bit clock edge — in a single persistence display. The result is a characteristic eye shape: open in the center where bits are stable, closed at the edges where transitions occur. Eye height is the voltage margin. Eye width is the timing margin. Both directly predict the bit error rate of the link.',
  eyeDashCanvas:
    'The eye mask is a shaded region in the center of the eye diagram that the waveform must never enter. If any transition trajectory intersects the mask, the device fails compliance testing. The mask dimensions are specified in the interface standard. Mask testing is the pass-fail criterion for all high-speed link validation.',

  /* ── SI Demo ── */
  demoReflCanvas:
    "This animated waveform shows what happens when a signal encounters a load impedance that doesn't match the 50-ohm characteristic impedance of the transmission line. The cyan wave is the incident signal traveling toward the load. The red wave is the reflected component traveling back toward the source. The reflection coefficient Gamma tells you the fraction of voltage that reflects: zero means perfect match, plus one means full reflection at an open load, minus one means full reflection with inversion at a short circuit. Select the open load condition and notice how the reflected wave equals the incident wave — this is why unterminated CMOS inputs see double the driver's launch amplitude.",
  demoEyeCanvas:
    'This live eye diagram shows how increasing channel insertion loss progressively closes the eye opening. At low loss — 4 dB — the eye is wide open with clear voltage and timing margins. As loss increases to 12 dB, the eye height shrinks due to frequency-dependent attenuation, and the eye width narrows as inter-symbol interference distorts the transition timing. Above 15 dB of loss, the eye closes completely — the receiver can no longer distinguish logic high from logic low without equalization. This is the fundamental challenge of DDR5 at 4800 megatransfers per second and PCIe Gen 5 at 32 gigatransfers per second.',
  demoPlaneCanvas:
    'This interactive PCB view demonstrates return current behavior around a ground plane split. In the top view, watch the animated current flow arrows — representing the return current path. When the reference plane is continuous, return current flows directly beneath the signal trace in a tight, low-inductance path. As you widen the split, the return current must detour around the gap, dramatically increasing the current loop area. This loop radiates electromagnetic energy as an antenna. The EMI risk indicator turns red when the split width and signal frequency combine to create a loop large enough to cause potential emissions compliance failures.',

  /* ── Calculators ── */
  crosstalkCanvas:
    'The victim waveform shows the calculated crosstalk noise induced on the victim trace by the aggressor switching event. The waveform shape is the derivative of the aggressor edge — faster rise times produce taller, narrower crosstalk pulses. The peak amplitude equals the FEXT or NEXT coefficient multiplied by the aggressor swing. Increasing trace spacing from 1W to 3W dramatically reduces peak noise, while increasing coupling length increases both peak amplitude and pulse width.',
  eyeMainCanvas:
    'This eye diagram calculator lets you control the signal parameters that determine eye quality. Jitter — shown as horizontal scatter at the crossing points — compresses the eye width. Random noise — shown as vertical spread on the rails — reduces eye height. ISI from bandwidth-limited channels creates pattern-dependent timing variations that close the eye asymmetrically.',
  jitterHistCanvas:
    'The jitter histogram shows the statistical distribution of edge positions relative to the ideal clock. Random jitter has a Gaussian distribution — theoretically unbounded, requiring Q-factor extrapolation for BER analysis. Deterministic jitter has a bounded, non-Gaussian distribution — often bimodal. Total jitter at a given BER is DJ plus N times sigma-RJ, where N is approximately 14 for BER 10 to the minus 12.',
  bathtubCanvas:
    'The bathtub curve plots the probability of a bit error as a function of sampling offset from the ideal bit center. The two sides of the curve correspond to early and late sampling. The minimum BER at the center is the achievable bit error rate for the link. Compliance specifications define a required eye opening at a specific BER — typically 10 to the minus 12 — and the bathtub curve must show this opening is met.',

  /* ── Capstone: DDR4 ── */
  p3TopoCanvas:
    'DDR4 uses a fly-by topology for the command and address bus: a single trace daisy-chains past each DRAM device without branching. This topology avoids the stub reflections of T-topology used in DDR3, but it creates skew between the first and last devices in the chain. This skew is compensated by write leveling: each DRAM independently adjusts its DQS sampling phase to align with when the command signal arrives at its location.',
  p3ReflCanvas:
    'The reflection plot shows how the fly-by stub at each DRAM ball is minimized by keeping the breakout trace as short as possible — less than 200 mils for DDR4 at 2400 megatransfers per second. Longer stubs create impedance discontinuities that reflect and degrade the signal at subsequent devices in the chain.',
  p4StackCanvas:
    'The DDR4 stackup must balance multiple competing requirements: differential impedance of 100 ohms for the DQS pairs, single-ended impedance of 40 ohms for the data lines, tight dielectric control for impedance repeatability, and sufficient copper weight for current capacity on the power planes.',
  p4ImpCanvas:
    'This simulation shows the field distribution around the microstrip and stripline geometries in the configured stackup. The impedance profile must remain within plus or minus 10 percent of the target across the operating frequency range — achievable with 0.5-ounce copper, 3.8 dielectric constant, and tight laminate thickness control.',
  p6WaveCanvas:
    'DDR4 memory interfaces have one of the most challenging crosstalk environments in PCB design: 64 data lines, 8 DQS differential pairs, and 17 address lines all switching simultaneously. The waveform shows the victim data line with simulated crosstalk from adjacent aggressors in a worst-case simultaneous switching pattern.',
  p6XtalkCanvas:
    'The crosstalk plot shows NEXT and FEXT contributions as a function of trace pair spacing. DDR4 design guidelines require a minimum of 4W spacing between byte lanes and 3W within a byte lane to keep crosstalk within the 50-millivolt noise budget allocated in the DDR4 specification.',
  p8EyeCanvas:
    'This is the final system-level eye diagram for the DDR4 interface — the engineering sign-off deliverable. The eye must clear the DDR4-2400 voltage eye mask: minimum 120 millivolts of eye height and minimum 0.3 unit intervals of eye width at the target BER. Green margins mean first-pass silicon success.',
  p8MarginCanvas:
    'The margin summary panel breaks down the budget: lane-to-lane skew contribution, ISI from channel insertion loss, crosstalk from adjacent lanes, and jitter from the clock distribution. Green indicates margin positive, amber indicates less than 20 percent margin remaining, red indicates mask violation requiring redesign.',
};
