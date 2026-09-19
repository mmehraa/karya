import type { ProductStatus } from "@prisma/client";

/**
 * Serialized representation of a Product with derived unit economics.
 * All monetary values are represented as (number | null) to ensure clean
 * JSON serialization across Next.js Server/Client component boundaries.
 */
export interface SerializedProduct {
  id: string;
  businessId: string;
  sku: string;
  name: string;
  category: string;
  description: string | null;
  status: ProductStatus;

  // Base financial fields (serialized from Decimal)
  sellingPrice: number | null;
  cogs: number | null;
  packagingCost: number | null;
  variableCost: number | null;

  // Inventory cache fields (display only)
  currentStock: number;
  reorderLevel: number;
  supplier: string | null;

  // Derived unit economics
  totalUnitCost: number | null;
  unitGrossProfit: number | null;
  unitGrossMarginPct: number | null;

  createdAt: Date;
  updatedAt: Date;
}