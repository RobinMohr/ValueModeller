# Task System

All tasks live in `tasks/` as JSON files with the naming convention: `[priority]_[kebab-title].json`

## Default Template

Use `0_task_template.json` as the base for every new task. Copy it, rename it following the naming convention, and fill in the fields.

## Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | yes | Short descriptive title |
| `priority` | number | yes | 1 = critical, 2 = high, 3 = medium, 4 = low |
| `type` | enum | yes | `"improvement"` \| `"problem"` \| `"idea"` |
| `state` | enum | yes | `"todo"` \| `"in-progress"` \| `"developed"` |
| `description` | string | yes | Detailed description of what needs to be done |
| `files` | string[] | yes | Relevant source file paths |
| `origin` | enum | yes | Who created the task (see below) |

## Origin Field

The `origin` field tracks how a task was created.

| Value | Meaning |
|-------|---------|
| `"user"` | Created manually by a human team member |
| `"ai"` | Created autonomously by an AI agent (e.g. QA agent) |
| `"user-assisted"` | Created by a human with AI assistance (e.g. user prompted AI to create it) |

## Naming Convention

- File prefix = priority number
- Title part = kebab-case summary
- Examples: `1_fix-routing-bug.json`, `2_add-edge-labels.json`, `3_improve-node-colors.json`
- The `0_task_template.json` file is the template and should not be picked up by agents as a real task (prefix `0_`).
