/**
 * Task Validation Schemas — Zod
 *
 * Defines schemas for validating task data in the Task API.
 * Matches the task JSON file format used by TecFactory agents.
 */

import { z } from 'zod';

/** 8-character lowercase hexadecimal string (e.g., "a0e1b2c3") */
const taskIdSchema = z.string().regex(/^[0-9a-f]{8}$/, 'Must be an 8-character hexadecimal string');

/** Task priority: 1 (critical) through 4 (low) */
const taskPrioritySchema = z.number().int().min(1).max(4);

/** Task type enum */
const taskTypeSchema = z.enum(['improvement', 'problem', 'idea']);

/** Task state enum */
const taskStateSchema = z.enum(['todo', 'in-progress', 'developed']);

/** Task origin — who created the task */
const taskOriginSchema = z.enum(['user', 'ai', 'user-assisted']);

/**
 * Full task schema — represents a complete task object as stored on disk.
 */
export const taskSchema = z.object({
  id: taskIdSchema,
  title: z.string().min(1).max(200),
  priority: taskPrioritySchema,
  type: taskTypeSchema,
  state: taskStateSchema,
  description: z.string(),
  files: z.array(z.string()),
  origin: taskOriginSchema,
});

/** TypeScript type inferred from the full task schema */
export type Task = z.infer<typeof taskSchema>;

/**
 * Schema for creating a new task.
 * The `id` field is omitted — it will be auto-generated server-side.
 */
export const createTaskSchema = taskSchema.omit({ id: true });

/** TypeScript type inferred from the create task schema */
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

/**
 * Schema for updating an existing task.
 * All fields are optional except `id`, which is required to identify the task.
 */
export const updateTaskSchema = taskSchema.partial().required({ id: true });

/** TypeScript type inferred from the update task schema */
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
