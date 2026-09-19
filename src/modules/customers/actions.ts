"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getDashboardContext } from "@/modules/business/dashboard-context";
import {
  createCustomer,
  updateCustomer,
} from "./services";
import {
  CreateCustomerSchema,
  UpdateCustomerSchema,
  type CreateCustomerInput,
  type UpdateCustomerInput,
} from "./validation";
import type { SerializedCustomer } from "./types";

export interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Creates a customer within the active business context.
 */
export async function createCustomerAction(
  input: CreateCustomerInput
): Promise<ActionResponse<SerializedCustomer>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed = CreateCustomerSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid customer input",
      };
    }

    const customer = await createCustomer(
      businessId,
      parsed.data
    );

    revalidatePath("/customers");
    revalidatePath("/sales");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: customer,
    };
  } catch (error) {
    console.error("Failed to create customer:", error);

    return {
      success: false,
      error:
        "An unexpected error occurred while creating the customer.",
    };
  }
}

/**
 * Updates an existing customer within the active business context.
 */
export async function updateCustomerAction(
  input: UpdateCustomerInput
): Promise<ActionResponse<SerializedCustomer>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed = UpdateCustomerSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid customer update input",
      };
    }

    const customer = await updateCustomer(
      businessId,
      parsed.data
    );

    revalidatePath("/customers");
    revalidatePath("/sales");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: customer,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return {
        success: false,
        error: "Customer not found or access denied.",
      };
    }

    console.error("Failed to update customer:", error);

    return {
      success: false,
      error:
        "An unexpected error occurred while updating the customer.",
    };
  }
}