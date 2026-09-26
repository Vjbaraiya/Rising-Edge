This is the right direction, but I'd make it more powerful by creating a **single reusable master prompt** instead of writing a new prompt for every tool. You can reuse it like this:

* **Folder:** `Tools/Ferrite-Bead-Optimizer`
* **Topic:** `Ferrite Beads`
* **Folder:** `Tools/Target-Impedance`
* **Topic:** `Target Impedance`
* **Folder:** `Tools/Buck-Converter`
* **Topic:** `Buck Converter`

Only the **folder name** and **topic** change; everything else remains the same.

---

# MASTER PROMPT – Interactive Engineering Tool Generator

## Objective

Using **`/Template/content.html`** as the application framework and **`/Tools/ESD-Protection/esd-protection.html`** as the UI, UX, and architectural reference, create a **professional interactive engineering learning tool** for the topic:

```
Topic:
<topic>

Destination Folder:
Tools/<foldername>
```

The output must be a **production-ready HTML application**, not a documentation page or a simple calculator.

The page should teach the selected engineering topic using interactive learning, engineering visualizations, animations, calculations, simulations, Plotly charts, quizzes, and professional engineering examples.

The overall experience should be comparable to modern engineering learning platforms and EDA vendor documentation while remaining consistent with the Rising Edge Technologies design language.

---

# References

## Application Framework

Use

```
/Template/content.html
```

Reuse:

* Global Navigation
* Footer
* Theme System
* Typography
* Color Tokens
* Cards
* Buttons
* Forms
* Alerts
* Tabs
* Accordions
* Utility Classes
* Responsive Layout
* Icons

Never duplicate global CSS or JavaScript.

---

## Tool Reference

Use

```
/Tools/ESD-Protection/esd-protection.html
```

as the reference for:

* Hero section
* Multi-step workflow
* Workspace layout
* Results dashboard
* Engineering Notes
* Help dialog
* Guided feature tour
* Export options
* Progress indicators
* Status cards
* Responsive design
* Print layout
* Save/Load configuration

The finished page must feel like another built-in Rising Edge engineering tool.

---

# Destination

Generate the project inside

```
Tools/<foldername>/
```

Create

```
Tools/<foldername>/

    <tool-name>.html

    css/
        <tool-name>.css
        help.css

    js/
        main.js
        charts.js
        animations.js
        calculations.js
        simulations.js
        quiz.js
        help.js

    help/
        user-guide.html

    assets/

        images/
        gifs/
        svg/
        icons/

        placeholders/
```

---

# Purpose

Explain the engineering topic

```
<topic>
```

from

Beginner

↓

Intermediate

↓

Professional

↓

Expert

without overwhelming the learner.

The content should be suitable for engineers with approximately **5–7 years of experience** while remaining approachable.

---

# Learning Philosophy

Every page should answer:

* What is it?
* Why is it important?
* How does it work?
* Where is it used?
* When should it be used?
* When should it NOT be used?
* What are the trade-offs?
* What are common mistakes?
* How is it implemented?
* How is it verified?
* What industry standards apply?

The learner should leave understanding the engineering reasoning, not just memorizing facts.

---

# Hero Section

Include

* Topic Title
* Subtitle
* Engineering Domain
* Difficulty
* Estimated Learning Time
* Version
* Last Updated

Buttons

* ▶ Start Learning
* 🎙 Play Lesson
* 📝 Engineering Notes
* ❓ Take Quiz
* ⭐ Bookmark

---

# Interactive Engineering Narrator

Create a floating narration widget.

Features:

* Play
* Pause
* Resume
* Stop
* Replay section
* Playback speed
* Voice selection
* Highlight current paragraph
* Auto-scroll
* Synchronize diagrams
* Synchronize Plotly charts
* Resume from last position

Store narration text separately from displayed content.

---

# Learning Objectives

Display interactive cards describing:

* Skills gained
* Engineering concepts covered
* Practical applications
* Common pitfalls
* Expected outcomes

---

# Interactive Learning Flow

```
Hero
↓

Learning Objectives

↓

Why This Topic Matters

↓

Concept Explorer

↓

Engineering Theory

↓

Interactive Animations

↓

Images

↓

GIF Demonstrations

↓

Interactive SVGs

↓

Plotly Charts

↓

Engineering Calculators

↓

Interactive Simulations

↓

Real PCB Examples

↓

Failure Analysis

↓

Common Mistakes

↓

Engineering Myths

↓

Decision Trees

↓

Industry Standards

↓

Knowledge Check

↓

Interactive Quiz

↓

Engineering Notes

↓

Summary

↓

Further Reading
```

---

# Images

Every concept should include visual aids.

Use:

* PCB layouts
* Block diagrams
* Component photos
* Cross-sectional illustrations
* Oscilloscope screenshots (placeholder)
* Simulation screenshots (placeholder)
* CAD renderings
* 3D illustrations
* Package drawings
* Current flow diagrams
* Return path diagrams
* Electric field visualizations
* Magnetic field visualizations

If assets are unavailable, create clearly named placeholders.

---

# GIF Requirements

Every major concept should include a GIF placeholder.

Examples:

* Signal propagation
* Reflection
* Crosstalk
* Ferrite operation
* Switching waveform
* EMI coupling
* Current return
* Power distribution
* Heat flow
* Differential signaling

Each GIF section should define:

* Title
* Learning objective
* Description
* Suggested filename

---

# Interactive SVG Animations

Create animated SVG diagrams for:

* Current flow
* Signal propagation
* Return path
* Magnetic fields
* Electric fields
* Noise coupling
* Reflection
* Ground bounce
* Heat flow
* Power distribution

Requirements:

* Hover interactions
* Zoom
* Tooltips
* Step-by-step animation
* Replay
* Responsive behavior

---

# Plotly Charts

Use Plotly whenever it improves understanding.

Examples:

* Frequency response
* Impedance
* Eye diagram metrics
* Insertion loss
* Return loss
* Power dissipation
* Temperature rise
* Efficiency
* Current density
* Noise spectrum
* Target impedance
* Reflection coefficient
* EMI spectrum

Charts must support:

* Zoom
* Pan
* Hover
* Export PNG
* Dark/Light themes
* Annotations
* Interactive legends

---

# Engineering Calculators

Include mini-calculators relevant to `<topic>`.

Each calculator should include:

* Formula
* Variable definitions
* Assumptions
* Units
* Practical interpretation
* Limitations
* Worked example

---

# Interactive Simulations

Use JavaScript to create lightweight simulations.

Examples:

* Slider-controlled parameter changes
* Live waveform updates
* Field visualization
* Timing effects
* Thermal changes
* Frequency response
* Reflection behavior

All simulations should update in real time.

---

# Real Engineering Examples

Provide:

* Consumer electronics example
* Industrial example
* Automotive example
* Medical example
* Networking example
* FPGA example
* High-speed PCB example

Each example should explain the design decisions.

---

# Design Review

Compare:

* Correct implementation
* Incorrect implementation

Highlight:

* Layout
* Routing
* Placement
* Performance
* Reliability

---

# Common Mistakes

Each mistake should include:

* Description
* Root cause
* Symptoms
* Impact
* Correct approach
* Supporting illustration

---

# Engineering Myths

Create a myth-busting section.

For each myth:

* Explain why it exists
* Show where it fails
* Provide the correct engineering practice

---

# Interactive Decision Tree

Create clickable engineering decision trees.

Guide users through design choices based on:

* Requirements
* Constraints
* Standards
* Performance targets

---

# Interactive Quiz

Support:

* Multiple choice
* Drag-and-drop
* Image identification
* PCB review
* Waveform interpretation
* Scenario-based questions

Provide detailed explanations for every answer.

---

# Engineering Notes

Create an accordion with 20–30 sections covering:

* Fundamentals
* Theory
* Equations
* Applications
* Best practices
* Failure modes
* Standards
* Design rules
* Troubleshooting

---

# Help Center

Reuse the ESD-style Help Center.

Include:

* Search
* Feature tour
* Glossary
* FAQ
* Troubleshooting
* Keyboard shortcuts

---

# Reports & Export

Support:

* Print lesson
* Export PDF
* Export notes
* Save progress
* Bookmark
* Share

---

# Performance

* Lazy-load images and GIFs
* Load Plotly only when needed
* Optimize SVG animations
* Keep interactions responsive
* Avoid unnecessary reflows

---

# Accessibility

Comply with WCAG 2.2 AA.

Support:

* Keyboard navigation
* Screen readers
* High contrast
* Reduced motion
* Focus indicators
* Accessible charts

---

# Extensibility

The architecture must separate:

* Content
* Layout
* Charts
* Animations
* Simulations
* Quiz
* Narration

Changing the topic should only require updating a structured content file, allowing the same framework to generate tools for any engineering subject.

---

# Definition of Done

The implementation is complete only if it:

* Uses `/Template/content.html` as the base layout.
* Uses `/Tools/ESD-Protection/esd-protection.html` as the interaction and UI reference.
* Reuses all global components.
* Creates a complete tool inside `Tools/<foldername>/`.
* Explains `<topic>` visually using images, GIFs, SVG animations, Plotly charts, calculators, and simulations.
* Includes engineering examples, design reviews, myths, common mistakes, quizzes, and engineering notes.
* Is responsive, accessible, modular, and production-ready.
* Is reusable for future engineering topics without changing the core application architecture.

This master prompt will let you generate an entire suite of consistent, high-quality interactive engineering learning tools by supplying only the folder name and topic.
