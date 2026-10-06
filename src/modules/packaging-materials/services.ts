import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

import { createCashTransactionInTransaction } from "@/modules/cash-flow/services";

import type {
  CreatePackagingMaterialInput,
  RecordPackagingMaterialConsumptionInput,
  RecordPackagingMaterialPurchaseInput,
  RecordPackagingMaterialWastageInput,
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

/**
 * Records a packaging-material purchase and updates
 * inventory atomically.
 *
 * Phase 3B:
 * The purchase also creates a cash outflow in the
 * same database transaction.
 *
 * Therefore:
 *
 * PackagingMaterialPurchase
 * + InventoryTransaction
 * + PackagingMaterial update
 * + CashTransaction
 *
 * all succeed or all roll back together.
 */
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

    if (totalAmount.lte(0)) {
      throw new Error(
        "Purchase amount must be greater than zero.",
      );
    }

    const costPerBaseUnit =
      totalAmount.div(
        baseQuantity,
      );

    const newQuantity =
      material.currentQuantity.add(
        baseQuantity,
      );

    /*
     * Purchase amounts are entered as currency and
     * stored with 2 decimal places in the purchase
     * record.
     *
     * Inventory value remains at higher precision
     * internally.
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

    /**
     * Phase 3B:
     *
     * Packaging purchases are inventory, not P&L
     * expenses. However, because the purchase is
     * treated as paid, it creates a real cash
     * outflow.
     */
    await createCashTransactionInTransaction(
      tx,
      {
        businessId,
        transactionDate:
          input.purchaseDate,
        type: "OUTFLOW",
        category:
          "PACKAGING_MATERIAL_PURCHASE",
        amount: totalAmount,
        paymentMethod: null,
        description:
          `Packaging material purchase — ${material.name}`,
        referenceId: purchase.id,
        sourceType:
          "PACKAGING_MATERIAL_PURCHASE",
        sourceId: purchase.id,
        notes:
          input.invoiceReference
            ? `Invoice: ${input.invoiceReference}`
            : input.notes ?? null,
      },
    );

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

/**
 * Records packaging-material wastage.
 *
 * Wastage reduces inventory and creates a P&L expense,
 * but does NOT create a cash outflow because the material
 * was already purchased.
 */
export async function recordPackagingMaterialWastage(
  businessId: string,
  input: RecordPackagingMaterialWastageInput,
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
        "Wastage quantity must be greater than zero.",
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
        "Wastage would produce a negative inventory value.",
      );
    }

    const newWeightedAverageCost =
      newQuantity.gt(0)
        ? newValue.div(
            newQuantity,
          )
        : new Prisma.Decimal(0);

    const transaction =
      await tx.packagingMaterialInventoryTransaction.create(
        {
          data: {
            businessId,
            packagingMaterialId:
              input.packagingMaterialId,
            type: "WASTAGE",
            quantity,
            unitCost,
            totalValue,
            notes: [
              `Reason: ${input.reason}`,
              input.notes
                ? `Notes: ${input.notes}`
                : null,
            ]
              .filter(Boolean)
              .join(" — "),
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
      },
    });

    await tx.expense.create({
      data: {
        businessId,
        expenseDate: new Date(),
        category: "MATERIAL_WASTAGE",
        description:
          `Packaging material wastage — ${material.name}`,
        amount: totalValue,
        vendor: null,
        paymentMethod: null,
        isRecurring: false,
        notes: [
          `Reason: ${input.reason}`,
          input.notes
            ? `Notes: ${input.notes}`
            : null,
        ]
          .filter(Boolean)
          .join(" — "),
        isCashExpense: false,
        sourceType:
          "PACKAGING_MATERIAL_WASTAGE",
        sourceId:
          transaction.id,
      },
    });

    const updated =
      await tx.packagingMaterial.findUniqueOrThrow({
        where: {
          id: material.id,
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

      /**
       * Remove the cash transaction created
       * by this packaging purchase.
       */
      await tx.cashTransaction.deleteMany({
        where: {
          businessId,
          sourceType:
            "PACKAGING_MATERIAL_PURCHASE",
          sourceId: purchase.id,
        },
      });

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

/**
 * Deletes a packaging-material wastage transaction
 * and its linked non-cash expense.
 */
export async function deletePackagingMaterialWastage(
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
              type: "WASTAGE",
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
          "Packaging material wastage not found.",
        );
      }

      await tx.expense.deleteMany({
        where: {
          businessId,
          sourceType:
            "PACKAGING_MATERIAL_WASTAGE",
          sourceId: transaction.id,
        },
      });

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

/** Permanently removes an unused packaging material and its linked purchase ledger/cash outflows. */
export async function deletePackagingMaterial(
  businessId: string,
  packagingMaterialId: string,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const material =
      await tx.packagingMaterial.findFirst({
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

    const [configuration, consumption] =
      await Promise.all([
        tx.productPackagingConfigurationItem.findFirst(
          {
            where: {
              businessId,
              packagingMaterialId,
            },
            select: {
              id: true,
            },
          },
        ),
        tx.productionBatchPackagingConsumption.findFirst(
          {
            where: {
              businessId,
              packagingMaterialId,
            },
            select: {
              id: true,
            },
          },
        ),
      ]);

    if (configuration || consumption) {
      throw new Error(
        "This packaging material is used in a product packaging configuration or production batch and cannot be deleted.",
      );
    }

    const purchases =
      await tx.packagingMaterialPurchase.findMany(
        {
          where: {
            businessId,
            packagingMaterialId,
          },
          select: {
            id: true,
          },
        },
      );

    const purchaseIds =
      purchases.map((p) => p.id);

    if (purchaseIds.length) {
      await tx.cashTransaction.deleteMany({
        where: {
          businessId,
          sourceType:
            "PACKAGING_MATERIAL_PURCHASE",
          sourceId: {
            in: purchaseIds,
          },
        },
      });
    }

    const inventoryTransactions =
      await tx.packagingMaterialInventoryTransaction.findMany({
        where: {
          businessId,
          packagingMaterialId,
        },
        select: {
          id: true,
        },
      });

    const inventoryTransactionIds =
      inventoryTransactions.map(
        (transaction) => transaction.id,
      );

    await tx.packagingMaterialInventoryTransaction.deleteMany(
      {
        where: {
          businessId,
          packagingMaterialId,
        },
      },
    );

    await tx.packagingMaterialPurchase.deleteMany(
      {
        where: {
          businessId,
          packagingMaterialId,
        },
      },
    );

    if (inventoryTransactionIds.length > 0) {
      await tx.expense.deleteMany({
        where: {
          businessId,
          sourceType:
            "PACKAGING_MATERIAL_WASTAGE",
          sourceId: {
            in: inventoryTransactionIds,
          },
        },
      });
    }

    await tx.packagingMaterial.delete({
      where: {
        id: material.id,
      },
    });
  });
}