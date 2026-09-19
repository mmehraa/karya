"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { getDashboardContext } from "@/modules/business/dashboard-context";

import {
  createTask,
  updateTask,
  deleteTask,
} from "./services";

import {
  CreateTaskSchema,
  UpdateTaskSchema,
} from "./validation";

import type {
  SerializedTask,
} from "./types";

export interface ActionResponse<
  T = undefined,
> {
  success: boolean;
  error?: string;
  data?: T;
}

export async function createTaskAction(
  input: unknown,
): Promise<ActionResponse<SerializedTask>> {
  try {
    const { businessId } =
      await getDashboardContext();

    const parsed =
      CreateTaskSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid task data.",
      };
    }

    const task = await createTask(
      businessId,
      parsed.data,
    );

    revalidatePath("/tasks");
    revalidatePath("/goals");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: task,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.message === "Goal not found." ||
        error.message === "Task not found."
      )
    ) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      return {
        success: false,
        error: "Unable to create the task.",
      };
    }

    console.error(
      "Failed to create task:",
      error,
    );

    return {
      success: false,
      error: "An unexpected error occurred.",
    };
  }
}

export async function updateTaskAction(
  input: unknown,
): Promise<ActionResponse<SerializedTask>> {
  try {
    const { businessId } =
      await getDashboardContext();

    const parsed =
      UpdateTaskSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid task data.",
      };
    }

    const task = await updateTask(
      businessId,
      parsed.data,
    );

    revalidatePath("/tasks");
    revalidatePath("/goals");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: task,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.message === "Goal not found." ||
        error.message === "Task not found."
      )
    ) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      return {
        success: false,
        error: "Unable to update the task.",
      };
    }

    console.error(
      "Failed to update task:",
      error,
    );

    return {
      success: false,
      error: "An unexpected error occurred.",
    };
  }
}

/**
 * Permanently deletes a task belonging to the
 * currently active business.
 */
export async function deleteTaskAction(
  taskId: string,
): Promise<ActionResponse> {
  try {
    const { businessId } =
      await getDashboardContext();

    if (
      typeof taskId !== "string" ||
      taskId.trim().length === 0
    ) {
      return {
        success: false,
        error: "Task ID is required.",
      };
    }

    await deleteTask(
      businessId,
      taskId,
    );

    revalidatePath("/tasks");
    revalidatePath("/goals");
    revalidatePath("/dashboard");

    return {
      success: true,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Task not found."
    ) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      return {
        success: false,
        error: "Unable to delete the task.",
      };
    }

    console.error(
      "Failed to delete task:",
      error,
    );

    return {
      success: false,
      error: "An unexpected error occurred.",
    };
  }
}