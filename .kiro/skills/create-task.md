---
inclusion: manual
---

# Create Task

When the user asks to create a task, follow this process:

## Template

Read the template file at `tasks/0_task_template.json` to get the required JSON structure. Every new task MUST conform to this template.

#[[file:tasks/0_task_template.json]]

## Schema Rules

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | yes | Short descriptive title (max 100 chars) |
| `priority` | number | yes | 1 = critical, 2 = high, 3 = medium, 4 = low |
| `type` | enum | yes | `"improvement"` \| `"problem"` \| `"idea"` |
| `state` | enum | yes | Always `"todo"` for new tasks |
| `description` | string | yes | Detailed, actionable description |
| `files` | string[] | yes | Relevant source file paths (empty array if unsure) |
| `origin` | enum | yes | `"user"` if from human, `"user-assisted"` if AI helped create it, `"ai"` if fully autonomous |

## Naming Convention

File name format: `{priority}_{kebab-case-title}.json`

Examples:
- `1_fix-routing-bug.json`
- `2_add-edge-labels.json`
- `3_improve-node-colors.json`

## Process

1. Read the user's request and understand what they want done.
2. Optionally read relevant source files to identify affected paths for the `files` field.
3. Determine appropriate `priority` (default 2 unless urgency is clear) and `type`.
4. Set `state` to `"todo"`.
5. Set `origin` to `"user-assisted"` (since the user asked Kiro to create it).
6. Generate the task JSON and write it to `tasks/{priority}_{kebab-title}.json`.
7. Confirm creation to the user with the file path and a summary.

## Constraints

- Do NOT use type values outside the allowed enum (`"improvement"`, `"problem"`, `"idea"`). Use `"problem"` for bugs.
- The `files` field must always be present (use `[]` if no specific files are relevant).
- Keep titles concise and descriptive.
- Descriptions should be actionable — a developer should be able to implement from the description alone.
