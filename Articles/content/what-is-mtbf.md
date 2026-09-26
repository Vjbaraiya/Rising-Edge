---
title: What is MTBF?
slug: what-is-mtbf
summary: A plain-language introduction to Mean Time Between Failures, why it's a statistical average rather than a guarantee, and how it's actually calculated.
category: Reliability
tags: mtbf, reliability, fit-rate
author: Rising Edge Technologies
date: 2026-07-13
readTime: 3 min
---

# What is MTBF?

MTBF (Mean Time Between Failures) is the average time a repairable system is
expected to operate between one failure and the next. It is a statistical
average across a population of identical units, not a promise about any
single unit — a product rated at 500,000 hours MTBF can still fail in its
first week.

## Why It Matters

MTBF is often misread as "the product will last this long." In reality it
describes the failure rate during a system's useful life (the flat middle of
the bathtub curve), assuming a constant, random failure rate. Confusing MTBF
with expected product lifetime leads to over-optimistic warranty terms and
under-provisioned spare-parts planning.

## How It Works

MTBF is derived from a failure rate, usually expressed in FIT (Failures In
Time — failures per billion device-hours):

```
λ (failure rate, /hour) = Total FIT × 10⁻⁹
MTBF (hours) = 1 / λ
```

Each component in an assembly contributes a base FIT rate (from a standard
like MIL-HDBK-217F, Telcordia SR-332, or IEC 61709), adjusted by factors for
operating temperature, environment, and quality grade. Summing the adjusted
FIT across every component gives the assembly's total FIT, and therefore its
MTBF.

## A Quick Example

A board with a total adjusted FIT of 2,000 has:

```
λ = 2,000 × 10⁻⁹ = 2×10⁻⁶ failures/hour
MTBF = 1 / (2×10⁻⁶) = 500,000 hours ≈ 57 years
```

That does not mean each unit lasts 57 years — it means that, across a large
population of these boards operating continuously, failures occur at an
average rate of one per 500,000 device-hours.

## Common Mistake

Treating MTBF as a warranty-length prediction. MTBF assumes a constant
failure rate (no wear-out), which only holds during the useful-life phase of
the bathtub curve. Wear-out mechanisms — electrolytic capacitor drying,
connector fatigue, mechanical relay wear — eventually raise the failure rate
again, and MTBF alone won't tell you when.

## Summary

MTBF is a population-level statistical average derived from summed component
failure rates, not a guarantee for an individual unit. Use it to compare
design alternatives and estimate fleet-level failure rates — pair it with
Weibull/bathtub-curve analysis if you need to reason about wear-out and
warranty risk.

Try the full [MTBF & Reliability Calculator](../../Tools/MTBF_Calculator/mtbf-calculator.html) for a component-level, standards-based estimate.
