---
title: What is Signal Integrity?
slug: what-is-signal-integrity
summary: Why signal quality on a PCB trace degrades at high data rates, and the main effects — reflections, crosstalk, and ground bounce — engineers manage to prevent it.
category: Fundamentals
tags: signal-integrity, pcb, basics
author: Rising Edge Technologies
date: 2026-07-10
readTime: 3 min
---

# What is Signal Integrity?

Signal integrity (SI) is the study of how well an electrical signal
preserves its intended shape, timing, and amplitude as it travels from a
driver to a receiver. At low frequencies, a PCB trace behaves like a simple
wire. As edge rates climb, the same trace starts behaving like a
transmission line — and that's where signal integrity problems begin.

## Why It Matters

A signal that looks clean at the driver can arrive at the receiver
distorted enough to be misread as the wrong logic level, corrupting data,
causing intermittent link errors, or triggering EMI compliance failures.
These problems often only appear at full clock speed or under specific
temperature/voltage conditions, making them notoriously hard to debug after
the board is built — which is why SI is addressed at the layout stage, not
after.

## How It Works

Three effects dominate most SI problems:

- **Reflections** — when a trace's characteristic impedance doesn't match
  the driver, receiver, or a via/connector along the path, part of the
  signal energy reflects back instead of continuing forward, ringing on top
  of the intended waveform.
- **Crosstalk** — energy coupling from one trace into a neighboring trace
  via shared electric and magnetic fields, worse with tighter spacing,
  longer parallel runs, and faster edges.
- **Ground bounce** — voltage shift on a "ground" reference caused by
  switching current through shared return-path inductance, which shows up
  as noise on every signal referenced to that ground.

The common thread: whether a trace needs transmission-line treatment
(controlled impedance, termination, careful return-path routing) depends on
the signal's **edge rate**, not its clock frequency — a slow clock with fast
edges can be just as SI-sensitive as a fast clock.

## A Quick Example

A 10 MHz clock with a 1 ns rise time has an equivalent bandwidth of roughly
350 MHz (using BW ≈ 0.35/tr). At that bandwidth, a trace only a few
centimeters long can already exceed the λ/6 critical-length rule of thumb,
meaning it needs transmission-line design treatment even though "10 MHz"
sounds slow.

## Common Mistake

Assuming a low clock frequency means signal integrity doesn't apply. What
matters is the edge transition time, not the repetition rate — a slow,
sluggish clock is far more forgiving than a slow clock driven through a
fast, sharp-edged buffer.

## Summary

Signal integrity is about preserving signal shape and timing across a
transmission path, driven primarily by edge rate rather than clock
frequency. Reflections, crosstalk, and ground bounce are the three effects
most layout decisions are trying to control.

For a deeper technical treatment, see [Why "Slow" Clocks Still Need SI Discipline](../../resources/slow-clock-si-myth.html).
