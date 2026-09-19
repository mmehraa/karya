import type { InventoryTransactionType } from "@prisma/client";

export type AuditDirection = "INCREASE" | "DECREASE";

/**
 * Serialized representation of an InventoryTransaction.
 *
 * Prisma Decimal values are converted to number | null so these
 * records can safely cross the Server/Client boundary.
 */
export interface SerializedInventoryTransaction {
  id: string;
  businessId: string;
  productId: string;
  type: InventoryTransactionType;
  quantity: number;
  unitCost: number | null;
  referenceId: string | null;
  notes: string | null;
  createdAt: Date;
}

/**
 * Result returned after a normal inventory movement.
 */
export interface InventoryMovementResult {
  transaction: SerializedInventoryTransaction;
  previousStock: number;
  newStock: number;
  productId: string;
}

/**
 * Product-level inventory summary.
 *
 * currentStock:
 * Total physical stock owned by the business.
 *
 * promotionalStock:
 * Physical stock currently reserved for promotional use.
 *
 * availableStock:
 * Physical stock that remains available for normal sales.
 */
export interface ProductStockSummary {
  id: string;
  sku: string;
  name: string;
  category: string;

  currentStock: number;
  promotionalStock: number;
  availableStock: number;

  reorderLevel: number;
  cogs: number | null;

  stockStatus:
    | "OUT_OF_STOCK"
    | "LOW_STOCK"
    | "HEALTHY";

  valuation: number | null;
}

/**
 * Inventory dashboard KPIs.
 */
export interface InventoryKPIs {
  totalUnitsInStock: number;
  totalPromotionalUnits: number;
  totalAvailableUnits: number;

  lowStockCount: number;
  outOfStockCount: number;

  totalValuation: number | null;
}

/**
 * Result after allocating physical stock to promotional stock.
 *
 * Allocation does NOT change currentStock.
 */
export interface PromotionalStockAllocationResult {
  productId: string;

  previousPromotionalStock: number;
  newPromotionalStock: number;

  currentStock: number;
  availableStock: number;
}

/**
 * Result after releasing promotional stock.
 *
 * Release does NOT change currentStock.
 */
export interface PromotionalStockReleaseResult {
  productId: string;

  previousPromotionalStock: number;
  newPromotionalStock: number;

  currentStock: number;
  availableStock: number;
}

/**
 * Result after dispatching promotional stock.
 *
 * This operation changes both physical stock and promotional stock,
 * and creates the corresponding inventory + finance records.
 */
export interface PromotionalDispatchResult {
  dispatchId: string;

  productId: string;
  quantity: number;

  recipient: string;
  purpose: string;

  unitCost: number;
  totalCost: number;

  previousStock: number;
  newStock: number;

  previousPromotionalStock: number;
  newPromotionalStock: number;

  availableStock: number;

  inventoryTransactionId: string;
  expenseId: string;
}