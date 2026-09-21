import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

import type {
  CreatePackagingMaterialInput,
  RecordPackagingMaterialConsumptionInput,
  RecordPackagingMaterialPurchaseInput,
} from "./validation";

import type {
  SerializedPackagingMaterial,
  SerializedPackagingMaterialInventoryTransaction,
  SerializedPackagingMaterialPurchase,
} from "./types";

function toNumber(value: unknown): number {
  return Number(value);
}

function convertPurchaseToBaseQuantity(
  quantity: number,
  unitsPerPurchaseUnit: number,
): Prisma.Decimal {
  return new Prisma.Decimal(quantity).mul(
    new Prisma.Decimal(unitsPerPurchaseUnit),
  );
}

export async function createPackagingMaterial(
  businessId: string,
  input: CreatePackagingMaterialInput,
): Promise<SerializedPackagingMaterial> {
  const existing = await db.packagingMaterial.findFirst({
    where: {
      businessId,
      name: input.name,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw new Error(
      "A packaging material with this name already exists.",
    );
  }

  const material = await db.packagingMaterial.create({
    data: {
      businessId,
      name: input.name,
      category: input.category ?? null,
      baseUnit: input.baseUnit,
      supplier: input.supplier ?? null,
      notes: input.notes ?? null,
    },
  });

  return {
    id: material.id,
    businessId: material.businessId,
    name: material.name,
    category: material.category,
    baseUnit: material.baseUnit,
    supplier: material.supplier,
    notes: material.notes,
    currentQuantity: toNumber(
      material.currentQuantity,
    ),
    currentValue: toNumber(
      material.currentValue,
    ),
    weightedAverageCost: toNumber(
      material.weightedAverageCost,
    ),
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
  };
}

export async function getPackagingMaterials(
  businessId: string,
): Promise<SerializedPackagingMaterial[]> {
  const materials =
    await db.packagingMaterial.findMany({
      where: {
        businessId,
      },
      orderBy: {
        name: "asc",
      },
    });

  return materials.map((material) => ({
    id: material.id,
    businessId: material.businessId,
    name: material.name,
    category: material.category,
    baseUnit: material.baseUnit,
    supplier: material.supplier,
    notes: material.notes,
    currentQuantity: toNumber(
      material.currentQuantity,
    ),
    currentValue: toNumber(
      material.currentValue,
    ),
    weightedAverageCost: toNumber(
      material.weightedAverageCost,
    ),
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
  }));
}

export async function getPackagingMaterialPurchases(
  businessId: string,
  packagingMaterialId?: string,
): Promise<
  SerializedPackagingMaterialPurchase[]
> {
  const purchases =
    await db.packagingMaterialPurchase.findMany({
      where: {
        businessId,
        ...(packagingMaterialId
          ? { packagingMaterialId }
          : {}),
      },
      orderBy: [
        {
          purchaseDate: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

  return purchases.map((purchase) => ({
    id: purchase.id,
    businessId: purchase.businessId,
    packagingMaterialId:
      purchase.packagingMaterialId,
    purchaseDate: purchase.purchaseDate,
    quantity: toNumber(
      purchase.quantity,
    ),
    purchaseUnit:
      purchase.purchaseUnit,
    unitsPerPurchaseUnit:
      toNumber(
        purchase.unitsPerPurchaseUnit,
      ),
    baseQuantity: toNumber(
      purchase.baseQuantity,
    ),
    totalAmount: toNumber(
      purchase.totalAmount,
    ),
    costPerBaseUnit:
      toNumber(
        purchase.costPerBaseUnit,
      ),
    supplier: purchase.supplier,
    invoiceReference:
      purchase.invoiceReference,
    notes: purchase.notes,
    createdAt: purchase.createdAt,
    updatedAt: purchase.updatedAt,
  }));
}

export async function recordPackagingMaterialPurchase(
  businessId: string,
  input: RecordPackagingMaterialPurchaseInput,
): Promise<
  SerializedPackagingMaterialPurchase
> {
  return db.$transaction(async (tx) => {
    const material =
      await tx.packagingMaterial.findFirst({
        where: {
          id: input.packagingMaterialId,
          businessId,
        },
      });

    if (!material) {
      throw new Error(
        "Packaging material not found.",
      );
    }

    const baseQuantity =
      convertPurchaseToBaseQuantity(
        input.quantity,
        input.unitsPerPurchaseUnit,
      );

    if (baseQuantity.lte(0)) {
      throw new Error(
        "Purchase quantity must result in a positive base quantity.",
      );
    }

    const totalAmount =
      new Prisma.Decimal(
        input.totalAmount,
      );

    const costPerBaseUnit =
      totalAmount.div(
        baseQuantity,
      );

    const newQuantity =
      material.currentQuantity.add(
        baseQuantity,
      );

    /*
     * Purchase amounts are entered as currency and stored
     * with 2 decimal places in the purchase record.
     *
     * The inventory value itself remains at 6-decimal
     * precision so later consumption calculations do not
     * introduce unnecessary rounding drift.
     */
    const newValue =
      material.currentValue.add(
        totalAmount,
      );

    const newWeightedAverageCost =
      newQuantity.gt(0)
        ? newValue.div(
            newQuantity,
          )
        : new Prisma.Decimal(0);

    const purchase =
      await tx.packagingMaterialPurchase.create(
        {
          data: {
            businessId,
            packagingMaterialId:
              input.packagingMaterialId,
            purchaseDate:
              input.purchaseDate,
            quantity:
              new Prisma.Decimal(
                input.quantity,
              ),
            purchaseUnit:
              input.purchaseUnit,
            unitsPerPurchaseUnit:
              new Prisma.Decimal(
                input.unitsPerPurchaseUnit,
              ),
            baseQuantity,
            totalAmount,
            costPerBaseUnit,
            supplier:
              input.supplier ??
              material.supplier ??
              null,
            invoiceReference:
              input.invoiceReference ??
              null,
            notes:
              input.notes ?? null,
          },
        },
      );

    await tx.packagingMaterialInventoryTransaction.create(
      {
        data: {
          businessId,
          packagingMaterialId:
            input.packagingMaterialId,
          type: "PURCHASE",
          quantity: baseQuantity,
          unitCost:
            costPerBaseUnit,
          totalValue:
            totalAmount,
          purchaseId:
            purchase.id,
          notes:
            input.notes ?? null,
        },
      },
    );

    await tx.packagingMaterial.update({
      where: {
        id: material.id,
      },
      data: {
        currentQuantity:
          newQuantity,
        currentValue:
          newValue,
        weightedAverageCost:
          newWeightedAverageCost,
        supplier:
          input.supplier !== undefined
            ? input.supplier
            : material.supplier,
      },
    });

    return {
      id: purchase.id,
      businessId:
        purchase.businessId,
      packagingMaterialId:
        purchase.packagingMaterialId,
      purchaseDate:
        purchase.purchaseDate,
      quantity:
        toNumber(
          purchase.quantity,
        ),
      purchaseUnit:
        purchase.purchaseUnit,
      unitsPerPurchaseUnit:
        toNumber(
          purchase.unitsPerPurchaseUnit,
        ),
      baseQuantity:
        toNumber(
          purchase.baseQuantity,
        ),
      totalAmount:
        toNumber(
          purchase.totalAmount,
        ),
      costPerBaseUnit:
        toNumber(
          purchase.costPerBaseUnit,
        ),
      supplier:
        purchase.supplier,
      invoiceReference:
        purchase.invoiceReference,
      notes:
        purchase.notes,
      createdAt:
        purchase.createdAt,
      updatedAt:
        purchase.updatedAt,
    };
  });
}

export async function recordPackagingMaterialConsumption(
  businessId: string,
  input: RecordPackagingMaterialConsumptionInput,
): Promise<SerializedPackagingMaterial> {
  return db.$transaction(async (tx) => {
    const material =
      await tx.packagingMaterial.findFirst({
        where: {
          id: input.packagingMaterialId,
          businessId,
        },
      });

    if (!material) {
      throw new Error(
        "Packaging material not found.",
      );
    }

    const quantity =
      new Prisma.Decimal(
        input.quantity,
      );

    if (quantity.lte(0)) {
      throw new Error(
        "Consumption quantity must be greater than zero.",
      );
    }

    if (
      material.currentQuantity.lt(
        quantity,
      )
    ) {
      throw new Error(
        `Insufficient packaging material stock. Available: ${material.currentQuantity.toString()} pieces.`,
      );
    }

    if (
      material.currentQuantity.lte(0)
    ) {
      throw new Error(
        "Packaging material has no available inventory.",
      );
    }

    /*
     * Use the current weighted-average cost without
     * rounding it first.
     *
     * This is critical for accurate costing:
     *
     * 100 × ₹4.333333333... =
     * ₹433.333333...
     *
     * The database keeps this internal value at
     * 6-decimal precision. The UI can display ₹433.33.
     */
    const unitCost =
      material.weightedAverageCost;

    const totalValue =
      quantity.mul(unitCost);

    const newQuantity =
      material.currentQuantity.sub(
        quantity,
      );

    const newValue =
      material.currentValue.sub(
        totalValue,
      );

    if (newValue.lt(0)) {
      throw new Error(
        "Consumption would produce a negative inventory value.",
      );
    }

    const newWeightedAverageCost =
      newQuantity.gt(0)
        ? newValue.div(
            newQuantity,
          )
        : new Prisma.Decimal(0);

    await tx.packagingMaterialInventoryTransaction.create(
      {
        data: {
          businessId,
          packagingMaterialId:
            input.packagingMaterialId,
          type: "CONSUMPTION",
          quantity,
          unitCost,
          totalValue,
          referenceId:
            input.referenceId ?? null,
          notes:
            input.notes ?? null,
        },
      },
    );

    const updated =
      await tx.packagingMaterial.update({
        where: {
          id: material.id,
        },
        data: {
          currentQuantity:
            newQuantity,
          currentValue:
            newValue,
          weightedAverageCost:
            newWeightedAverageCost,
        },
      });

    return {
      id: updated.id,
      businessId:
        updated.businessId,
      name: updated.name,
      category:
        updated.category,
      baseUnit:
        updated.baseUnit,
      supplier:
        updated.supplier,
      notes:
        updated.notes,
      currentQuantity:
        toNumber(
          updated.currentQuantity,
        ),
      currentValue:
        toNumber(
          updated.currentValue,
        ),
      weightedAverageCost:
        toNumber(
          updated.weightedAverageCost,
        ),
      createdAt:
        updated.createdAt,
      updatedAt:
        updated.updatedAt,
    };
  });
}

export async function getPackagingMaterialInventoryHistory(
  businessId: string,
  packagingMaterialId: string,
): Promise<
  SerializedPackagingMaterialInventoryTransaction[]
> {
  const material =
    await db.packagingMaterial.findFirst({
      where: {
        id: packagingMaterialId,
        businessId,
      },
      select: {
        id: true,
      },
    });

  if (!material) {
    throw new Error(
      "Packaging material not found.",
    );
  }

  const transactions =
    await db.packagingMaterialInventoryTransaction.findMany(
      {
        where: {
          businessId,
          packagingMaterialId,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    );

  return transactions.map(
    (transaction) => ({
      id: transaction.id,
      businessId:
        transaction.businessId,
      packagingMaterialId:
        transaction.packagingMaterialId,
      type: transaction.type,
      quantity:
        toNumber(
          transaction.quantity,
        ),
      unitCost:
        toNumber(
          transaction.unitCost,
        ),
      totalValue:
        toNumber(
          transaction.totalValue,
        ),
      purchaseId:
        transaction.purchaseId,
      referenceId:
        transaction.referenceId,
      notes:
        transaction.notes,
      createdAt:
        transaction.createdAt,
    }),
  );
}

export async function deletePackagingMaterialPurchase(
  businessId: string,
  purchaseId: string,
): Promise<void> {
  await db.$transaction(
    async (tx) => {
      const purchase =
        await tx.packagingMaterialPurchase.findFirst(
          {
            where: {
              id: purchaseId,
              businessId,
            },
            select: {
              id: true,
              packagingMaterialId:
                true,
            },
          },
        );

      if (!purchase) {
        throw new Error(
          "Packaging material purchase not found.",
        );
      }

      const nonPurchaseTransaction =
        await tx.packagingMaterialInventoryTransaction.findFirst(
          {
            where: {
              businessId,
              packagingMaterialId:
                purchase.packagingMaterialId,
              type: {
                not: "PURCHASE",
              },
            },
            select: {
              id: true,
            },
          },
        );

      if (nonPurchaseTransaction) {
        throw new Error(
          "This purchase cannot be deleted because this packaging material has consumption or adjustment history.",
        );
      }

      await tx.packagingMaterialInventoryTransaction.deleteMany(
        {
          where: {
            businessId,
            purchaseId:
              purchase.id,
          },
        },
      );

      await tx.packagingMaterialPurchase.delete(
        {
          where: {
            id: purchase.id,
          },
        },
      );

      await rebuildPackagingMaterialInventory(
        tx,
        businessId,
        purchase.packagingMaterialId,
      );
    },
  );
}

export async function deletePackagingMaterialConsumption(
  businessId: string,
  transactionId: string,
): Promise<void> {
  await db.$transaction(
    async (tx) => {
      const transaction =
        await tx.packagingMaterialInventoryTransaction.findFirst(
          {
            where: {
              id: transactionId,
              businessId,
              type: "CONSUMPTION",
            },
            select: {
              id: true,
              packagingMaterialId:
                true,
            },
          },
        );

      if (!transaction) {
        throw new Error(
          "Packaging material consumption not found.",
        );
      }

      await tx.packagingMaterialInventoryTransaction.delete(
        {
          where: {
            id: transaction.id,
          },
        },
      );

      await rebuildPackagingMaterialInventory(
        tx,
        businessId,
        transaction.packagingMaterialId,
      );
    },
  );
}

async function rebuildPackagingMaterialInventory(
  tx: Prisma.TransactionClient,
  businessId: string,
  packagingMaterialId: string,
): Promise<void> {
  const transactions =
    await tx.packagingMaterialInventoryTransaction.findMany(
      {
        where: {
          businessId,
          packagingMaterialId,
        },
        orderBy: [
          {
            createdAt: "asc",
          },
          {
            id: "asc",
          },
        ],
      },
    );

  let quantity =
    new Prisma.Decimal(0);

  let value =
    new Prisma.Decimal(0);

  for (const transaction of transactions) {
    if (
      transaction.type ===
        "PURCHASE" ||
      transaction.type ===
        "ADJUSTMENT_IN"
    ) {
      quantity =
        quantity.add(
          transaction.quantity,
        );

      value =
        value.add(
          transaction.totalValue,
        );
    } else {
      quantity =
        quantity.sub(
          transaction.quantity,
        );

      value =
        value.sub(
          transaction.totalValue,
        );
    }
  }

  if (quantity.lt(0)) {
    throw new Error(
      "Rebuilding packaging material inventory would produce negative stock.",
    );
  }

  if (value.lt(0)) {
    throw new Error(
      "Rebuilding packaging material inventory would produce a negative inventory value.",
    );
  }

  const weightedAverageCost =
    quantity.gt(0)
      ? value.div(quantity)
      : new Prisma.Decimal(0);

  await tx.packagingMaterial.update({
    where: {
      id: packagingMaterialId,
    },
    data: {
      currentQuantity:
        quantity,
      currentValue:
        value,
      weightedAverageCost:
        weightedAverageCost,
    },
  });
}