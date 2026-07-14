---
inclusion: fileMatch
fileMatchPattern: "src/components/form/**"
---

# SIPOC Form & Side Panel — Implementation Guide

## Purpose

When a user clicks a node on the canvas, a side panel opens showing a structured form for the five SIPOC fields. This is the primary data-entry surface.

## Panel Behavior

- Opens on the right side of the screen (fixed width, ~400px)
- Slides in/out with a smooth transition
- Shows which node is currently being edited (node name in panel header)
- Can be closed via X button or clicking elsewhere on the canvas
- Auto-saves on field blur (no explicit save button needed for MVP)

## Form Fields

| Field | Input Type | Placeholder / Help Text |
|-------|-----------|------------------------|
| Process | Text input | "What activity or transformation is performed?" |
| Supplier | Textarea | "Who provides the inputs to this process?" |
| Input | Textarea | "What materials, data, or resources enter?" |
| Output | Textarea | "What does this process produce?" |
| Customer | Textarea | "Who receives the outputs?" |

**Note:** Process name is shown first as the "title" of the step. The order is intentionally Process-first (not S-I-P-O-C order) because the process name is what identifies the node.

## Accessibility Requirements

- All fields must have associated `<label>` elements
- Tab order follows visual order (top to bottom)
- Focus should move to the first field when the panel opens
- Escape key closes the panel
- ARIA: `role="complementary"`, `aria-label="SIPOC Details"`

## State Integration

- Form reads from and writes to the Zustand graph store
- Use the selected node ID to look up current SIPOC data
- Updates are applied immediately (controlled inputs bound to store)
- Debounce localStorage persistence (don't save on every keystroke)

## Component Structure

```
src/components/form/
├── sipoc-panel.tsx        # Panel container (open/close, header)
├── sipoc-form.tsx         # The form with all five fields
└── sipoc-field.tsx        # Reusable labeled textarea/input component
```

## Empty State

When no node is selected, the panel either:
- Is hidden (collapsed), OR
- Shows a prompt: "Select a process node to view its SIPOC details"
