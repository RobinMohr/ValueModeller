export type TaskPriority = 1 | 2 | 3 | 4;
export type TaskType = 'improvement' | 'problem' | 'idea';
export type TaskState = 'todo' | 'in-progress' | 'developed';
export type TaskOrigin = 'user' | 'ai' | 'user-assisted';

export interface Task {
  id: number;
  title: string;
  priority: TaskPriority;
  type: TaskType;
  state: TaskState;
  description: string;
  files: string[];
  origin: TaskOrigin;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  priority: TaskPriority;
  type: TaskType;
  state: TaskState;
  description: string;
  files: string[];
  origin: TaskOrigin;
}

export interface UpdateTaskInput {
  title?: string;
  priority?: TaskPriority;
  type?: TaskType;
  state?: TaskState;
  description?: string;
  files?: string[];
  origin?: TaskOrigin;
}

export interface TaskSummary {
  total: number;
  by_state: Record<TaskState, number>;
  by_priority: Record<string, number>;
  by_origin: Record<TaskOrigin, number>;
}

export interface TaskListResponse {
  tasks: Task[];
  summary: TaskSummary;
}
