import { z } from 'zod';

const prioritySchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
const typeSchema = z.enum(['improvement', 'problem', 'idea']);
const stateSchema = z.enum(['todo', 'in-progress', 'developed']);
const originSchema = z.enum(['user', 'ai', 'user-assisted']);

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  priority: prioritySchema,
  type: typeSchema,
  state: stateSchema,
  description: z.string().default(''),
  files: z.array(z.string()).default([]),
  origin: originSchema,
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  priority: prioritySchema.optional(),
  type: typeSchema.optional(),
  state: stateSchema.optional(),
  description: z.string().optional(),
  files: z.array(z.string()).optional(),
  origin: originSchema.optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
