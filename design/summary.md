# System Design Builder — Summary

## One-Sentence Definition

An HTML5 visual learning game where players build a company website from an empty grid, discover bottlenecks through failure, and learn system design by iterating on a living architecture.

## Problem

Most system design learning materials are abstract, text-heavy, and disconnected from real cause-and-effect. Beginners memorise terms like cache, database, and load balancer without understanding why they exist, when they're needed, or what failure looks like under growth.

## Goal

Teach foundational system design concepts through interactive play — making traffic, bottlenecks, reliability, and scaling into visible, hands-on game mechanics.

## Target Audience

- **Primary**: Beginners learning web architecture, students, junior developers, curious learners who enjoy simulation/strategy games
- **Secondary**: Educators wanting a visual teaching aid; non-technical product/design learners

## Platform

HTML5 browser game — responsive for desktop and mobile (portrait and landscape), drag-and-drop interaction, no installation required.

## Core Pillars

1. **Start empty** — blank dotted-grid canvas, feels like a design workspace
2. **Learn the minimum first** — brief, actionable onboarding; no assumed prior knowledge
3. **Learn through failure** — allow poor choices; show consequences (overload, dropped requests)
4. **Make bottlenecks visible** — overloaded nodes turn red/coral, flow lines crowd
5. **Reveal rules gradually** — mechanics and components unlock as the player encounters the need
6. **Stay visually clear** — components use recognisable technical iconography

## Gameplay Loop

The core loop is **Diagnose → Fix → Simulate**:

1. **Diagnose** — each level opens with a pre-built but failing architecture; observe overloads and identify the bottleneck.
2. **Fix** — edit the architecture within the monthly budget constraint (swap components, add nodes, reconnect).
3. **Simulate** — launch traffic; watch the live req/sec ramp up; sustain the target req/sec for 10 seconds with zero drops to win.

Reach the level's traffic target to complete it and unlock the next concept.

## Playable Level Runtime

- Levels are hand-authored with **failing** starting layouts (initial nodes/edges that are deliberately under-powered or mis-wired).
- The game always shows active level context during play (level number/title, objective, traffic target, and live req/sec).
- Continue and Replay load/reset the correct level session state.
- On startup, the player resumes at the first incomplete level from `localStorage` progress.
- Start Traffic is blocked when architecture is not runnable, with a short actionable hint.

## Complexity Progression (6 Levels)

1. Server overloaded — vertical scaling (swap to a larger server)
2. Traffic imbalance — load balancing
3. DB bottleneck — database capacity
4. Too many DB reads — caching
5. Budget optimisation — right-sizing components
6. Full architecture under high traffic — combining all concepts

## Budget & Costs

- Each level has a fixed monthly infrastructure budget (e.g. $100–$300/mo)
- Components have monthly costs inspired by real-world cloud pricing (AWS/GCP)
- Two server sizes: Small ($20/mo · 50 req/s) and Large ($80/mo · 150 req/s)
- Remaining budget and total monthly cost are always visible in the top bar
- **Win condition**: sustain the traffic target (req/sec) for 10 continuous seconds with zero dropped requests
- End-of-level screen shows a score (budget efficiency) and named feedback on what the player demonstrated

## Visual Style

Clean flat illustration · dark navy outlines · soft coral/red accents · warm off-white background · rounded shapes · icon-led · minimal shading · friendly and modern. See `image.png`.

## Technologies

- **Astro** — site framework; lightweight shell with React islands
- **React** — UI components (palette, inspector, overlays)
- **React Flow** — game canvas; handles node placement, animated directional edges, and port-based connections

No backend required for v1; all state is client-side with `localStorage` persistence.

## v1 Scope

**In:** two server sizes, database (small + large), cache, load balancing, budget-constrained design, linear traffic growth, failing-start pedagogy, req/sec as primary metric

**Out:** queues/background jobs, sharding, multi-region failover, distributed consensus, DDoS/security depth, advanced observability, competitive multiplayer, revenue accumulation mechanic
