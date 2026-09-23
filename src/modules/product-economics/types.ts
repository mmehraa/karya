export interface ProductEconomicsComponent {
  isComplete: boolean;
  costPerUnit: number | null;
  missingReason: string | null;
  sourceId: string | null;
  sourceVersion: number | null;
}

export interface ProductEconomics {
  productId: string;
  businessId: string;

  productName: string;
  sku: string;
  sellingPrice: number | null;
  rawMaterialCostPerUnit: number | null;
  packagingCostPerUnit: number | null;
  preShippingUnitCost: number | null;
  contributionProfitPerUnit: number | null;
  contributionMarginPct: number | null;
  isComplete: boolean;
  incompleteReason: string | null;
  rawMaterialComponent: ProductEconomicsComponent;
  packagingComponent: ProductEconomicsComponent;
  activeFormulationId: string | null;
  activeFormulationVersion: number | null;
  activePackagingConfigurationId: string | null;
  activePackagingConfigurationVersion: number | null;
}