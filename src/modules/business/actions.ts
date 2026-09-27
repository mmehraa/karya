
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { createBusiness } from "@/modules/business/services";
import { setActiveBusinessId } from "@/modules/business/tenant-resolution";

const onboardingProductSchema = z.object({
  name: z.string().trim().min(1, "Product/service name is required."),
  description: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  sellingPrice: z.string().trim().optional(),
  cogs: z.string().trim().optional(),
  packagingCost: z.string().trim().optional(),
  variableCost: z.string().trim().optional(),
});

const createBusinessSchema = z.object({
  name: z.string().trim().min(1, "Business name is required."),
  slug: z.string().trim().min(1, "Business slug is required."),
  tagline: z.string().trim().optional(),
  description: z.string().trim().optional(),
  industry: z.string().trim().min(1, "Industry is required."),
  constitution: z.string().trim().optional(),
  countryCode: z.string().trim().min(1, "Country is required."),
  currencyCode: z.string().trim().min(1, "Currency code is required."),
  currencySymbol: z.string().trim().min(1, "Currency symbol is required."),
  founderStageAssessmentId: z.number().int().min(0).max(8),
  products: z.array(onboardingProductSchema).max(100).default([]),
});

const switchBusinessSchema = z.object({
  businessId: z.string().trim().min(1, "Select a business."),
});

export type CreateBusinessActionInput = z.input<
  typeof createBusinessSchema
>;

export async function createBusinessAction(
  input: CreateBusinessActionInput,
) {
  const parsed = createBusinessSchema.safeParse(input);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];

    return {
      success: false,
      error: firstIssue?.message ?? "Invalid business information.",
    };
  }

  try {
    const business = await createBusiness({
      name: parsed.data.name,
      slug: parsed.data.slug,
      tagline: parsed.data.tagline,
      description: parsed.data.description,
      industry: parsed.data.industry,
      constitution: parsed.data.constitution,
      countryCode: parsed.data.countryCode,
      currencyCode: parsed.data.currencyCode,
      currencySymbol: parsed.data.currencySymbol,
      founderStageAssessmentId: parsed.data.founderStageAssessmentId,
      products: parsed.data.products.map((product) => ({
        name: product.name,
        description: product.description,
        sku: product.sku,
        sellingPrice: product.sellingPrice,
        cogs: product.cogs,
        packagingCost: product.packagingCost,
        variableCost: product.variableCost,
      })),
    });

    // Set the active business only after the database transaction succeeds.
    await setActiveBusinessId(business.id);

    return {
      success: true,
      businessId: business.id,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("already exists")
    ) {
      return {
        success: false,
        error: error.message,
      };
    }

    console.error("Business creation failed:", error);

    return {
      success: false,
      error: "We couldn't create the business. Please try again.",
    };
  }
}

/**
 * Validates that the requested business exists, sets it as active,
 * and navigates to the dashboard.
 */
export async function switchBusinessAction(formData: FormData) {
  const parsed = switchBusinessSchema.safeParse({
    businessId: formData.get("businessId"),
  });

  if (!parsed.success) {
    redirect("/select-business");
  }

  const business = await db.business.findUnique({
    where: {
      id: parsed.data.businessId,
    },
    select: {
      id: true,
    },
  });

  if (!business) {
    redirect("/select-business");
  }

  await setActiveBusinessId(business.id);

  redirect("/dashboard");
}