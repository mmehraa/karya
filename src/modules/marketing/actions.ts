"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getDashboardContext } from "@/modules/business/dashboard-context";
import {
  createContentItem,
  createContentPublication,
  updateContentItem,
  updateContentPublication,
} from "./services";
import {
  CreateContentSchema,
  CreatePublicationSchema,
  UpdateContentSchema,
  UpdatePublicationSchema,
} from "./validation";
import type {
  CreateContentInput,
  CreatePublicationInput,
  UpdateContentInput,
  UpdatePublicationInput,
} from "./validation";
import type {
  SerializedContentItem,
  SerializedContentPublication,
} from "./types";

export interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

export async function createContentAction(
  input: CreateContentInput
): Promise<ActionResponse<SerializedContentItem>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed = CreateContentSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid content data.",
      };
    }

    const contentItem = await createContentItem(
      businessId,
      parsed.data
    );

    revalidatePath("/marketing");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: contentItem,
    };
  } catch (error) {
    console.error("createContentAction error:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to create content.",
    };
  }
}

export async function updateContentAction(
  input: UpdateContentInput
): Promise<ActionResponse<SerializedContentItem>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed = UpdateContentSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid content data.",
      };
    }

    const contentItem = await updateContentItem(
      businessId,
      parsed.data
    );

    revalidatePath("/marketing");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: contentItem,
    };
  } catch (error) {
    console.error("updateContentAction error:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to update content.",
    };
  }
}

export async function createPublicationAction(
  input: CreatePublicationInput
): Promise<ActionResponse<SerializedContentPublication>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed = CreatePublicationSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid publication data.",
      };
    }

    const publication = await createContentPublication(
      businessId,
      parsed.data
    );

    revalidatePath("/marketing");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: publication,
    };
  } catch (error) {
    console.error("createPublicationAction error:", error);

    if (
      error instanceof Error &&
      error.message === "Content item not found."
    ) {
      return {
        success: false,
        error: "Content item not found or access denied.",
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to create publication.",
    };
  }
}

export async function updatePublicationAction(
  input: UpdatePublicationInput
): Promise<ActionResponse<SerializedContentPublication>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed = UpdatePublicationSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid publication data.",
      };
    }

    const publication = await updateContentPublication(
      businessId,
      parsed.data
    );

    revalidatePath("/marketing");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: publication,
    };
  } catch (error) {
    console.error("updatePublicationAction error:", error);

    if (
      error instanceof Error &&
      error.message === "Content publication not found."
    ) {
      return {
        success: false,
        error: "Publication not found or access denied.",
      };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return {
        success: false,
        error: "Unable to update the publication.",
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to update publication.",
    };
  }
}