import type {
  ProductFormulation,
  RawMaterialBaseUnit,
} from "@prisma/client";

/**
 * One raw-material line inside a product formulation.
 *
 * Cost is calculated dynamically from the raw material's
 * current weighted-average cost.
 */
export interface SerializedProductFormulationItem {
  id: string;
  rawMaterialId: string;
  rawMaterialName: string;
  baseUnit: RawMaterialBaseUnit;

  /**
   * Quantity required to manufacture ONE finished product unit.
   */
  quantity: number;

  /**
   * Current weighted-average cost of the raw material
   * per base unit.
   */
  weightedAverageCost: number;

  /**
   * quantity × weightedAverageCost
   */
  lineCost: number;

  notes: string | null;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Serialized Product Formulation.
 *
 * totalRawMaterialCost is calculated dynamically from the
 * current raw-material weighted-average costs.
 */
export interface SerializedProductFormulation {
  id: string;
  businessId: string;
  productId: string;

  name: string;
  version: number;
  isActive: boolean;
  notes: string | null;

  items: SerializedProductFormulationItem[];

  /**
   * Total raw-material cost required to manufacture
   * ONE finished product unit.
   */
  totalRawMaterialCost: number;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Lightweight formulation reference used when a full
 * formulation is not required.
 */
export interface ProductFormulationSummary {
  id: string;
  productId: string;
  name: string;
  version: number;
  isActive: boolean;
  totalRawMaterialCost: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Keeps the Prisma model import intentionally available
 * for module consumers that need to identify formulation
 * records without exposing Prisma Decimal values.
 */
export type ProductFormulationRecord = ProductFormulation;