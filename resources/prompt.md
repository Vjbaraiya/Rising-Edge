# Enterprise Prompt
## Interactive Engineering Learning Agent (HTML)
### Rising Edge Technologies

---

# Objective

Using **`/Template/content.html`** as the primary application framework and all existing **global CSS, JavaScript, navigation, footer, theme, icons, typography, spacing, utilities, alerts, cards, buttons, forms, charts, and reusable components**, create an **interactive engineering learning page** capable of explaining **any electronics engineering topic** in a highly visual and engaging manner.

The page should not resemble a traditional documentation page.

Instead, it should function as an **interactive engineering tutor**, combining:

- Interactive visualizations
- Animated diagrams
- Engineering calculations
- Plotly charts
- Engineering simulations
- Progressive learning
- Interactive quizzes
- Expandable explanations
- Practical design examples
- Real-world case studies
- Common mistakes
- Best practices

The experience should be comparable to modern learning platforms such as Coursera, Brilliant.org, MathWorks documentation, Keysight Learning, Cadence Learning, and Apple's Human Interface Guidelines.

The target audience is an engineer with **5–7 years of experience**.

The page should explain concepts deeply while remaining practical and visually engaging.

---

# References

Use

```
/Template/content.html
```

as the master layout.

Reuse all global files including

- Navigation
- Footer
- Theme
- Tokens
- Cards
- Buttons
- Alerts
- Accordions
- Tabs
- Typography
- Colors
- Responsive Grid
- Forms
- Icons
- Utility classes

DO NOT duplicate global CSS.

DO NOT recreate navigation.

DO NOT recreate footer.

---

# Page Goal

The page should teach any engineering topic from first principles through advanced applications.

Examples

Signal Integrity

Power Integrity

EMI

EMC

Grounding

PCB Design

Transmission Lines

DDR

USB

PCIe

Buck Converter

ESD

Differential Pair

Thermal Design

Power Supplies

High-Speed Design

FPGA

ADC

DAC

Clock Design

Ferrite Beads

Target Impedance

Decoupling

Via Design

Stackup

Crosstalk

Return Path

Eye Diagram

and any future engineering topic.

The page shall be topic-driven.

---

# User Experience

The page should feel like

> An experienced engineering mentor explaining a topic on a whiteboard with interactive diagrams.

The user should never encounter long blocks of plain text.

Instead use

Images

Animations

Interactive graphs

Expandable cards

Tabs

Accordions

Engineering examples

Interactive calculators

Mini simulations

Flow diagrams

Decision trees

Practical design reviews

---

# Overall Layout

Hero

↓

Learning Objectives

↓

Topic Overview

↓

Interactive Concept Explorer

↓

Engineering Theory

↓

Interactive Visualizations

↓

Animations

↓

Engineering Calculations

↓

Design Examples

↓

Real Product Examples

↓

Common Mistakes

↓

Engineering Myths

↓

Decision Trees

↓

Interactive Quiz

↓

Knowledge Check

↓

Summary

↓

Further Reading

---

# Hero Section

Large Hero

Title

Subtitle

Difficulty

Estimated Time

Engineering Domain

Prerequisites

Version

Last Updated

Buttons

Start Learning

Engineering Notes

Take Quiz

Bookmark

---

# Learning Objectives

Cards

Example

After completing this lesson you will understand

✓ Concept

✓ Design Rules

✓ Engineering Calculations

✓ Practical Applications

✓ Common Failures

✓ Industry Standards

---

# Topic Overview

Create a professional overview.

Use

Illustration

Short explanation

Animated SVG

Real product photograph placeholder

Important engineering note

Common misconception

---

# Interactive Concept Explorer

Instead of paragraphs

Create

Cards

Hover effects

Expand

Collapse

Click animations

Interactive diagrams

Each concept shall explain

What

Why

How

When

Advantages

Disadvantages

Applications

Failure Modes

Best Practices

---

# Visual Learning

Every important concept shall contain

Engineering illustration

Animated SVG

High-quality image placeholder

Exploded view

Block diagram

Signal flow

Current flow

Field distribution

Heat flow

Return path

PCB layout

Real PCB photo placeholder

Oscilloscope screenshot placeholder

Simulation screenshot placeholder

---

# Images

Every topic should contain

Professional engineering illustrations.

Examples

PCB layouts

Oscilloscope captures

Eye diagrams

Simulation outputs

Current loops

EM field visualization

Thermal images

Power planes

Stackups

Cross sections

3D illustrations

Photographs

Component closeups

Connector images

Package images

CAD illustrations

Leave placeholders if assets are unavailable.

---

# Interactive SVG Diagrams

Create animated SVG diagrams.

Examples

Signal propagation

Current return

Magnetic field

Electric field

Noise coupling

Ground bounce

Reflection

Impedance discontinuity

Capacitor charging

Ferrite operation

Skin effect

Crosstalk

Power distribution

Switching current

Differential signals

Each diagram

Hover

Animate

Pause

Replay

Zoom

Highlight labels

Tooltips

---

# Plotly Charts

Use Plotly wherever numerical relationships improve understanding.

Examples

Frequency Response

Impedance

Power Dissipation

Voltage

Current

Eye Diagram

Insertion Loss

Reflection

Return Loss

Target Impedance

Noise Spectrum

Temperature Rise

Efficiency

EMI Spectrum

Switching Waveforms

PDN Impedance

Thermal Curve

Each chart should support

Zoom

Pan

Hover

Legend

Export PNG

Dark Theme

Light Theme

Responsive Layout

Annotations

Reference Lines

Engineering Notes

---

# Engineering Calculators

Include mini interactive calculators.

Examples

Transmission Line Delay

Impedance

Reflection Coefficient

Target Impedance

Power Loss

Voltage Drop

Rise Time

Current Density

Skin Depth

Decoupling Capacitor

RC Filter

Ferrite Selection

Return Loss

Each calculator shall explain

Formula

Variables

Assumptions

Engineering meaning

Limitations

---

# Interactive Simulations

Include lightweight JavaScript simulations.

Examples

Move slider

Observe waveform

Change impedance

Observe reflections

Increase trace length

Observe delay

Move capacitor

Observe PDN impedance

Change dielectric

Observe impedance

Increase switching frequency

Observe EMI

Adjust termination

Observe eye opening

All simulations shall update live.

---

# Engineering Examples

Every topic should include

Beginner Example

Intermediate Example

Advanced Example

Real Industry Example

Medical

Automotive

Industrial

Consumer

Networking

Aerospace

---

# Design Review

Create

Correct Design

Incorrect Design

Animated comparison

Highlight differences

Engineering explanation

---

# Common Mistakes

Create cards.

Each card contains

Mistake

Symptoms

Root Cause

Why it happens

Correct Solution

PCB Example

Waveform

Reference

---

# Engineering Myths

Examples

Higher capacitance is always better.

Ground plane eliminates EMI.

Ferrite beads always reduce noise.

Longer traces increase resistance only.

Add detailed explanation.

---

# Decision Tree

Interactive decision tree.

Example

Should I terminate?

↓

Frequency?

↓

Trace Length?

↓

Driver Type?

↓

Recommendation

Use clickable nodes.

---

# Interactive Quiz

MCQ

Drag and Drop

Image Based

Engineering Scenario

Waveform Recognition

PCB Review

Immediate feedback.

Explain every answer.

---

# Knowledge Check

Short engineering exercises.

Example

Given

Trace Length

Rise Time

Calculate

Reflection delay

Provide solution.

---

# Engineering Standards

Display relevant standards.

Examples

IPC

IEC

JEDEC

IEEE

CISPR

MIL

ISO

RoHS

REACH

Explain why they matter.

---

# References

Books

Application Notes

White Papers

Manufacturer Guides

IEEE Papers

Videos

Standards

---

# Accessibility

WCAG AA

Keyboard Navigation

Screen Reader

Reduced Motion

Dark Mode

Responsive

---

# Performance

Lazy loading

Deferred images

Optimized Plotly

SVG animations

Fast rendering

---

# JavaScript Architecture

main.js

charts.js

animations.js

quiz.js

simulation.js

calculator.js

help.js

No inline JavaScript.

---

# CSS

Reuse global CSS.

Create only topic-specific stylesheet.

No duplicate styles.

---

# Responsiveness

Desktop

Laptop

Tablet

Mobile

Landscape

Portrait

---

# Export

Allow

Print Lesson

Download PDF

Export Notes

Bookmark

Share

Save Progress

---

# Future Ready

The architecture should support automatically generating pages for **any engineering topic** by simply changing a structured JSON/Markdown content file, without modifying the HTML layout or JavaScript.

Separate:

- Content
- Layout
- Interactions
- Charts
- Simulations
- Quiz
- Images

This enables the same page template to become a reusable interactive learning platform for the entire Rising Edge Technologies website.

---

# Definition of Done

The page is complete only if it:

- Uses `/Template/content.html` as the base layout.
- Reuses all global assets and components.
- Avoids large blocks of plain text.
- Uses images, SVGs, Plotly charts, and animations extensively.
- Includes interactive calculators and simulations where applicable.
- Explains concepts from first principles through practical applications.
- Includes engineering examples, myths, common mistakes, and design reviews.
- Provides quizzes and knowledge checks with detailed feedback.
- Is fully responsive, accessible, modular, and production-ready.
- Can be reused for any engineering topic by changing only the content source.