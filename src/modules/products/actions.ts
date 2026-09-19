"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getDashboardContext } from "@/modules/business/dashboard-context";
import { createProduct, updateProduct } from "./services";
import {
  CreateProductSchema,
  UpdateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from "./validation";
import type { SerializedProduct } from "./types";

export interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Server Action to create a new product.
 * Enforces server-side tenant scoping and friendly duplicate SKU handling using normalized data.
 */
export async function createProductAction(
  input: CreateProductInput
): Promise<ActionResponse<SerializedProduct>> {
  let normalizedSku: string | undefined;

  try {
    const { businessId } = await getDashboardContext();

    const parsed = CreateProductSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid product input",
      };
    }

    normalizedSku = parsed.data.sku;
    const product = await createProduct(businessId, parsed.data);

    revalidatePath("/products");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: product,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          success: false,
          error: `A product with SKU "${normalizedSku || input.sku}" already exists in your catalog.`,
        };
      }
    }

    console.error("Failed to create product:", error);
    return {
      success: false,
      error: "An unexpected error occurred while creating the product.",
    };
  }
}

/**
 * Server Action to update an existing product.
 * Guarantees that updates cannot cross business tenant boundaries.
 */
export async function updateProductAction(
  input: UpdateProductInput
): Promise<ActionResponse<SerializedProduct>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed = UpdateProductSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid update input",
      };
    }

    const product = await updateProduct(businessId, parsed.data);

    revalidatePath("/products");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: product,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          success: false,
          error: "That SKU is already used by another product in your catalog.",
        };
      }
      if (error.code === "P2025") {
        return {
          success: false,
          error: "Product not found or access denied.",
        };
      }
    }

    console.error("Failed to update product:", error);
    return {
      success: false,
      error: "An unexpected error occurred while updating the product.",
    };
  }
}