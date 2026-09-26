<!-- Rising Edge — Weekly Challenge bulk question template -->
<!-- Separate each question with a line containing only: --- -->
<!-- Mark correct option(s) with a leading * . Lines are "key: value". -->
<!-- type = mcq | multi | truefalse | numeric -->
<!-- Challenge 37 — Basic Hardware Design (20 MCQ: 10 Basic @4, 5 Moderate @6, 5 Difficult @6 = 100) -->

type: mcq
topic: Parallel Resistors
difficulty: Basic
points: 4
image:
prompt: Two 100 Ω resistors are connected in parallel. What is their combined resistance?
options:
- 200 Ω
- *50 Ω
- 100 Ω
- 25 Ω
explanation: Two equal resistors in parallel give half the value: 100 Ω ∥ 100 Ω = 50 Ω. In general 1/Rtotal = 1/R1 + 1/R2.

---

type: mcq
topic: Capacitor Charge
difficulty: Basic
points: 4
image:
prompt: A 10 µF capacitor is charged to 5 V. How much charge does it store?
options:
- 2 µC
- *50 µC
- 0.5 µC
- 500 µC
explanation: Charge Q = C × V = 10 µF × 5 V = 50 µC. Charge scales linearly with both capacitance and voltage.

---

type: mcq
topic: Kirchhoff's Current Law
difficulty: Basic
points: 4
image:
prompt: Three wires meet at a node. 3 A flows in on one wire and 2 A flows in on another. What current must flow out on the third wire?
options:
- 1 A
- 6 A
- *5 A
- 0 A
explanation: Kirchhoff's Current Law: the sum of currents into a node equals the sum out. 3 A + 2 A in means 5 A must flow out on the third wire.

---

type: mcq
topic: Inductor Behavior
difficulty: Basic
points: 4
image:
prompt: What does an ideal inductor oppose?
options:
- Any DC current, blocking it completely
- *A change in current through it, developing a voltage V = L·di/dt
- A change in voltage across it
- Nothing; it behaves like a plain wire at all frequencies
explanation: An inductor resists changes in current: a changing current induces a back-EMF V = L·di/dt. It passes steady DC with little opposition but impedes high-frequency current, the opposite of a capacitor.

---

type: mcq
topic: Zener Diode
difficulty: Basic
points: 4
image:
prompt: A Zener diode is most commonly used in which configuration?
options:
- Forward-biased, as a normal rectifier
- *Reverse-biased, to hold a stable reference/clamp voltage at its Zener voltage
- As a light source
- As a variable resistor controlled by current
explanation: A Zener diode is operated in reverse breakdown, where it maintains a nearly constant voltage (its Zener voltage) across a range of current. This makes it useful as a simple voltage reference or clamp. A series resistor limits the current.

---

type: mcq
topic: MOSFET vs BJT
difficulty: Basic
points: 4
image:
prompt: What is a key difference between a MOSFET and a bipolar junction transistor (BJT)?
options:
- A MOSFET is current-controlled; a BJT is voltage-controlled
- *A MOSFET is voltage-controlled (gate voltage) with very high input impedance; a BJT is current-controlled (base current)
- They are electrically identical
- A BJT cannot be used as a switch
explanation: A MOSFET is controlled by the gate-source voltage and draws virtually no steady gate current (high input impedance). A BJT is controlled by base current. This makes MOSFET gate drive low-power in steady state, though the gate charge must still be moved to switch quickly.

---

type: mcq
topic: Potentiometer
difficulty: Basic
points: 4
image:
prompt: A potentiometer used as a voltage divider (wiper as output) primarily provides:
options:
- A fixed current source
- *An adjustable output voltage between 0 and the supply, set by the wiper position
- Electrical isolation between input and output
- A constant resistance regardless of wiper position
explanation: With the two ends across a supply and the wiper as output, a potentiometer forms a variable voltage divider: moving the wiper changes the ratio and thus the output voltage from 0 up to the full supply.

---

type: mcq
topic: Electrical Power
difficulty: Basic
points: 4
image:
prompt: A device draws 2 A at 12 V. How much power does it consume?
options:
- 6 W
- 14 W
- *24 W
- 10 W
explanation: Power P = V × I = 12 V × 2 A = 24 W.

---

type: mcq
topic: Fuse Function
difficulty: Basic
points: 4
image:
prompt: What is the primary purpose of a fuse in a circuit?
options:
- To regulate the output voltage
- *To open (break) the circuit when current exceeds a safe limit, protecting against overcurrent/fire
- To store energy for later use
- To convert AC to DC
explanation: A fuse contains an element that melts and opens the circuit when current exceeds its rating, protecting wiring and components from overcurrent faults. It is a sacrificial, one-time protective device.

---

type: mcq
topic: Batteries in Series
difficulty: Basic
points: 4
image:
prompt: Two identical 1.5 V batteries are connected in series. What is the resulting voltage and how does capacity (mAh) compare to a single cell?
options:
- 1.5 V, double the capacity
- *3.0 V, same capacity as one cell
- 3.0 V, double the capacity
- 0.75 V, half the capacity
explanation: Series-connected cells add their voltages (1.5 V + 1.5 V = 3.0 V) while the capacity in mAh stays that of a single cell. To increase capacity you connect cells in parallel (same voltage, added mAh).

---

type: mcq
topic: RC Filters
difficulty: Moderate
points: 6
image:
prompt: In a simple RC filter, if the output is taken across the capacitor, the circuit behaves as a:
options:
- High-pass filter
- *Low-pass filter, passing low frequencies and attenuating high frequencies above the corner
- Band-pass filter
- All-pass filter
explanation: With output across the capacitor, low frequencies see high capacitor impedance (most of the voltage appears across C) while high frequencies are shunted — a low-pass response. Taking the output across the resistor instead gives a high-pass filter. The corner is f = 1/(2πRC).

---

type: mcq
topic: SPI Bus
difficulty: Moderate
points: 6
image:
prompt: Which statement best describes the SPI bus?
options:
- A two-wire bus with addressing and pull-up resistors, like I2C
- *A full-duplex synchronous bus using separate MOSI, MISO, SCLK lines plus a chip-select per peripheral; no addressing needed
- A single-wire asynchronous bus with no clock
- A differential bus requiring termination resistors
explanation: SPI is a synchronous, full-duplex bus: the master drives SCLK and MOSI, the peripheral returns data on MISO, and each peripheral has its own chip-select (CS/SS). It has no addressing scheme — device selection is by CS line — and typically runs faster than I2C at the cost of more pins.

---

type: mcq
topic: Regulator Efficiency
difficulty: Moderate
points: 6
image:
prompt: Converting 12 V down to 3.3 V at 1 A: compared with a linear regulator, a switching (buck) regulator is preferred mainly because:
options:
- It is always cheaper and simpler
- *It is far more efficient — a linear regulator dissipates (12 − 3.3) V × 1 A ≈ 8.7 W as heat, while a buck converter transfers most of the power
- It produces less output noise than a linear regulator
- It cannot be used for this ratio
explanation: A linear regulator drops the excess voltage as heat: (12 − 3.3) × 1 = 8.7 W wasted, ~27% efficiency here. A buck switching regulator stores and transfers energy via an inductor, reaching 85–95% efficiency, so it wastes far less power and heat. The trade-off is more components and switching noise (which good layout and filtering manage).

---

type: mcq
topic: NTC Thermistor
difficulty: Moderate
points: 6
image:
prompt: An NTC thermistor is often placed in series with the mains input of a power supply. What is its role and behavior?
options:
- It regulates the output voltage as temperature changes
- *It limits inrush current at cold start (high resistance when cold), then heats up and drops to low resistance so it wastes little power in normal operation
- It increases resistance as it heats, acting as a fuse
- It converts temperature to a digital signal
explanation: A negative-temperature-coefficient (NTC) thermistor has high resistance when cold, limiting the large inrush current that charges the bulk capacitors at power-on. As current flows it self-heats and its resistance falls, so in steady operation it drops little voltage and wastes little power. (NTC = resistance falls with rising temperature, opposite of a PTC.)

---

type: mcq
topic: Decoupling vs Bulk Capacitors
difficulty: Moderate
points: 6
image:
prompt: On a board you place both a large 100 µF bulk capacitor and small 100 nF ceramics next to each IC. Why use both instead of one big capacitor?
options:
- The small caps are only for mechanical support
- *The bulk cap supplies low-frequency/large current demands, while the small ceramics have low ESL and respond to fast, high-frequency current transients close to the IC — together they keep the rail low-impedance across a wide band
- They must be identical values to work
- The large cap handles high frequency and the small ones handle DC
explanation: A large bulk capacitor stores energy for slower, larger current swings but has higher parasitic inductance, so it is ineffective at high frequency. Small ceramics placed right at the IC have low ESL and can source the fast transient currents when outputs switch. Using a range of values keeps the power rail low-impedance across the whole frequency band the IC demands.

---

type: mcq
topic: Transmission-Line Reflections
difficulty: Difficult
points: 6
image: /Challenge/question-images/w37-bhw-reflections.svg
prompt: A fast digital signal travels down a long PCB trace whose length makes it behave as a transmission line, but the trace is unterminated and the driver impedance is much lower than the trace impedance. What is the likely symptom at the receiver, and a common fix?
options:
- A slow exponential rise with no overshoot; fix with a bigger decoupling cap
- *Overshoot and ringing from reflections at the impedance mismatch; a common fix is a series termination resistor at the driver sized to match the trace impedance
- Reduced propagation delay; no fix needed
- A permanent DC offset; fix with a pull-down resistor
explanation: With the source impedance far below the trace impedance and the receiver end open (high impedance), the launched edge reflects off the receiver and again off the low-impedance source, producing overshoot and ringing that can cause false triggering and EMI. Series (source) termination adds a resistor at the driver so driver impedance plus resistor equals the line impedance, absorbing the returning reflection. Parallel/AC termination at the receiver is the alternative.

---

type: mcq
topic: Common-Mode vs Differential Signaling
difficulty: Difficult
points: 6
image:
prompt: Differential signaling (e.g., LVDS, RS-485, CAN) rejects noise better than single-ended signaling because:
options:
- It carries twice the voltage
- *Interference couples nearly equally into both closely-routed lines as common-mode noise, and the receiver responds only to the difference, cancelling that common-mode component
- Each line is individually shielded by the other
- It cannot pick up any noise at all
explanation: External noise (EMI, ground shifts) couples about equally into a tightly-coupled pair, appearing as a common-mode signal on both conductors. The differential receiver senses only V+ − V−, so the shared common-mode noise subtracts out. This common-mode rejection lets differential links run over long, noisy cables far better than single-ended signals.

---

type: mcq
topic: Inrush Current & Soft-Start
difficulty: Difficult
points: 6
image:
prompt: When a supply with a large output capacitor is switched on, a very large inrush current can flow briefly. Why, and what is a standard mitigation?
options:
- Because the capacitor blocks DC; the fix is to remove the capacitor
- *An uncharged capacitor initially looks like a short circuit, so a big current flows to charge it; mitigations include an NTC/series resistor, a soft-start circuit, or ramping the supply/load switch gradually
- Because the inductor saturates; the fix is a larger fuse only
- Inrush is impossible in DC circuits
explanation: At the instant of power-on the bulk capacitor is uncharged, so it momentarily behaves like a short circuit and draws a large surge current limited only by source and wiring resistance. This can trip fuses, weld relay contacts, or sag the source. Mitigations limit or ramp that current: an NTC inrush limiter, a series resistor (bypassed after charge), or a soft-start/inrush-control circuit (e.g., a controlled MOSFET that ramps the rail).

---

type: mcq
topic: Star Grounding
difficulty: Difficult
points: 6
image:
prompt: In a mixed analog/digital board, why is a "star" (single-point) ground often used for the low-frequency analog section?
options:
- It increases the ground resistance to filter noise
- *It routes each section's return current to a single common point so noisy digital return currents don't flow through the sensitive analog ground and shift its reference
- It eliminates the need for any ground plane
- It is required to pass radiated-emissions tests at GHz frequencies
explanation: Shared ground traces carry each section's return current; if noisy digital return currents flow through the analog ground path, the IR drop shifts the analog reference and injects noise. A star (single-point) ground brings each section's return to one common node so their currents don't share a path at low frequency. (At high frequency a solid ground plane with careful partitioning is preferred, since return current follows the path of least inductance under the trace.)

---

type: mcq
topic: Capacitor ESR & Ripple Current
difficulty: Difficult
points: 6
image:
prompt: In a switching regulator's output filter, why is a capacitor's ESR (equivalent series resistance) and ripple-current rating important?
options:
- ESR sets the capacitor's DC voltage rating and nothing else
- *Ripple current flowing through the ESR causes I²R self-heating and adds ESR×I ripple voltage; too much ripple current overheats and ages the cap, so a low-ESR part with adequate ripple rating is chosen
- ESR only matters for capacitors used at DC
- Higher ESR always gives lower output ripple
explanation: A filter capacitor carries significant AC ripple current. That current flowing through the internal ESR dissipates power (I²·ESR) as heat and produces a ripple-voltage component (ESR × ripple current) on top of the capacitive ripple. Excess ripple current overheats the capacitor and shortens its life (especially electrolytics). Designers pick low-ESR capacitors (e.g., ceramic or polymer) with a ripple-current rating above the application's requirement, often paralleling caps to share the current and lower total ESR.
