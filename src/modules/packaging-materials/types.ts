export interface SerializedPackagingMaterial {
  id: string;
  businessId: string;
  name: string;
  category: string | null;
  baseUnit: "PIECE";
  supplier: string | null;
  notes: string | null;

  currentQuantity: number;
  currentValue: number;
  weightedAverageCost: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface SerializedPackagingMaterialPurchase {
  id: string;
  businessId: string;
  packagingMaterialId: string;

  purchaseDate: Date;

  quantity: number;
  purchaseUnit:
    | "PIECE"
    | "PACK"
    | "BOX"
    | "BUNDLE"
    | "CARTON";

  unitsPerPurchaseUnit: number;
  baseQuantity: number;
  totalAmount: number;
  costPerBaseUnit: number;

  supplier: string | null;
  invoiceReference: string | null;
  notes: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface SerializedPackagingMaterialInventoryTransaction {
  id: string;
  businessId: string;
  packagingMaterialId: string;

  type:
    | "PURCHASE"
    | "CONSUMPTION"
    | "ADJUSTMENT_IN"
    | "ADJUSTMENT_OUT";

  quantity: number;
  unitCost: number;
  totalValue: number;

  purchaseId: string | null;
  referenceId: string | null;
  notes: string | null;

  createdAt: Date;
}