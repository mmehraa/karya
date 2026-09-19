"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { getDashboardContext } from "@/modules/business/dashboard-context";
import {
  createOrder,
  updateOrder,
} from "./services";
import {
  CreateOrderSchema,
  UpdateOrderSchema,
} from "./validation";
import type {
  CreateOrderInput,
  UpdateOrderInput,
} from "./validation";
import type { SerializedOrder } from "./types";

interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

export async function createOrderAction(
  input: CreateOrderInput
): Promise<ActionResponse<SerializedOrder>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed = CreateOrderSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid order data.",
      };
    }

    const order = await createOrder(businessId, parsed.data);

    revalidatePath("/orders");
    revalidatePath("/customers");
    revalidatePath("/inventory");
    revalidatePath("/products");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: order,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.message === "Customer not found." ||
        error.message ===
          "One or more selected products could not be found." ||
        error.message === "Selected product not found."
      )
    ) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (
      error instanceof Error &&
      (
        error.message.includes("not active") ||
        error.message.includes("unit economics") ||
        error.message.includes("Discount cannot") ||
        error.message.includes("Insufficient stock") ||
        error.message.includes("Product not found") ||
        error.message.includes("Quantity must")
      )
    ) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error:
          "The order number already exists. Please try again.",
      };
    }

    console.error("createOrderAction error:", error);

    return {
      success: false,
      error:
        "Unable to create the order. Please try again.",
    };
  }
}

export async function updateOrderAction(
  input: UpdateOrderInput
): Promise<ActionResponse<SerializedOrder>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed = UpdateOrderSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid order update.",
      };
    }

    const order = await updateOrder(
      businessId,
      parsed.data
    );

    revalidatePath("/orders");
    revalidatePath("/customers");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: order,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "Order not found." ||
        error.message.includes(
          "cancellation requires the dedicated"
        )
      ) {
        return {
          success: false,
          error: error.message,
        };
      }
    }

    console.error("updateOrderAction error:", error);

    return {
      success: false,
      error:
        "Unable to update the order. Please try again.",
    };
  }
}