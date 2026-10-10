import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

import type {
  SerializedRawMaterial,
  SerializedRawMaterialPurchase,
} from "./types";

import type {
  CreateRawMaterialInput,
  RecordRawMaterialPurchaseInput,
  RecordRawMaterialConsumptionInput,
  RecordRawMaterialWastageInput,
} from "./validation";

import { createCashTransactionInTransaction } from "@/modules/cash-flow/services";

type RawMaterialRecord = {
  id: string;
  businessId: string;
  name: string;
  category: string | null;
  baseUnit: "GRAM" | "MILLILITER" | "PIECE";
  supplier: string | null;
  notes: string | null;
  currentQuantity: Prisma.Decimal;
  currentValue: Prisma.Decimal;
  weightedAverageCost: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
};

type RawMaterialPurchaseRecord = {
  id: string;
  businessId: string;
  rawMaterialId: string;
  purchaseDate: Date;
  quantity: Prisma.Decimal;
  purchaseUnit:
    | "GRAM"
    | "KILOGRAM"
    | "MILLILITER"
    | "LITER"
    | "PIECE";
  baseQuantity: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  costPerBaseUnit: Prisma.Decimal;
  supplier: string | null;
  invoiceReference: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function decimalToNumber(value: Prisma.Decimal): number {
  return Number(value);
}

function serializeRawMaterial(
  material: RawMaterialRecord,
): SerializedRawMaterial {
  return {
    id: material.id,
    businessId: material.businessId,
    name: material.name,
    category: material.category,
    baseUnit: material.baseUnit,
    supplier: material.supplier,
    notes: material.notes,
    currentQuantity: decimalToNumber(material.currentQuantity),
    currentValue: decimalToNumber(material.currentValue),
    weightedAverageCost: decimalToNumber(
      material.weightedAverageCost,
    ),
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
  };
}

function serializePurchase(
  purchase: RawMaterialPurchaseRecord,
): SerializedRawMaterialPurchase {
  return {
    id: purchase.id,
    businessId: purchase.businessId,
    rawMaterialId: purchase.rawMaterialId,
    purchaseDate: purchase.purchaseDate,
    quantity: decimalToNumber(purchase.quantity),
    purchaseUnit: purchase.purchaseUnit,
    baseQuantity: decimalToNumber(purchase.baseQuantity),
    totalAmount: decimalToNumber(purchase.totalAmount),
    costPerBaseUnit: decimalToNumber(
      purchase.costPerBaseUnit,
    ),
    supplier: purchase.supplier,
    invoiceReference: purchase.invoiceReference,
    notes: purchase.notes,
    createdAt: purchase.createdAt,
    updatedAt: purchase.updatedAt,
  };
}

/**
 * Converts a purchase quantity into the raw material's base unit.
 */
function convertToBaseQuantity(
  quantity: number,
  purchaseUnit: RecordRawMaterialPurchaseInput["purchaseUnit"],
  baseUnit: RawMaterialRecord["baseUnit"],
): Prisma.Decimal {
  const quantityDecimal = new Prisma.Decimal(quantity);

  if (baseUnit === "GRAM") {
    if (purchaseUnit === "GRAM") {
      return quantityDecimal;
    }

    if (purchaseUnit === "KILOGRAM") {
      return quantityDecimal.mul(1000);
    }
  }

  if (baseUnit === "MILLILITER") {
    if (purchaseUnit === "MILLILITER") {
      return quantityDecimal;
    }

    if (purchaseUnit === "LITER") {
      return quantityDecimal.mul(1000);
    }
  }

  if (baseUnit === "PIECE" && purchaseUnit === "PIECE") {
    return quantityDecimal;
  }

  throw new Error(
    `Purchase unit "${purchaseUnit}" is not compatible with base unit "${baseUnit}".`,
  );
}

/**
 * Creates a raw material without adding inventory.
 */
export async function createRawMaterial(
  businessId: string,
  input: CreateRawMaterialInput,
): Promise<SerializedRawMaterial> {
  const material = await db.rawMaterial.create({
    data: {
      businessId,
      name: input.name,
      category: input.category ?? null,
      baseUnit: input.baseUnit,
      supplier: input.supplier ?? null,
      notes: input.notes ?? null,
    },
  });

  return serializeRawMaterial(material);
}

/**
 * Retrieves all raw materials for the active business.
 */
export async function getRawMaterials(
  businessId: string,
): Promise<SerializedRawMaterial[]> {
  const materials = await db.rawMaterial.findMany({
    where: {
      businessId,
    },
    orderBy: [
      {
        name: "asc",
      },
    ],
  });

  return materials.map(serializeRawMaterial);
}

/**
 * Retrieves purchase history for one raw material.
 */
export async function getRawMaterialPurchases(
  businessId: string,
  rawMaterialId: string,
): Promise<SerializedRawMaterialPurchase[]> {
  const material = await db.rawMaterial.findFirst({
    where: {
      id: rawMaterialId,
      businessId,
    },
    select: {
      id: true,
    },
  });

  if (!material) {
    throw new Error("Raw material not found.");
  }

  const purchases = await db.rawMaterialPurchase.findMany({
    where: {
      businessId,
      rawMaterialId,
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

  return purchases.map(serializePurchase);
}

/**
 * Records a raw material purchase and updates inventory atomically.
 *
 * Phase 3B:
 * The same transaction also records the cash outflow.
 *
 * Therefore:
 *
 * RawMaterialPurchase
 * + InventoryTransaction
 * + RawMaterial update
 * + CashTransaction
 *
 * all succeed or all roll back together.
 */
export async function recordRawMaterialPurchase(
  businessId: string,
  input: RecordRawMaterialPurchaseInput,
): Promise<{
  material: SerializedRawMaterial;
  purchase: SerializedRawMaterialPurchase;
}> {
  return db.$transaction(async (tx) => {
    const material = await tx.rawMaterial.findFirst({
      where: {
        id: input.rawMaterialId,
        businessId,
      },
    });

    if (!material) {
      throw new Error("Raw material not found.");
    }

    const baseQuantity = convertToBaseQuantity(
      input.quantity,
      input.purchaseUnit,
      material.baseUnit,
    );

    const totalAmount = new Prisma.Decimal(
      input.totalAmount,
    );

    if (baseQuantity.lte(0)) {
      throw new Error(
        "Converted purchase quantity must be greater than zero.",
      );
    }

    if (totalAmount.lte(0)) {
      throw new Error(
        "Purchase amount must be greater than zero.",
      );
    }

    const costPerBaseUnit =
      totalAmount.div(baseQuantity);

    const newQuantity =
      material.currentQuantity.add(baseQuantity);

    const newValue =
      material.currentValue.add(totalAmount);

    const newWeightedAverageCost =
      newValue.div(newQuantity);

    const purchase =
      await tx.rawMaterialPurchase.create({
        data: {
          businessId,
          rawMaterialId: material.id,
          purchaseDate: input.purchaseDate,
          quantity: new Prisma.Decimal(input.quantity),
          purchaseUnit: input.purchaseUnit,
          baseQuantity,
          totalAmount,
          costPerBaseUnit,
          supplier:
            input.supplier ??
            material.supplier ??
            null,
          invoiceReference:
            input.invoiceReference ?? null,
          notes: input.notes ?? null,
        },
      });

    await tx.rawMaterialInventoryTransaction.create({
      data: {
        businessId,
        rawMaterialId: material.id,
        type: "PURCHASE",
        quantity: baseQuantity,
        unitCost: costPerBaseUnit,
        totalValue: totalAmount,
        purchaseId: purchase.id,
        notes: input.notes ?? null,
      },
    });

    const updatedMaterial =
      await tx.rawMaterial.update({
        where: {
          id: material.id,
        },
        data: {
          currentQuantity: newQuantity,
          currentValue: newValue,
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
     * A material purchase is inventory on the balance sheet,
     * but when the purchase is paid it is also a real cash
     * outflow.
     *
     * We deliberately do NOT create an Expense record here.
     */
    await createCashTransactionInTransaction(
      tx,
      {
        businessId,
        transactionDate: input.purchaseDate,
        type: "OUTFLOW",
        category: "RAW_MATERIAL_PURCHASE",
        amount: totalAmount,
        paymentMethod: null,
        description:
          `Raw material purchase — ${material.name}`,
        referenceId: purchase.id,
        sourceType: "RAW_MATERIAL_PURCHASE",
        sourceId: purchase.id,
        notes:
          input.invoiceReference
            ? `Invoice: ${input.invoiceReference}`
            : input.notes ?? null,
      },
    );

    return {
      material:
        serializeRawMaterial(updatedMaterial),
      purchase:
        serializePurchase(purchase),
    };
  });
}

/**
 * Records raw-material consumption using the material's
 * current weighted-average cost.
 */
export async function recordRawMaterialConsumption(
  businessId: string,
  input: RecordRawMaterialConsumptionInput,
): Promise<SerializedRawMaterial> {
  return db.$transaction(async (tx) => {
    const material = await tx.rawMaterial.findFirst({
      where: {
        id: input.rawMaterialId,
        businessId,
      },
    });

    if (!material) {
      throw new Error("Raw material not found.");
    }

    const quantity = new Prisma.Decimal(
      input.quantity,
    );

    if (quantity.lte(0)) {
      throw new Error(
        "Consumption quantity must be greater than zero.",
      );
    }

    if (material.currentQuantity.lt(quantity)) {
      throw new Error(
        `Insufficient stock. Available quantity is ${material.currentQuantity.toString()}.`,
      );
    }

    if (material.currentQuantity.lte(0)) {
      throw new Error(
        "Raw material has no available inventory.",
      );
    }

    const unitCost =
      material.weightedAverageCost;

    const totalValue =
      quantity.mul(unitCost);

    const newQuantity =
      material.currentQuantity.sub(quantity);

    const newValue =
      material.currentValue.sub(totalValue);

    const normalizedValue = newValue.lt(0)
      ? new Prisma.Decimal(0)
      : newValue;

    const newWeightedAverageCost =
      newQuantity.gt(0)
        ? normalizedValue.div(newQuantity)
        : new Prisma.Decimal(0);

    await tx.rawMaterialInventoryTransaction.create({
      data: {
        businessId,
        rawMaterialId: material.id,
        type: "CONSUMPTION",
        quantity,
        unitCost,
        totalValue,
        referenceId:
          input.referenceId ?? null,
        notes: input.notes ?? null,
      },
    });

    const updatedMaterial =
      await tx.rawMaterial.update({
        where: {
          id: material.id,
        },
        data: {
          currentQuantity: newQuantity,
          currentValue: normalizedValue,
          weightedAverageCost:
            newWeightedAverageCost,
        },
      });

    return serializeRawMaterial(
      updatedMaterial,
    );
  });
}

/**
 * Records raw-material wastage using the material's
 * current weighted-average cost.
 *
 * Wastage is an inventory loss, not a cash payment.
 *
 * Therefore this creates:
 *
 * InventoryTransaction(WASTAGE)
 * + Expense(MATERIAL_WASTAGE, isCashExpense=false)
 * + RawMaterial inventory update
 *
 * but deliberately creates NO CashTransaction.
 */
export async function recordRawMaterialWastage(
  businessId: string,
  input: RecordRawMaterialWastageInput,
): Promise<SerializedRawMaterial> {
  return db.$transaction(async (tx) => {
    const material = await tx.rawMaterial.findFirst({
      where: {
        id: input.rawMaterialId,
        businessId,
      },
    });

    if (!material) {
      throw new Error("Raw material not found.");
    }

    const quantity = new Prisma.Decimal(
      input.quantity,
    );

    if (quantity.lte(0)) {
      throw new Error(
        "Wastage quantity must be greater than zero.",
      );
    }

    if (material.currentQuantity.lte(0)) {
      throw new Error(
        "Raw material has no available inventory.",
      );
    }

    if (material.currentQuantity.lt(quantity)) {
      throw new Error(
        `Insufficient stock. Available quantity is ${material.currentQuantity.toString()}.`,
      );
    }

    const unitCost =
      material.weightedAverageCost;

    const totalValue =
      quantity.mul(unitCost);

    const newQuantity =
      material.currentQuantity.sub(quantity);

    const newValue =
      material.currentValue.sub(totalValue);

    const normalizedValue = newValue.lt(0)
      ? new Prisma.Decimal(0)
      : newValue;

    const newWeightedAverageCost =
      newQuantity.gt(0)
        ? normalizedValue.div(newQuantity)
        : new Prisma.Decimal(0);

    const inventoryTransaction =
      await tx.rawMaterialInventoryTransaction.create({
        data: {
          businessId,
          rawMaterialId: material.id,
          type: "WASTAGE",
          quantity,
          unitCost,
          totalValue,
          notes: input.notes
            ? `${input.reason} — ${input.notes}`
            : input.reason,
        },
      });

    await tx.expense.create({
      data: {
        businessId,
        expenseDate: new Date(),
        category: "MATERIAL_WASTAGE",
        description:
          `Raw material wastage — ${material.name}`,
        amount: totalValue,
        vendor: null,
        paymentMethod: null,
        isRecurring: false,
        notes: input.notes
          ? `${input.reason} — ${input.notes}`
          : input.reason,
        isCashExpense: false,
        sourceType: "RAW_MATERIAL_WASTAGE",
        sourceId: inventoryTransaction.id,
      },
    });

    const updatedMaterial =
      await tx.rawMaterial.update({
        where: {
          id: material.id,
        },
        data: {
          currentQuantity: newQuantity,
          currentValue: normalizedValue,
          weightedAverageCost:
            newWeightedAverageCost,
        },
      });

    return serializeRawMaterial(
      updatedMaterial,
    );
  });
}

/**
 * Retrieves the complete raw-material inventory ledger.
 */
export type RawMaterialInventoryHistoryItem = {
  id: string;
  type:
    | "PURCHASE"
    | "CONSUMPTION"
    | "WASTAGE"
    | "ADJUSTMENT_IN"
    | "ADJUSTMENT_OUT";
  quantity: number;
  unitCost: number;
  totalValue: number;
  referenceId: string | null;
  notes: string | null;
  createdAt: Date;
  purchaseId: string | null;
  purchaseQuantity: number | null;
  purchaseUnit:
    | "GRAM"
    | "KILOGRAM"
    | "MILLILITER"
    | "LITER"
    | "PIECE"
    | null;
  purchaseDate: Date | null;
};

export async function getRawMaterialInventoryHistory(
  businessId: string,
  rawMaterialId: string,
): Promise<
  RawMaterialInventoryHistoryItem[]
> {
  const material = await db.rawMaterial.findFirst({
    where: {
      id: rawMaterialId,
      businessId,
    },
    select: {
      id: true,
    },
  });

  if (!material) {
    throw new Error("Raw material not found.");
  }

  const transactions =
    await db.rawMaterialInventoryTransaction.findMany(
      {
        where: {
          businessId,
          rawMaterialId,
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          purchase: {
            select: {
              quantity: true,
              purchaseUnit: true,
              purchaseDate: true,
            },
          },
        },
      },
    );

  return transactions.map(
    (transaction) => ({
      id: transaction.id,
      type: transaction.type,
      quantity: Number(
        transaction.quantity,
      ),
      unitCost: Number(
        transaction.unitCost,
      ),
      totalValue: Number(
        transaction.totalValue,
      ),
      referenceId:
        transaction.referenceId,
      notes: transaction.notes,
      createdAt:
        transaction.createdAt,
      purchaseId:
        transaction.purchaseId,
      purchaseQuantity:
        transaction.purchase
          ? Number(
              transaction.purchase.quantity,
            )
          : null,
      purchaseUnit:
        transaction.purchase
          ?.purchaseUnit ?? null,
      purchaseDate:
        transaction.purchase
          ?.purchaseDate ?? null,
    }),
  );
}

/**
 * Deletes a raw-material purchase and rebuilds
 * purchase-based inventory valuation.
 *
 * The associated cash transaction is also removed.
 */

export async function deleteRawMaterialPurchase(
  businessId: string,
  purchaseId: string,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const purchase =
      await tx.rawMaterialPurchase.findFirst({
        where: {
          id: purchaseId,
          businessId,
        },
        select: {
          id: true,
          rawMaterialId: true,
        },
      });

    if (!purchase) {
      throw new Error(
        "Raw material purchase not found.",
      );
    }

    const material =
      await tx.rawMaterial.findFirst({
        where: {
          id: purchase.rawMaterialId,
          businessId,
        },
        select: {
          id: true,
        },
      });

    if (!material) {
      throw new Error(
        "Raw material not found.",
      );
    }

    const purchaseTransaction =
      await tx.rawMaterialInventoryTransaction.findFirst({
        where: {
          businessId,
          rawMaterialId: purchase.rawMaterialId,
          purchaseId: purchase.id,
        },
        select: {
          id: true,
        },
      });

    if (!purchaseTransaction) {
      throw new Error(
        "Purchase inventory transaction not found.",
      );
    }

    // Remove only the inventory entry linked to this purchase.
    await tx.rawMaterialInventoryTransaction.delete({
      where: {
        id: purchaseTransaction.id,
      },
    });

    // Remove the linked cash-flow transaction.
    await tx.cashTransaction.deleteMany({
      where: {
        businessId,
        sourceType: "RAW_MATERIAL_PURCHASE",
        sourceId: purchase.id,
      },
    });

    // Remove the purchase record.
    await tx.rawMaterialPurchase.delete({
      where: {
        id: purchase.id,
      },
    });

    // Rebuild stock and value from the complete remaining ledger.
    const movements =
      await tx.rawMaterialInventoryTransaction.findMany({
        where: {
          businessId,
          rawMaterialId: purchase.rawMaterialId,
        },
        orderBy: [
          { createdAt: "asc" },
          { id: "asc" },
        ],
        select: {
          type: true,
          quantity: true,
          totalValue: true,
        },
      });

    let quantity = new Prisma.Decimal(0);
    let value = new Prisma.Decimal(0);

    for (const movement of movements) {
      if (
        movement.type === "PURCHASE" ||
        movement.type === "ADJUSTMENT_IN"
      ) {
        quantity = quantity.add(movement.quantity);
        value = value.add(movement.totalValue);
      } else {
        quantity = quantity.sub(movement.quantity);
        value = value.sub(movement.totalValue);
      }
    }

    if (quantity.lt(0) || value.lt(0)) {
      throw new Error(
        "Deleting this purchase would leave raw-material inventory in an invalid state. No changes were saved.",
      );
    }

    const weightedAverageCost =
      quantity.gt(0)
        ? value.div(quantity)
        : new Prisma.Decimal(0);

    await tx.rawMaterial.update({
      where: {
        id: material.id,
      },
      data: {
        currentQuantity: quantity,
        currentValue: value,
        weightedAverageCost,
      },
    });
  });
}

/**
 * Deletes a raw-material consumption transaction
 * and rebuilds inventory from the remaining ledger.
 */
export async function deleteRawMaterialConsumption(
  businessId: string,
  transactionId: string,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const transaction =
      await tx.rawMaterialInventoryTransaction.findFirst(
        {
          where: {
            id: transactionId,
            businessId,
            type: "CONSUMPTION",
          },
          select: {
            id: true,
            rawMaterialId: true,
          },
        },
      );

    if (!transaction) {
      throw new Error(
        "Raw material consumption not found.",
      );
    }

    const material =
      await tx.rawMaterial.findFirst({
        where: {
          id: transaction.rawMaterialId,
          businessId,
        },
        select: {
          id: true,
        },
      });

    if (!material) {
      throw new Error(
        "Raw material not found.",
      );
    }

    await tx.rawMaterialInventoryTransaction.delete(
      {
        where: {
          id: transaction.id,
        },
      },
    );

    const remainingTransactions =
      await tx.rawMaterialInventoryTransaction.findMany(
        {
          where: {
            businessId,
            rawMaterialId:
              transaction.rawMaterialId,
          },
          orderBy: [
            {
              createdAt: "asc",
            },
            {
              id: "asc",
            },
          ],
          select: {
            type: true,
            quantity: true,
            totalValue: true,
          },
        },
      );

    let quantity =
      new Prisma.Decimal(0);

    let value =
      new Prisma.Decimal(0);

    for (const movement of remainingTransactions) {
      if (
        movement.type ===
          "PURCHASE" ||
        movement.type ===
          "ADJUSTMENT_IN"
      ) {
        quantity =
          quantity.add(
            movement.quantity,
          );

        value =
          value.add(
            movement.totalValue,
          );
      } else {
        quantity =
          quantity.sub(
            movement.quantity,
          );

        value =
          value.sub(
            movement.totalValue,
          );
      }
    }

    if (
      quantity.lt(0) ||
      value.lt(0)
    ) {
      throw new Error(
        "Deleting this consumption would leave the material inventory in an invalid state.",
      );
    }

    const weightedAverageCost =
      quantity.gt(0)
        ? value.div(quantity)
        : new Prisma.Decimal(0);

    await tx.rawMaterial.update({
      where: {
        id: material.id,
      },
      data: {
        currentQuantity:
          quantity,
        currentValue:
          value,
        weightedAverageCost,
      },
    });
  });
}

/**
 * Deletes a raw-material wastage transaction and its
 * linked non-cash material-wastage expense.
 */
export async function deleteRawMaterialWastage(
  businessId: string,
  transactionId: string,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const transaction =
      await tx.rawMaterialInventoryTransaction.findFirst(
        {
          where: {
            id: transactionId,
            businessId,
            type: "WASTAGE",
          },
          select: {
            id: true,
            rawMaterialId: true,
          },
        },
      );

    if (!transaction) {
      throw new Error(
        "Raw material wastage not found.",
      );
    }

    const material =
      await tx.rawMaterial.findFirst({
        where: {
          id: transaction.rawMaterialId,
          businessId,
        },
        select: {
          id: true,
        },
      });

    if (!material) {
      throw new Error(
        "Raw material not found.",
      );
    }

    await tx.expense.deleteMany({
      where: {
        businessId,
        sourceType:
          "RAW_MATERIAL_WASTAGE",
        sourceId: transaction.id,
      },
    });

    await tx.rawMaterialInventoryTransaction.delete(
      {
        where: {
          id: transaction.id,
        },
      },
    );

    const remainingTransactions =
      await tx.rawMaterialInventoryTransaction.findMany(
        {
          where: {
            businessId,
            rawMaterialId:
              transaction.rawMaterialId,
          },
          orderBy: [
            {
              createdAt: "asc",
            },
            {
              id: "asc",
            },
          ],
          select: {
            type: true,
            quantity: true,
            totalValue: true,
          },
        },
      );

    let quantity =
      new Prisma.Decimal(0);

    let value =
      new Prisma.Decimal(0);

    for (const movement of remainingTransactions) {
      if (
        movement.type ===
          "PURCHASE" ||
        movement.type ===
          "ADJUSTMENT_IN"
      ) {
        quantity =
          quantity.add(
            movement.quantity,
          );

        value =
          value.add(
            movement.totalValue,
          );
      } else {
        quantity =
          quantity.sub(
            movement.quantity,
          );

        value =
          value.sub(
            movement.totalValue,
          );
      }
    }

    if (
      quantity.lt(0) ||
      value.lt(0)
    ) {
      throw new Error(
        "Deleting this wastage would leave the material inventory in an invalid state.",
      );
    }

    const weightedAverageCost =
      quantity.gt(0)
        ? value.div(quantity)
        : new Prisma.Decimal(0);

    await tx.rawMaterial.update({
      where: {
        id: material.id,
      },
      data: {
        currentQuantity:
          quantity,
        currentValue:
          value,
        weightedAverageCost,
      },
    });
  });
}

/** Permanently removes an unused raw material and its linked purchase ledger/cash outflows. */
export async function deleteRawMaterial(
  businessId: string,
  rawMaterialId: string,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const material = await tx.rawMaterial.findFirst({
      where: {
        id: rawMaterialId,
        businessId,
      },
      select: {
        id: true,
      },
    });

    if (!material) {
      throw new Error("Raw material not found.");
    }

    const [formulation, consumption] =
      await Promise.all([
        tx.productFormulationItem.findFirst({
          where: {
            businessId,
            rawMaterialId,
          },
          select: {
            id: true,
          },
        }),
        tx.productionBatchRawMaterialConsumption.findFirst({
          where: {
            businessId,
            rawMaterialId,
          },
          select: {
            id: true,
          },
        }),
      ]);

    if (formulation || consumption) {
      throw new Error(
        "This raw material is used in a product formulation or production batch and cannot be deleted.",
      );
    }

    const purchases =
      await tx.rawMaterialPurchase.findMany({
        where: {
          businessId,
          rawMaterialId,
        },
        select: {
          id: true,
        },
      });

    const purchaseIds =
      purchases.map((p) => p.id);

    if (purchaseIds.length) {
      await tx.cashTransaction.deleteMany({
        where: {
          businessId,
          sourceType:
            "RAW_MATERIAL_PURCHASE",
          sourceId: {
            in: purchaseIds,
          },
        },
      });
    }

    await tx.rawMaterialInventoryTransaction.deleteMany(
      {
        where: {
          businessId,
          rawMaterialId,
        },
      },
    );

    await tx.rawMaterialPurchase.deleteMany({
      where: {
        businessId,
        rawMaterialId,
      },
    });

    await tx.rawMaterial.delete({
      where: {
        id: material.id,
      },
    });
  });
}