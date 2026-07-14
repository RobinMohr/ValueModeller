# Project Overview — Value Modeller

## What This Is

A web application for product owners to visualize and enter SIPOC process chains for value stream modelling. Users model branching and merging processes on an interactive canvas, with structured form-based data entry for each process node.

## Hackathon Context

- **Duration:** 2 days (July 14–15, 2026)
- **Team:** 4 people working in parallel
- **Goal:** MVP demo — interactive, presentable, functional

## Target Users

Product owners who are business domain experts. They understand processes but are not necessarily technical. The UI must be intuitive, visual, and accessible.

## MVP Scope (must ship)

- Interactive canvas with draggable SIPOC nodes
- Add/remove nodes and connections (supports branching & merging)
- Click a node → opens SIPOC detail form in a side panel
- Save/load model to browser localStorage
- Clean, presentable UI suitable for a live demo

## Explicitly Out of Scope

- Real-time collaboration
- Backend / database
- Export (PDF/PNG/SVG)
- Version history
- Auth / user management

## Parallel Work Streams

| Stream | Focus |
|--------|-------|
| A — Canvas & Graph | Diagram canvas, node/edge rendering, drag-and-drop, branching/merging |
| B — SIPOC Form & State | Side panel form, data model, state management, persistence |
| C — Shell & Integration | Project scaffold, routing, layout shell, glue code, demo data |

## Key Design Decisions

- **Hybrid interaction model:** Canvas for topology + Form for structured SIPOC data entry
- **Why canvas:** Branching/merging is spatial; business users need visual feedback
- **Why form:** SIPOC has structured multi-field data; forms are more accessible (keyboard nav, screen readers)
