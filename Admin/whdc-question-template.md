<!-- Rising Edge — Weekly Challenge bulk question template -->
<!-- Separate each question with a line containing only: --- -->
<!-- Mark correct option(s) with a leading * . Lines are "key: value". -->
<!-- type = mcq | multi | truefalse | numeric -->
<!--
Keys:
  type         mcq | multi | truefalse | numeric        (required)
  prompt       the question text (required)             (may contain MathJax: \( ... \))
  topic        topic tag                                (optional)
  difficulty   Beginner | Intermediate | Advanced       (optional)
  points       integer, default 10                      (optional)
  image        image URL                                (optional; or use ![alt](url) in prompt)
  explanation  shown after submission                   (optional)
  options:     list below, each line "- text"; correct marked "- *text"   (mcq / multi)
  answer       true | false                             (truefalse)
  answer       number, e.g. 312.5                        (numeric)
  tolerance    +/- allowed for numeric, default 0        (numeric)
  unit         unit label shown next to the answer box   (numeric, optional)
-->

type: mcq
topic: Reference-Plane Integrity
difficulty: Advanced
points: 10
image:
prompt: What is the primary SI risk of routing a DQ byte lane across a plane split?
options:
- Increased DC resistance only
- *A return-current discontinuity that raises impedance, crosstalk, and EMI
- The trace becomes an antenna only below 1 MHz
- Nothing — DQ lines are single-ended so the plane is irrelevant
explanation: The return current cannot follow across a plane split.

---

type: multi
topic: Power Integrity
points: 10
prompt: Which measures reduce simultaneous switching noise (SSN)? (select all)
options:
- *Adequate decoupling close to the power pins
- *Low-inductance power/ground plane pairs
- Removing all series resistors from DQ lines
- *Balanced, tightly-coupled return paths
explanation: Decoupling, low-inductance planes and tight returns reduce SSN.

---

type: numeric
topic: Timing
points: 10
prompt: A DDR4 interface runs at 3200 MT/s. What is the unit interval in ps?
answer: 312.5
tolerance: 5
unit: ps
explanation: 1 / 3.2 GT/s = 312.5 ps.

---

type: truefalse
topic: Termination
points: 10
image: https://example.com/flyby-bus.png
prompt: VTT termination sits at the far end of the fly-by command/address bus.
answer: true
explanation: End termination absorbs the wavefront and prevents reflections.
