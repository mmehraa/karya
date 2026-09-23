import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

import type {
  ProductEconomics,
  ProductEconomicsComponent,
} from "./types";


function decimalToNumber(
  value: Prisma.Decimal | number | string | null | undefined
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function calculateRawMaterialCost(
  items: Array<{
    quantity: Prisma.Decimal;
    rawMaterial: {
      weightedAverageCost: Prisma.Decimal;
    };
  }>
): number {
  const total = items.reduce(
    (sum, item) => {
      const lineCost = new Prisma.Decimal(
        item.quantity.toString()
      ).mul(item.rawMaterial.weightedAverageCost);

      return sum.add(lineCost);
    },
    new Prisma.Decimal(0)
  );

  return Number(total);
}

function calculatePackagingCost(
  items: Array<{
    quantity: Prisma.Decimal;
    packagingMaterial: {
      weightedAverageCost: Prisma.Decimal;
    };
  }>
): number {
  const total = items.reduce(
    (sum, item) => {
      const lineCost = new Prisma.Decimal(
        item.quantity.toString()
      ).mul(item.packagingMaterial.weightedAverageCost);

      return sum.add(lineCost);
    },
    new Prisma.Decimal(0)
  );

  return Number(total);
}

function completeComponent(
  costPerUnit: number,
  sourceId: string,
  sourceVersion: number
): ProductEconomicsComponent {
  return {
    isComplete: true,
    costPerUnit,
    missingReason: null,
    sourceId,
    sourceVersion,
  };
}

function incompleteComponent(
  reason: string
): ProductEconomicsComponent {
  return {
    isComplete: false,
    costPerUnit: null,
    missingReason: reason,
    sourceId: null,
    sourceVersion: null,
  };
}

export async function getProductEconomics(
  businessId: string,
  productId: string
): Promise<ProductEconomics> {
  const product = await db.product.findFirst({
    where: {
      id: productId,
      businessId,
    },
    select: {
      id: true,
      businessId: true,
      name: true,
      sku: true,
      sellingPrice: true,
    },
  });

  if (!product) {
    throw new Error("Product not found.");
  }
  const activeFormulation =
    await db.productFormulation.findFirst({
      where: {
        businessId,
        productId,
        isActive: true,
      },
      orderBy: {
        version: "desc",
      },
      select: {
        id: true,
        version: true,
        items: {
          select: {
            quantity: true,
            rawMaterial: {
              select: {
                weightedAverageCost: true,
              },
            },
          },
        },
      },
    });

  const activePackagingConfiguration =
    await db.productPackagingConfiguration.findFirst({
      where: {
        businessId,
        productId,
        isActive: true,
      },
      orderBy: {
        version: "desc",
      },
      select: {
        id: true,
        version: true,
        items: {
          select: {
            quantity: true,
            packagingMaterial: {
              select: {
                weightedAverageCost: true,
              },
            },
          },
        },
      },
    });

  /**
   * ---------------------------------------------------------
   * RAW MATERIAL COST
   * ---------------------------------------------------------
   */

  let rawMaterialComponent: ProductEconomicsComponent;

  if (!activeFormulation) {
    rawMaterialComponent = incompleteComponent(
      "No active product formulation exists."
    );
  } else if (activeFormulation.items.length === 0) {
    rawMaterialComponent = incompleteComponent(
      "The active product formulation contains no raw materials."
    );
  } else {
    const rawMaterialCost = calculateRawMaterialCost(
      activeFormulation.items
    );

    rawMaterialComponent = completeComponent(
      rawMaterialCost,
      activeFormulation.id,
      activeFormulation.version
    );
  }

  /**
   * ---------------------------------------------------------
   * PACKAGING COST
   * ---------------------------------------------------------
   */

  let packagingComponent: ProductEconomicsComponent;

  if (!activePackagingConfiguration) {
    packagingComponent = incompleteComponent(
      "No active packaging configuration exists."
    );
  } else if (
    activePackagingConfiguration.items.length === 0
  ) {
    packagingComponent = incompleteComponent(
      "The active packaging configuration contains no packaging materials."
    );
  } else {
    const packagingCost = calculatePackagingCost(
      activePackagingConfiguration.items
    );

    packagingComponent = completeComponent(
      packagingCost,
      activePackagingConfiguration.id,
      activePackagingConfiguration.version
    );
  }

  /**
   * ---------------------------------------------------------
   * PRE-SHIPPING UNIT COST
   * ---------------------------------------------------------
   */
  let preShippingUnitCost: number | null = null;

  if (
    rawMaterialComponent.isComplete &&
    packagingComponent.isComplete &&
    rawMaterialComponent.costPerUnit !== null &&
    packagingComponent.costPerUnit !== null
  ) {
    const rawMaterialCost = new Prisma.Decimal(
      rawMaterialComponent.costPerUnit.toString()
    );

    const packagingCost = new Prisma.Decimal(
      packagingComponent.costPerUnit.toString()
    );

    preShippingUnitCost = Number(
      rawMaterialCost.add(packagingCost)
    );
  }

  /**
   * ---------------------------------------------------------
   * CONTRIBUTION PROFIT
   * ---------------------------------------------------------
   */
  const sellingPrice = decimalToNumber(
    product.sellingPrice
  );

  let contributionProfitPerUnit: number | null =
    null;

  let contributionMarginPct: number | null = null;

  if (
    preShippingUnitCost !== null &&
    sellingPrice !== null &&
    sellingPrice > 0
  ) {
    const profit = new Prisma.Decimal(
      sellingPrice.toString()
    ).sub(
      new Prisma.Decimal(
        preShippingUnitCost.toString()
      )
    );

    contributionProfitPerUnit = Number(profit);

    contributionMarginPct = Number(
      profit
        .div(new Prisma.Decimal(sellingPrice.toString()))
        .mul(new Prisma.Decimal(100))
    );
  }

  /**
   * ---------------------------------------------------------
   * COMPLETENESS
   * ---------------------------------------------------------
   */

  let incompleteReason: string | null = null;

  if (!rawMaterialComponent.isComplete) {
    incompleteReason =
      rawMaterialComponent.missingReason;
  } else if (!packagingComponent.isComplete) {
    incompleteReason =
      packagingComponent.missingReason;
  } else if (sellingPrice === null) {
    incompleteReason =
      "Selling price has not been set.";
  } else if (sellingPrice <= 0) {
    incompleteReason =
      "Selling price must be greater than zero to calculate contribution margin.";
  }

  const isComplete =
    incompleteReason === null &&
    preShippingUnitCost !== null &&
    contributionProfitPerUnit !== null &&
    contributionMarginPct !== null;

  /**
   * ---------------------------------------------------------
   * RESULT
   * ---------------------------------------------------------
   */

  return {
    productId: product.id,
    businessId: product.businessId,

    productName: product.name,
    sku: product.sku,

    sellingPrice,

    rawMaterialCostPerUnit:
      rawMaterialComponent.costPerUnit,

    packagingCostPerUnit:
      packagingComponent.costPerUnit,

    preShippingUnitCost,

    contributionProfitPerUnit,

    contributionMarginPct,

    isComplete,

    incompleteReason,

    rawMaterialComponent,

    packagingComponent,

    activeFormulationId:
      activeFormulation?.id ?? null,

    activeFormulationVersion:
      activeFormulation?.version ?? null,

    activePackagingConfigurationId:
      activePackagingConfiguration?.id ?? null,

    activePackagingConfigurationVersion:
      activePackagingConfiguration?.version ?? null,
  };
}