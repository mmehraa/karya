export type ProductionBatchStatus =
  | "DRAFT"
  | "COMPLETED"
  | "CANCELLED";

export interface SerializedProductionBatchRawMaterialConsumption {
  id: string;
  rawMaterialId: string;
  rawMaterialName: string;
  baseUnit: "GRAM" | "MILLILITER" | "PIECE";
  quantity: number;
  unitCost: number;
  totalCost: number;
  notes: string | null;
}

export interface SerializedProductionBatchPackagingConsumption {
  id: string;
  packagingMaterialId: string;
  packagingMaterialName: string;
  baseUnit: "PIECE";
  quantity: number;
  unitCost: number;
  totalCost: number;
  notes: string | null;
}

export interface SerializedProductionBatch {
  id: string;
  businessId: string;

  productId: string;
  productName: string;
  productSku: string;

  formulationId: string;
  formulationName: string;
  formulationVersion: number;

  packagingConfigurationId: string;
  packagingConfigurationName: string;
  packagingConfigurationVersion: number;

  batchNumber: string;

  plannedQuantity: number;
  producedQuantity: number | null;

  status: ProductionBatchStatus;

  rawMaterialCost: number | null;
  packagingMaterialCost: number | null;
  totalCost: number | null;
  costPerUnit: number | null;

  completedAt: Date | null;
  notes: string | null;

  createdAt: Date;
  updatedAt: Date;

  rawMaterialConsumptions:
    SerializedProductionBatchRawMaterialConsumption[];

  packagingConsumptions:
    SerializedProductionBatchPackagingConsumption[];
}