export interface SerializedRawMaterial {
  id: string;
  businessId: string;
  name: string;
  category: string | null;
  baseUnit:
    | "GRAM"
    | "MILLILITER"
    | "PIECE";
  supplier: string | null;
  notes: string | null;

  currentQuantity: number;
  currentValue: number;
  weightedAverageCost: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface SerializedRawMaterialPurchase {
  id: string;
  businessId: string;
  rawMaterialId: string;

  purchaseDate: Date;

  quantity: number;
  purchaseUnit:
    | "GRAM"
    | "KILOGRAM"
    | "MILLILITER"
    | "LITER"
    | "PIECE";

  baseQuantity: number;
  totalAmount: number;
  costPerBaseUnit: number;

  supplier: string | null;
  invoiceReference: string | null;
  notes: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface SerializedRawMaterialInventoryTransaction {
  id: string;
  businessId: string;
  rawMaterialId: string;

  type:
    | "PURCHASE"
    | "CONSUMPTION"
    | "WASTAGE"
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