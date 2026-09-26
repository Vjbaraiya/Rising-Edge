<!-- Rising Edge — Weekly Challenge bulk question template -->
<!-- Separate each question with a line containing only: --- -->
<!-- Mark correct option(s) with a leading * . Lines are "key: value". -->
<!-- type = mcq | multi | truefalse | numeric -->
<!-- Challenge 36 — Basic Hardware Design (20 MCQ: 10 Basic @4, 5 Moderate @6, 5 Difficult @6 = 100) -->

type: mcq
topic: Ohm's Law
difficulty: Basic
points: 4
image:
prompt: A 5 V supply is connected across a 1 kΩ resistor. How much current flows through the resistor?
options:
- 5 A
- *5 mA
- 200 mA
- 0.2 mA
explanation: By Ohm's law, I = V / R = 5 V / 1000 Ω = 0.005 A = 5 mA.

---

type: mcq
topic: Resistors — Series
difficulty: Basic
points: 4
image:
prompt: Two resistors of 220 Ω and 330 Ω are connected in series. What is their total resistance?
options:
- 132 Ω
- *550 Ω
- 275 Ω
- 110 Ω
explanation: Resistances in series add directly: 220 Ω + 330 Ω = 550 Ω. (In parallel they would combine to 132 Ω.)

---

type: mcq
topic: Capacitors — Function
difficulty: Basic
points: 4
image:
prompt: What is the primary function of a decoupling (bypass) capacitor placed close to an IC's power pin?
options:
- To increase the IC's clock frequency
- *To supply momentary current during switching and filter high-frequency noise on the supply rail
- To convert AC to DC
- To provide electrostatic-discharge protection for the pin
explanation: A decoupling capacitor acts as a small local energy reservoir that delivers the fast current spikes an IC demands when its outputs switch, and it shunts high-frequency noise to ground — keeping the local supply voltage stable.

---

type: mcq
topic: Diodes — Polarity
difficulty: Basic
points: 4
image:
prompt: In normal forward operation, conventional current flows through a diode in which direction?
options:
- From cathode to anode
- *From anode to cathode
- Equally in both directions
- Only when reverse-biased
explanation: A diode conducts when forward-biased, allowing conventional current to flow from the anode (+) to the cathode (–). The cathode is marked with a band. In reverse bias it blocks current.

---

type: mcq
topic: LEDs — Current Limiting
difficulty: Basic
points: 4
image:
prompt: Why must a resistor normally be placed in series with an LED driven from a fixed voltage source?
options:
- To increase the LED's brightness beyond its rating
- To convert the LED's light to a different color
- *To limit the current through the LED, since its forward voltage is roughly fixed and it would otherwise draw destructive current
- To store charge for when the LED turns off
explanation: An LED has an approximately constant forward voltage, so without a series resistor the current is limited only by the source and the LED's tiny internal resistance — quickly destroying it. The resistor sets the operating current: R = (Vsupply − Vf) / Iled.

---

type: mcq
topic: Pull-up Resistors
difficulty: Basic
points: 4
image:
prompt: A microcontroller input pin is connected to a push-button that shorts the pin to ground when pressed. What is the role of a pull-up resistor on that pin?
options:
- It amplifies the button signal
- *It holds the pin at a defined logic HIGH when the button is not pressed, preventing a floating input
- It limits the current into the microcontroller's clock
- It converts the digital input to analog
explanation: Without a pull-up (or pull-down), an unpressed button leaves the input floating, so it can read random values from noise. A pull-up resistor ties the pin to VCC (logic HIGH) when the button is open; pressing the button pulls it to ground (LOW).

---

type: mcq
topic: Voltage Divider
difficulty: Basic
points: 4
image:
prompt: A voltage divider uses two equal resistors between 12 V and ground. What voltage appears at the midpoint (with no load)?
options:
- 12 V
- *6 V
- 3 V
- 0 V
explanation: With two equal resistors, the output is Vout = Vin × R2/(R1+R2) = 12 × 1/2 = 6 V. Equal resistors split the voltage in half.

---

type: mcq
topic: Transistor as a Switch
difficulty: Basic
points: 4
image:
prompt: When an NPN bipolar transistor is used as a low-side switch and is fully turned on ("saturated"), what is true of the collector-emitter path?
options:
- It behaves like an open circuit (high resistance)
- *It behaves like a closed switch with a small saturation voltage (Vce(sat)), allowing load current to flow
- It regulates the load current to zero
- It reverses the polarity of the load
explanation: In saturation the transistor is fully on, so the collector-emitter path drops only a small Vce(sat) (typically ~0.2 V) and effectively closes the switch, letting current flow through the load to ground. With no base drive it is off (open).

---

type: mcq
topic: Units & Prefixes
difficulty: Basic
points: 4
image:
prompt: A capacitor is labeled 100 nF. What is this value expressed in microfarads (µF)?
options:
- 10 µF
- 1 µF
- *0.1 µF
- 0.001 µF
explanation: 1 µF = 1000 nF, so 100 nF = 100/1000 = 0.1 µF. The common "104" ceramic capacitor marking is this same value.

---

type: mcq
topic: Grounding Basics
difficulty: Basic
points: 4
image:
prompt: In a typical DC circuit, what does the term "ground" (0 V reference) primarily provide?
options:
- A source of positive supply voltage
- *A common reference node against which all other voltages in the circuit are measured
- A guarantee that no current can flow
- Electrical isolation between two circuits
explanation: Ground is the common 0 V reference node; every other voltage in the circuit is measured relative to it. It also usually serves as the return path for current back to the supply.

---

type: mcq
topic: RC Time Constant
difficulty: Moderate
points: 6
image:
prompt: A 10 kΩ resistor charges a 10 µF capacitor from a step voltage. Approximately how long is one RC time constant (τ)?
options:
- 1 ms
- 10 ms
- *100 ms
- 1 s
explanation: τ = R × C = 10,000 Ω × 10×10⁻⁶ F = 0.1 s = 100 ms. After one τ the capacitor charges to ~63% of the final voltage.

---

type: mcq
topic: I2C Bus
difficulty: Moderate
points: 6
image:
prompt: The I2C bus uses open-drain SDA and SCL lines. Why are external pull-up resistors required?
options:
- To limit the bus clock speed to a fixed value
- *Because open-drain drivers can only pull the lines LOW; the pull-ups provide the HIGH level and set the rising-edge speed
- To provide the supply voltage for all devices on the bus
- To convert the bus from single-ended to differential
explanation: I2C devices drive the lines low through open-drain transistors but cannot actively drive them high. Pull-up resistors return the line to VCC when no device is pulling low. Their value trades off power and rise time: too large slows the rising edge (with bus capacitance), too small wastes current.

---

type: mcq
topic: Op-Amps — Virtual Short
difficulty: Moderate
points: 6
image:
prompt: In an ideal op-amp with negative feedback operating in its linear region, what is the "virtual short" concept?
options:
- The two inputs are physically connected together internally
- *Negative feedback drives the voltage difference between the two inputs to nearly zero, so they sit at the same voltage while drawing negligible input current
- The output is shorted to ground through the feedback network
- The supply rails are momentarily shorted during switching
explanation: With high open-loop gain and negative feedback, the op-amp adjusts its output to keep V+ ≈ V−. Combined with the ideal assumption of ~zero input current, this "virtual short" is the key simplification used to analyze inverting/non-inverting amplifier gains.

---

type: mcq
topic: Linear Regulators — Dropout
difficulty: Moderate
points: 6
image:
prompt: An LDO regulator has a dropout voltage of 300 mV and a 3.3 V output. What is the minimum input voltage for it to regulate properly?
options:
- 3.0 V
- *3.6 V
- 3.3 V
- 6.6 V
explanation: The input must exceed the output by at least the dropout voltage: Vin(min) = Vout + Vdropout = 3.3 V + 0.3 V = 3.6 V. Below this the regulator drops out and the output falls with the input.

---

type: mcq
topic: Crystals — Load Capacitors
difficulty: Moderate
points: 6
image:
prompt: A quartz crystal oscillator circuit specifies two small load capacitors to ground on the crystal pins. What is their main effect?
options:
- They provide the power supply for the oscillator
- *They set the total load capacitance the crystal sees, which trims the exact oscillation frequency to the crystal's rated value
- They convert the sine output to a square wave
- They protect the crystal from ESD
explanation: A crystal is specified for a particular load capacitance (CL). The two external caps (in series across the crystal, plus stray capacitance) present that load; choosing them per the datasheet pulls the oscillation to the correct frequency. Wrong load caps cause a frequency offset or unreliable startup.

---

type: mcq
topic: Ground Bounce
difficulty: Difficult
points: 6
image: /Challenge/question-images/w36-bhw-ground-bounce.svg
prompt: Several outputs of a logic IC switch from HIGH to LOW simultaneously, and a quiet output that should stay LOW briefly glitches HIGH. What is the most likely cause?
options:
- Excess pull-up current on the quiet output
- *Ground bounce — the fast combined return current through the package/lead ground inductance momentarily raises the chip's internal ground reference above the board ground
- The crystal load capacitors are the wrong value
- The supply voltage is too high for the logic family
explanation: When many outputs switch together, a large di/dt flows through the shared ground bond-wire/lead inductance (V = L·di/dt), lifting the die's internal ground above true board ground. A quiet LOW output referenced to that internal ground then appears momentarily HIGH to the outside world. Mitigations include good decoupling, minimizing ground inductance (more ground pins/vias, BGA over leaded packages), and staggering output switching.

---

type: mcq
topic: Power Distribution Network
difficulty: Difficult
points: 6
image: /Challenge/question-images/w36-bhw-pdn-impedance.svg
prompt: Why is a single large-value bulk capacitor, by itself, insufficient to decouple a fast digital IC across a wide frequency range?
options:
- Large capacitors cannot store enough charge for digital loads
- *Every capacitor has parasitic inductance (ESL); above its self-resonant frequency it looks inductive, so a range of capacitor values is needed to keep PDN impedance low across the band
- Large capacitors short the supply to ground at high frequency
- A single capacitor works fine; multiple values are only for cost reasons
explanation: A real capacitor is a series RLC: at low frequency it's capacitive, at its self-resonant frequency (set by C and its ESL) impedance is minimum, and above that it becomes inductive and stops decoupling. Fast current transients contain high-frequency content, so designers stack multiple values (bulk + mid + small high-frequency ceramics near the die) whose self-resonances overlap to keep the power-distribution-network impedance below target across the whole band.

---

type: mcq
topic: Differential Signaling
difficulty: Difficult
points: 6
image:
prompt: Differential signaling (e.g., LVDS, RS-485, CAN) carries data on two complementary lines. Why does this reject noise better than a single-ended signal?
options:
- Because the two lines carry twice the voltage
- *Because noise couples nearly equally into both closely-routed lines as common-mode, and the receiver responds only to the difference, cancelling the common-mode noise
- Because differential signals cannot pick up any noise
- Because each line is individually shielded by the other
explanation: External noise (EMI, ground shifts) couples about equally into a tightly-coupled pair, appearing as a common-mode component on both lines. The receiver senses only the difference (V+ − V−), so the shared common-mode noise cancels out. This common-mode rejection is why differential links tolerate long cables and noisy environments far better than single-ended signaling.

---

type: mcq
topic: Thermal Derating
difficulty: Difficult
points: 6
image:
prompt: A resistor is rated 0.25 W at 25 °C ambient but the datasheet shows a derating curve sloping to 0 W at 155 °C. At an ambient of 90 °C, roughly what continuous power can it safely dissipate?
options:
- Still the full 0.25 W, since derating only matters above 155 °C
- 0 W — it cannot be used at all
- *About 0.13 W — the rating is linearly derated between 25 °C and 155 °C
- More than 0.25 W, because higher ambient improves dissipation
explanation: Linear derating scales the rated power from full at 25 °C down to zero at the max temperature (155 °C). At 90 °C the fraction of the 130 °C span remaining is (155 − 90)/(155 − 25) = 65/130 = 0.5, so allowable power ≈ 0.5 × 0.25 W ≈ 0.13 W. Ignoring derating is a common cause of overheated parts in hot enclosures.

---

type: mcq
topic: Transmission-Line Reflections
difficulty: Difficult
points: 6
image:
prompt: A fast digital driver connects to a receiver over a PCB trace long enough to act as a transmission line, but the trace is unterminated and the source impedance is much lower than the trace impedance. What symptom appears at the receiver, and what is a common fix?
options:
- A slow exponential rise with no overshoot; the fix is a larger decoupling capacitor
- *Overshoot and ringing (reflections from the impedance mismatch); a common fix is a series termination resistor at the driver sized to match the trace impedance
- A permanent DC offset; the fix is a pull-down resistor
- Reduced propagation delay; no fix is needed
explanation: When the source impedance does not match the trace, the edge reflects off the unterminated (high-impedance) receiver end and back off the low-impedance source, producing overshoot and ringing that can cause false triggering or EMI. Series (source) termination adds a resistor at the driver so that driver output impedance plus resistor equals the line impedance (Z0), absorbing the returning reflection. Parallel/AC termination at the receiver is the alternative approach.
