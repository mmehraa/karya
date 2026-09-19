import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export interface CreateBusinessProductInput {
  name: string;
  description?: string;
  sku?: string;
  sellingPrice?: string;
  cogs?: string;
  packagingCost?: string;
  variableCost?: string;
}

export interface CreateBusinessInput {
  name: string;
  slug: string;
  tagline?: string | null;
  description?: string | null;
  industry: string;
  constitution?: string | null;
  countryCode: string;
  currencyCode: string;
  currencySymbol: string;
  founderStageAssessmentId: number;
  products?: CreateBusinessProductInput[];
}

function optionalDecimal(
  value: string | undefined,
): Prisma.Decimal | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new Error("Invalid monetary value.");
  }

  return new Prisma.Decimal(value);
}

function normalizeOptionalString(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
}

function generateProductSku(index: number) {
  return `PROD-${String(index + 1).padStart(3, "0")}`;
}

export async function createBusiness(input: CreateBusinessInput) {
  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  const industry = input.industry.trim();
  const countryCode = input.countryCode.trim().toUpperCase();
  const currencyCode = input.currencyCode.trim().toUpperCase();
  const currencySymbol = input.currencySymbol.trim();

  if (!name) {
    throw new Error("Business name is required.");
  }

  if (!slug) {
    throw new Error("Business slug is required.");
  }

  if (!industry) {
    throw new Error("Industry is required.");
  }

  if (!countryCode) {
    throw new Error("Country is required.");
  }

  if (!currencyCode) {
    throw new Error("Currency code is required.");
  }

  if (!currencySymbol) {
    throw new Error("Currency symbol is required.");
  }

  if (
    !Number.isInteger(input.founderStageAssessmentId) ||
    input.founderStageAssessmentId < 0 ||
    input.founderStageAssessmentId > 8
  ) {
    throw new Error("Invalid founder stage assessment.");
  }

  const products = input.products ?? [];

  if (products.length > 100) {
    throw new Error(
      "A maximum of 100 products or services can be added during onboarding.",
    );
  }

  for (const product of products) {
    if (!product.name.trim()) {
      throw new Error("Every product or service must have a name.");
    }

    optionalDecimal(product.sellingPrice);
    optionalDecimal(product.cogs);
    optionalDecimal(product.packagingCost);
    optionalDecimal(product.variableCost);
  }

  return db.$transaction(async (tx) => {
    const existingBusiness = await tx.business.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingBusiness) {
      throw new Error(
        "A business with this slug already exists. Please choose a different business name.",
      );
    }

    const founderAssessment = await tx.stageDefinition.findUnique({
      where: {
        id: input.founderStageAssessmentId,
      },
      select: {
        id: true,
      },
    });

    if (!founderAssessment) {
      throw new Error("The selected founder assessment stage does not exist.");
    }

    const officialStageId = 0;

    const officialStage = await tx.stageDefinition.findUnique({
      where: {
        id: officialStageId,
      },
      select: {
        id: true,
      },
    });

    if (!officialStage) {
      throw new Error("The BOS Idea stage is not configured.");
    }

    const business = await tx.business.create({
      data: {
        name,
        slug,
        tagline: normalizeOptionalString(input.tagline),
        description: normalizeOptionalString(input.description),
        industry,
        constitution: normalizeOptionalString(input.constitution),
        countryCode,
        currentStageId: officialStageId,
        founderStageAssessmentId: input.founderStageAssessmentId,
      },
    });

    await tx.businessSettings.create({
      data: {
        businessId: business.id,
        currencyCode,
        currencySymbol,
      },
    });

    const stageRequirements = await tx.stageRequirementDef.findMany({
      where: {
        stageId: officialStageId,
      },
      select: {
        id: true,
      },
    });

    if (stageRequirements.length > 0) {
      await tx.businessStageProgress.createMany({
        data: stageRequirements.map((requirement) => ({
          businessId: business.id,
          requirementId: requirement.id,
          status: "NOT_STARTED",
        })),
      });
    }

    if (products.length > 0) {
      const usedSkus = new Set<string>();

      for (let index = 0; index < products.length; index += 1) {
        const product = products[index];

        const suppliedSku = normalizeOptionalString(product.sku);

        let sku = suppliedSku || generateProductSku(index);

        if (usedSkus.has(sku)) {
          throw new Error(
            `Duplicate SKU "${sku}" found in the onboarding products.`,
          );
        }

        usedSkus.add(sku);

        const existingSku = await tx.product.findFirst({
          where: {
            businessId: business.id,
            sku,
          },
          select: {
            id: true,
          },
        });

        if (existingSku) {
          throw new Error(
            `Duplicate SKU "${sku}" found in the onboarding products.`,
          );
        }

        await tx.product.create({
          data: {
            businessId: business.id,
            name: product.name.trim(),
            sku,
            description: normalizeOptionalString(product.description),
            sellingPrice: optionalDecimal(product.sellingPrice),
            cogs: optionalDecimal(product.cogs),
            packagingCost: optionalDecimal(product.packagingCost),
            variableCost: optionalDecimal(product.variableCost),
            currentStock: 0,
            status: "DRAFT",
          },
        });
      }
    }

    return business;
  });
}

export async function getBusinessSummary(businessId: string) {
  const [
    productCount,
    pendingPaymentCount,
    paidOrderCount,
    paidOrderRevenue,
    totalExpenses,
    activeGoalCount,
    openTaskCount,
    unresolvedAlertCount,
    inventoryTransactionCount,
    expenseCount,
  ] = await Promise.all([
    db.product.count({
      where: { businessId },
    }),

    db.order.count({
      where: {
        businessId,
        paymentStatus: "PENDING",
      },
    }),

    db.order.count({
      where: {
        businessId,
        paymentStatus: "PAID",
      },
    }),

    db.order.aggregate({
      where: {
        businessId,
        paymentStatus: "PAID",
      },
      _sum: {
        totalAmount: true,
      },
    }),

    db.expense.aggregate({
      where: {
        businessId,
      },
      _sum: {
        amount: true,
      },
    }),

    db.goal.count({
      where: {
        businessId,
        isCompleted: false,
      },
    }),

    db.task.count({
      where: {
        businessId,
        status: {
          not: "DONE",
        },
      },
    }),

    db.alert.count({
      where: {
        businessId,
        isResolved: false,
      },
    }),

    db.inventoryTransaction.count({
      where: {
        businessId,
      },
    }),

    db.expense.count({
      where: {
        businessId,
      },
    }),
  ]);

  const recordedRevenue = Number(paidOrderRevenue._sum.totalAmount ?? 0);
  const recordedExpenses = Number(totalExpenses._sum.amount ?? 0);

  return {
    productCount,
    pendingPaymentCount,
    paidOrderCount,
    recordedRevenue,
    recordedExpenses,
    recordedNetAmount: recordedRevenue - recordedExpenses,
    activeGoalCount,
    openTaskCount,
    unresolvedAlertCount,
    inventoryTransactionCount,
    expenseCount,
  };
}