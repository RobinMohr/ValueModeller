# Value Modeller

## Overview

A web application that allows product owners to visualize and enter SIPOC process chains for value stream modelling. Users can model branching and merging processes, not just linear ones.

## Target Users

- **Primary users:** Product owners who are experts in the business context
- **Technical level:** Business experts, not necessarily technical

## Core Concepts

### SIPOC

Each process node in the value stream captures five categories:

| Element    | Description                                      |
|------------|--------------------------------------------------|
| Supplier   | Who provides the inputs to this process          |
| Input      | What materials, data, or resources enter         |
| Process    | The activity or transformation being performed   |
| Output     | What the process produces                        |
| Customer   | Who receives the outputs                         |

### Value Stream Chain

Processes are connected into a directed graph where one process's **Output** feeds the next process's **Input**. The graph supports:

- **Linear sequences** (A -> B -> C)
- **Branching** (one process feeds multiple downstream processes)
- **Merging** (multiple processes feed into a single downstream process)

## Interaction Model (Proposed)

**Hybrid: Canvas + Form**

- **Diagram canvas** for topology -- nodes represent processes, connections represent output-to-input flow. Branching and merging are modeled visually here.
- **Side panel / form** for SIPOC detail entry -- clicking a node opens structured fields for Supplier, Input, Process, Output, and Customer.

### Rationale

- Branching/merging is inherently spatial; a canvas makes this intuitive for business users.
- SIPOC has structured multi-field data that's best captured in a form rather than crammed into diagram nodes.
- The data-entry surface stays form-based, which is more accessible (keyboard nav, screen readers).

## Open Questions

- [ ] **Scale:** What's the expected size of a typical value stream model? (5-15 nodes? Dozens to hundreds?)
- [ ] **Collaboration:** Single-user per model, async multi-user, or real-time collaborative editing?
- [ ] **Persistence:** Where should models be stored? (Local browser storage, cloud/database, file export?)
- [ ] **Export/Sharing:** Do users need to export diagrams (PDF, PNG, SVG) or share links?
- [ ] **Versioning:** Should there be version history or change tracking on models?

## Technology (TBD)

Candidates to evaluate when starting implementation:

| Concern           | Options to consider                                      |
|-------------------|----------------------------------------------------------|
| Frontend          | React, Vue, Svelte                                       |
| Diagram library   | React Flow, JointJS, Cytoscape.js, D3                    |
| State management  | Zustand, Redux, Pinia (if Vue)                           |
| Backend (if any)  | Node/Express, serverless functions                       |
| Storage           | IndexedDB (offline-first), PostgreSQL, Firebase          |

## Hackathon Constraints

| Constraint       | Detail                                                                 |
|------------------|------------------------------------------------------------------------|
| **Duration**     | 2 days (July 14-15, 2026)                                             |
| **Team size**    | 4 people                                                               |
| **Execution**    | Tasks must be parallelized across the team wherever possible            |
| **Scope**        | MVP only -- cut anything that isn't essential for a working demo        |
| **Decisions**    | Make fast, pragmatic choices; avoid analysis paralysis                  |

### Parallel Work Streams (suggested split)

| Stream | Owner(s) | Focus |
|--------|----------|-------|
| **A -- Canvas & Graph** | 1-2 devs | Diagram canvas, node/edge rendering, drag-and-drop, branching/merging topology |
| **B -- SIPOC Form & State** | 1 dev | Side panel form, data model, state management, persistence |
| **C -- Shell & Integration** | 1 dev | Project scaffold, routing, layout shell, glue between canvas and form, demo data |

### MVP Scope (what to ship in 2 days)

- Interactive canvas with draggable SIPOC nodes
- Add/remove nodes and connections (branch & merge)
- Click a node to open a SIPOC detail form
- Save/load model to browser localStorage
- Clean, presentable UI for demo

### Explicitly Out of Scope (for now)

- Real-time collaboration
- Backend / database
- Export (PDF/PNG)
- Version history
- Auth / user management

## Next Steps

1. Answer the open questions above
2. Finalize interaction model and technology choices
3. Create requirements spec (requirements.md)
4. Create design spec (design.md)
5. Break down into implementation tasks (tasks.md)
