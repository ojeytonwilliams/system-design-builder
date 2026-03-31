---
name: project-planner
description: Use this skill when a user needs planning artifacts before implementation: a concise project summary, a PRD, and an implementation-ready TODO plan. Use for new project definition, scope refinement, and requirement decomposition. Do not use for debugging, direct coding, or implementation-only requests.
compatibility: Requires ability to write markdown files in ./plans and optional web access for market or technology research.
---

# Project Planner

Generate planning artifacts only. Do not implement product code while this skill is active.

All decisions must be recorded in files under `./plans/<project-name>/`.

## When to use this skill

Use this skill when the user asks for any of the following before coding:

- project scoping or definition
- requirements clarification
- PRD creation
- decomposition into implementation-ready tasks

Do **not** use this skill when the user only wants:

- bug fixes
- direct implementation
- test/debug/build assistance without planning artifacts

## Required outputs

Write these files in order:

1. `./plans/<project-name>/summary.md`
2. `./plans/<project-name>/prd.md`
3. `./plans/<project-name>/todo.md`

Use templates from:

- `assets/summary-template.md`
- `assets/prd-template.md`
- `assets/todo-template.md`

If user preferences conflict with templates, preserve user intent and still keep all required sections.

## Workflow

Follow this sequence exactly:

1. Discovery
2. Refinement
3. Summary
4. PRD
5. TODO Plan
6. Final Consistency Check

### Discovery

Ask for missing core inputs:

- project name
- target users
- problem statement
- goals and non-goals
- constraints (compliance, platform)
- success metrics

Ask up to 5 focused questions per turn. Prefer defaults over large option menus.

If the user does not provide an answer after one follow-up attempt, proceed with explicit assumptions and record them in `summary.md` under “Open Questions & Assumptions”.

### Refinement

Use research only when needed (e.g. unknown domain or unclear technology tradeoffs).

When researching:

- prioritize official docs and reputable recent sources
- summarize findings in terms of user goals, risks, and differentiation
- propose one default recommendation plus up to two alternatives

Do not force research if the user already has clear constraints and stack decisions.

Before moving on, confirm key decisions or list assumptions when confirmation is unavailable.

### Summary

Create `summary.md` using `assets/summary-template.md`.

Validation gate for Summary:

- has clear problem statement and target users
- includes goals and non-goals
- captures constraints and success metrics
- documents open questions and assumptions

If any item fails, revise before proceeding.

### Product Requirements Document

Create `prd.md` using `assets/prd-template.md`, grounded in `summary.md`.

Validation gate for PRD:

- each requirement is testable
- user stories are present in table format
- functional and non-functional requirements are separated
- acceptance criteria are observable
- out-of-scope section is explicit

If any item fails, revise before proceeding.

### TODO Plan

Create `todo.md` using `assets/todo-template.md`, grounded in `prd.md`.

The TODO list must use explicit task types:

- `CODE:` for implementation features
- `TASK:` for non-coding work (validation, docs, review, configuration, release checks)

Rules for TODO generation:

- one feature per `CODE` item
- every `CODE` item includes exactly one `Feature:` line
- every `CODE` item includes at least one concrete `Acceptance` bullet
- avoid vague verbs like “improve”, “optimize”, or “handle better” without measurable criteria
- order tasks from foundational to dependent

Validation gate for TODO:

- every PRD requirement maps to at least one TODO item
- dependencies are reflected in phase ordering
- acceptance criteria are testable from output behavior

### Final Consistency Check

Run this checklist before stopping:

1. `summary.md` constraints, goals, and assumptions are reflected in `prd.md`
2. each PRD requirement appears in `todo.md`
3. no TODO item introduces scope absent from PRD unless marked “Stretch”
4. terminology is consistent across all files (roles, feature names, metrics)

If inconsistencies exist, list them clearly and propose exact corrections.

## Interaction policy

- Ask concise, high-value questions.
- Produce drafts early, then refine.

## Gotchas

- Users often provide goals but omit constraints; always ask or assume explicitly.
- “Build X” requests often hide non-goals; capture what will **not** be built.
- Requirements frequently mix outcomes and implementation details; separate them.
- TODO items often become vague; enforce measurable acceptance criteria.
- PRDs can drift from summary decisions; run the final consistency check every time.

## Formatting

User stories must be shown as:

| As a… | I want to… | So that… |
|---|---|---|
| user | open the game in my browser immediately | I don't have to install anything |

The last row is an example.
