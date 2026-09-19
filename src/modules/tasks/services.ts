import {
  Prisma,
  Priority,
  TaskStatus,
} from "@prisma/client";

import { db } from "@/lib/db";

import type {
  CreateTaskInput,
  UpdateTaskInput,
} from "./validation";

import type {
  SerializedTask,
  TaskListItem,
  TasksSummary,
} from "./types";

function serializeTask(task: {
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
}): SerializedTask {
  return {
    id: task.id,
    businessId: task.businessId,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate,
    goalId: task.goalId,
    notes: task.notes,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export async function getTasks(
  businessId: string,
): Promise<SerializedTask[]> {
  const tasks = await db.task.findMany({
    where: {
      businessId,
    },
    orderBy: [
      {
        status: "asc",
      },
      {
        dueDate: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  return tasks.map(serializeTask);
}

export async function getTaskById(
  businessId: string,
  taskId: string,
): Promise<SerializedTask | null> {
  const task = await db.task.findFirst({
    where: {
      id: taskId,
      businessId,
    },
  });

  return task ? serializeTask(task) : null;
}

export async function getTaskList(
  businessId: string,
): Promise<TaskListItem[]> {
  const tasks = await db.task.findMany({
    where: {
      businessId,
    },
    include: {
      goal: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      {
        status: "asc",
      },
      {
        dueDate: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate,
    goalId: task.goalId,
    goalName: task.goal?.name ?? null,
    notes: task.notes,
    createdAt: task.createdAt,
  }));
}

export async function createTask(
  businessId: string,
  input: CreateTaskInput,
): Promise<SerializedTask> {
  if (input.goalId) {
    const goal = await db.goal.findUnique({
      where: {
        businessId_id: {
          businessId,
          id: input.goalId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!goal) {
      throw new Error("Goal not found.");
    }
  }

  const task = await db.task.create({
    data: {
      businessId,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? Priority.MEDIUM,
      status: input.status ?? TaskStatus.TODO,
      dueDate: input.dueDate ?? null,
      goalId: input.goalId ?? null,
      notes: input.notes ?? null,
    },
  });

  return serializeTask(task);
}

export async function updateTask(
  businessId: string,
  input: UpdateTaskInput,
): Promise<SerializedTask> {
  const existingTask = await db.task.findFirst({
    where: {
      id: input.id,
      businessId,
    },
    select: {
      id: true,
    },
  });

  if (!existingTask) {
    throw new Error("Task not found.");
  }

  if (input.goalId) {
    const goal = await db.goal.findUnique({
      where: {
        businessId_id: {
          businessId,
          id: input.goalId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!goal) {
      throw new Error("Goal not found.");
    }
  }

  const data: Prisma.TaskUpdateInput = {};

  if (input.title !== undefined) {
    data.title = input.title;
  }

  if (input.description !== undefined) {
    data.description = input.description;
  }

  if (input.priority !== undefined) {
    data.priority = input.priority;
  }

  if (input.status !== undefined) {
    data.status = input.status;
  }

  if (input.dueDate !== undefined) {
    data.dueDate = input.dueDate;
  }

  if (input.goalId !== undefined) {
    data.goal =
      input.goalId === null
        ? {
            disconnect: true,
          }
        : {
            connect: {
              businessId_id: {
                businessId,
                id: input.goalId,
              },
            },
          };
  }

  if (input.notes !== undefined) {
    data.notes = input.notes;
  }

  const result = await db.task.updateMany({
    where: {
      id: input.id,
      businessId,
    },
    data,
  });

  if (result.count === 0) {
    throw new Error("Task not found.");
  }

  const updatedTask = await db.task.findFirst({
    where: {
      id: input.id,
      businessId,
    },
  });

  if (!updatedTask) {
    throw new Error("Task not found.");
  }

  return serializeTask(updatedTask);
}

/**
 * Permanently deletes a task.
 *
 * The businessId is always supplied by the server-side tenant context.
 * This prevents a task belonging to another business from being deleted.
 */
export async function deleteTask(
  businessId: string,
  taskId: string,
): Promise<void> {
  const result = await db.task.deleteMany({
    where: {
      id: taskId,
      businessId,
    },
  });

  if (result.count === 0) {
    throw new Error("Task not found.");
  }
}

export async function getTasksSummary(
  businessId: string,
): Promise<TasksSummary> {
  const now = new Date();

  const [
    totalTasks,
    todoTasks,
    inProgressTasks,
    completedTasks,
    overdueTasks,
  ] = await Promise.all([
    db.task.count({
      where: {
        businessId,
      },
    }),

    db.task.count({
      where: {
        businessId,
        status: TaskStatus.TODO,
      },
    }),

    db.task.count({
      where: {
        businessId,
        status: TaskStatus.IN_PROGRESS,
      },
    }),

    db.task.count({
      where: {
        businessId,
        status: TaskStatus.DONE,
      },
    }),

    db.task.count({
      where: {
        businessId,
        status: {
          not: TaskStatus.DONE,
        },
        dueDate: {
          lt: now,
        },
      },
    }),
  ]);

  return {
    totalTasks,
    todoTasks,
    inProgressTasks,
    completedTasks,
    overdueTasks,
  };
}