import type {
  PackagingMaterialBaseUnit,
} from "@prisma/client";

export interface SerializedProductPackagingConfigurationItem {
  id: string;
  packagingMaterialId: string;
  packagingMaterialName: string;
  baseUnit: PackagingMaterialBaseUnit;
  quantity: number;
  weightedAverageCost: number;
  lineCost: number;
  notes: string | null;
}

export interface SerializedProductPackagingConfiguration {
  id: string;
  businessId: string;
  productId: string;
  productName: string;
  productSku: string;
  name: string;
  version: number;
  isActive: boolean;
  notes: string | null;
  items: SerializedProductPackagingConfigurationItem[];
  totalPackagingCost: number;
  createdAt: Date;
  updatedAt: Date;
}