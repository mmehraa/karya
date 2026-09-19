import type {
  Priority,
  TaskStatus,
} from "@prisma/client";

export interface SerializedTask {
  id: string;
  businessId: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  dueDate: Date | null;
  goalId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskListItem {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  dueDate: Date | null;
  goalId: string | null;
  goalName: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface TaskGoalOption {
  id: string;
  name: string;
}

export interface TasksSummary {
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
}