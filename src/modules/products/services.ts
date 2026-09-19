import { db } from "@/lib/db";
import { getDashboardContext } from "@/modules/business/dashboard-context";
import { Prisma } from "@prisma/client";
import type { SerializedProduct } from "./types";
import type { CreateProductInput, UpdateProductInput } from "./validation";

/**
 * Safely transforms a Prisma Decimal, number, string, or null/undefined
 * into a pure number | null without coercing missing values to 0.
 */
function decimalToNumber(
  value: Prisma.Decimal | number | string | null | undefined
): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Safely transforms a number | null | undefined into a Prisma.Decimal | null | undefined
 * for database write operations by normalizing to a fixed two-decimal string representation.
 */
function numberToDecimal(
  value: number | null | undefined
): Prisma.Decimal | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Prisma.Decimal(value.toFixed(2));
}

/**
 * Computes derived unit economics following strict financial integrity rules:
 * - If any cost component is null, totalUnitCost is null.
 * - If totalUnitCost or sellingPrice is null, unitGrossProfit is null.
 * - If sellingPrice is null or 0, unitGrossMarginPct is null.
 * - Never treats null/missing values as 0.
 */
function calculateUnitEconomics(
  sellingPrice: number | null,
  cogs: number | null,
  packagingCost: number | null,
  variableCost: number | null
): {
  totalUnitCost: number | null;
  unitGrossProfit: number | null;
  unitGrossMarginPct: number | null;
} {
  if (cogs === null || packagingCost === null || variableCost === null) {
    return {
      totalUnitCost: null,
      unitGrossProfit: null,
      unitGrossMarginPct: null,
    };
  }

  const totalUnitCost = cogs + packagingCost + variableCost;

  if (sellingPrice === null) {
    return {
      totalUnitCost,
      unitGrossProfit: null,
      unitGrossMarginPct: null,
    };
  }

  const unitGrossProfit = sellingPrice - totalUnitCost;

  if (sellingPrice === 0) {
    return {
      totalUnitCost,
      unitGrossProfit,
      unitGrossMarginPct: null,
    };
  }

  const unitGrossMarginPct = (unitGrossProfit / sellingPrice) * 100;

  return {
    totalUnitCost,
    unitGrossProfit,
    unitGrossMarginPct,
  };
}

/**
 * Helper to serialize a raw database Product record with derived unit economics.
 */
function serializeProduct(product: {
  id: string;
  businessId: string;
  sku: string;
  name: string;
  category: string;
  description: string | null;
  status: SerializedProduct["status"];
  sellingPrice: Prisma.Decimal | null;
  cogs: Prisma.Decimal | null;
  packagingCost: Prisma.Decimal | null;
  variableCost: Prisma.Decimal | null;
  currentStock: number;
  reorderLevel: number;
  supplier: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SerializedProduct {
  const sellingPrice = decimalToNumber(product.sellingPrice);
  const cogs = decimalToNumber(product.cogs);
  const packagingCost = decimalToNumber(product.packagingCost);
  const variableCost = decimalToNumber(product.variableCost);

  const economics = calculateUnitEconomics(
    sellingPrice,
    cogs,
    packagingCost,
    variableCost
  );

  return {
    id: product.id,
    businessId: product.businessId,
    sku: product.sku,
    name: product.name,
    category: product.category,
    description: product.description,
    status: product.status,
    sellingPrice,
    cogs,
    packagingCost,
    variableCost,
    currentStock: product.currentStock,
    reorderLevel: product.reorderLevel,
    supplier: product.supplier,
    totalUnitCost: economics.totalUnitCost,
    unitGrossProfit: economics.unitGrossProfit,
    unitGrossMarginPct: economics.unitGrossMarginPct,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

/**
 * Retrieves all products for the active business context in deterministic order.
 */
export async function getActiveBusinessProducts(): Promise<SerializedProduct[]> {
  const { businessId } = await getDashboardContext();

  const products = await db.product.findMany({
    where: {
      businessId,
    },
    orderBy: [
      { name: "asc" },
      { sku: "asc" },
    ],
  });

  return products.map(serializeProduct);
}

/**
 * Creates a new product for the active business.
 * Tenant boundary is enforced by injecting businessId server-side.
 * currentStock is deliberately excluded and cannot be set on creation.
 */
export async function createProduct(
  businessId: string,
  input: CreateProductInput
): Promise<SerializedProduct> {
  const created = await db.product.create({
    data: {
      businessId,
      name: input.name,
      sku: input.sku,
      category: input.category,
      description: input.description ?? null,
      supplier: input.supplier ?? null,
      status: input.status,
      reorderLevel: input.reorderLevel ?? 20,
      sellingPrice: numberToDecimal(input.sellingPrice) ?? null,
      cogs: numberToDecimal(input.cogs) ?? null,
      packagingCost: numberToDecimal(input.packagingCost) ?? null,
      variableCost: numberToDecimal(input.variableCost) ?? null,
    },
  });

  return serializeProduct(created);
}

/**
 * Updates an existing product for the active business.
 * Scoped strictly via @@unique([businessId, id]) to guarantee tenant isolation.
 * currentStock is deliberately excluded from editable fields.
 */
export async function updateProduct(
  businessId: string,
  input: UpdateProductInput
): Promise<SerializedProduct> {
  const { id, ...fields } = input;

  const updateData: Prisma.ProductUpdateInput = {};

  if (fields.name !== undefined) updateData.name = fields.name;
  if (fields.sku !== undefined) updateData.sku = fields.sku;
  if (fields.category !== undefined) updateData.category = fields.category;
  if (fields.description !== undefined) updateData.description = fields.description;
  if (fields.supplier !== undefined) updateData.supplier = fields.supplier;
  if (fields.status !== undefined) updateData.status = fields.status;
  if (fields.reorderLevel !== undefined) updateData.reorderLevel = fields.reorderLevel;

  if (fields.sellingPrice !== undefined) {
    updateData.sellingPrice = numberToDecimal(fields.sellingPrice);
  }
  if (fields.cogs !== undefined) {
    updateData.cogs = numberToDecimal(fields.cogs);
  }
  if (fields.packagingCost !== undefined) {
    updateData.packagingCost = numberToDecimal(fields.packagingCost);
  }
  if (fields.variableCost !== undefined) {
    updateData.variableCost = numberToDecimal(fields.variableCost);
  }

  const updated = await db.product.update({
    where: {
      businessId_id: {
        businessId,
        id,
      },
    },
    data: updateData,
  });

  return serializeProduct(updated);
}