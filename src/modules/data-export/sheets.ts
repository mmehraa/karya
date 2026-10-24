import type { BusinessExportData } from "./services";
import type {
  AnySheetDef,
  CellInput,
  ColumnDef,
  ColumnKind,
  SheetDef,
} from "./types";

function col<T>(
  header: string,
  kind: ColumnKind,
  value: (row: T) => CellInput,
  options: Pick<ColumnDef<T>, "lookup" | "calculated"> = {},
): ColumnDef<T> {
  return {
    header,
    kind,
    value,
    ...options,
  };
}

function lookup<T>(
  header: string,
  kind: ColumnKind,
  value: (row: T) => CellInput,
): ColumnDef<T> {
  return col(`${header} (lookup)`, kind, value, {
    lookup: true,
  });
}

function calculated<T>(
  header: string,
  kind: ColumnKind,
  value: (row: T) => CellInput,
): ColumnDef<T> {
  return col(`${header} [calculated]`, kind, value, {
    calculated: true,
  });
}

/** Erases the row type so sheets of different models share one array. */
function sheet<T>(definition: SheetDef<T>): AnySheetDef {
  return {
    name: definition.name,
    source: definition.source,
    description: definition.description,
    rowCount: definition.rows.length,
    headers: definition.columns.map((column) => column.header),
    kinds: definition.columns.map((column) => column.kind),
    forEachRow: (callback) => {
      for (const row of definition.rows) {
        callback(
          definition.columns.map((column) => column.value(row)),
        );
      }
    },
  };
}

type Row<K extends keyof BusinessExportData> =
  NonNullable<BusinessExportData[K]> extends Array<infer R>
    ? R
    : NonNullable<BusinessExportData[K]>;

/**
 * Builds one worksheet definition per business-scoped Prisma model.
 *
 * Every stored scalar field is exported. Columns marked "(lookup)" are
 * copied from a related record; columns marked "[calculated]" are
 * derived from other columns on the same row.
 */
export function buildExportSheets(
  data: BusinessExportData,
  currencyCode: string | null,
): AnySheetDef[] {
  const money = (header: string) =>
    currencyCode ? `${header} (${currencyCode})` : header;

  const timestamps = <
    T extends { createdAt: Date; updatedAt: Date },
  >(): ColumnDef<T>[] => [
    col("Created At", "datetime", (row) => row.createdAt),
    col("Updated At", "datetime", (row) => row.updatedAt),
  ];

  return [
    sheet<Row<"business">>({
      name: "Business",
      source: "Business",
      description:
        "Business profile. Current stage reflects the stored value at export time.",
      rows: data.business ? [data.business] : [],
      columns: [
        col("Business ID", "id", (row) => row.id),
        col("Name", "text", (row) => row.name),
        col("Slug", "text", (row) => row.slug),
        col("Tagline", "text", (row) => row.tagline),
        col("Description", "text", (row) => row.description),
        col("Industry", "text", (row) => row.industry),
        col("Constitution", "text", (row) => row.constitution),
        col("Country Code", "text", (row) => row.countryCode),
        col("Current Stage ID", "int", (row) => row.currentStageId),
        lookup("Current Stage", "text", (row) => row.currentStage.name),
        col(
          "Founder Stage Assessment ID",
          "int",
          (row) => row.founderStageAssessmentId,
        ),
        lookup(
          "Founder Stage Assessment",
          "text",
          (row) => row.founderStageAssessment?.name,
        ),
        ...timestamps<Row<"business">>(),
      ],
    }),

    sheet<Row<"settings">>({
      name: "Business Settings",
      source: "BusinessSettings",
      description: "Currency, fiscal-year, order-numbering and support settings.",
      rows: data.settings ? [data.settings] : [],
      columns: [
        col("Settings ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Currency Code", "text", (row) => row.currencyCode),
        col("Currency Symbol", "text", (row) => row.currencySymbol),
        col("Fiscal Year Start Month", "int", (row) => row.fiscalYearStart),
        col("Order Prefix", "text", (row) => row.orderPrefix),
        col("Next Order Number", "int", (row) => row.nextOrderNumber),
        col("Support Email", "text", (row) => row.supportEmail),
        col("Support Phone", "text", (row) => row.supportPhone),
        col("Low Stock Threshold", "int", (row) => row.lowStockThreshold),
        col("Updated At", "datetime", (row) => row.updatedAt),
      ],
    }),

    sheet<Row<"products">>({
      name: "Products",
      source: "Product",
      description:
        "Product catalogue. Prices, costs and stock levels are the current stored values, not historical.",
      rows: data.products,
      columns: [
        col("Product ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Name", "text", (row) => row.name),
        col("SKU", "text", (row) => row.sku),
        col("Category", "text", (row) => row.category),
        col("Description", "text", (row) => row.description),
        col(money("Selling Price"), "money", (row) => row.sellingPrice),
        col(money("COGS"), "money", (row) => row.cogs),
        col(money("Packaging Cost"), "money", (row) => row.packagingCost),
        col(money("Variable Cost"), "money", (row) => row.variableCost),
        col("Current Stock (units)", "int", (row) => row.currentStock),
        col(
          "Promotional Stock (units)",
          "int",
          (row) => row.promotionalStock,
        ),
        col("Reorder Level (units)", "int", (row) => row.reorderLevel),
        col("Supplier", "text", (row) => row.supplier),
        col("Status", "enum", (row) => row.status),
        ...timestamps<Row<"products">>(),
      ],
    }),

    sheet<Row<"formulations">>({
      name: "Formulations",
      source: "ProductFormulation",
      description:
        "All formulation versions per product, including inactive historical versions.",
      rows: data.formulations,
      columns: [
        col("Formulation ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Product ID", "id", (row) => row.productId),
        lookup("Product SKU", "text", (row) => row.product.sku),
        lookup("Product Name", "text", (row) => row.product.name),
        col("Name", "text", (row) => row.name),
        col("Version", "int", (row) => row.version),
        col("Is Active", "boolean", (row) => row.isActive),
        col("Notes", "text", (row) => row.notes),
        ...timestamps<Row<"formulations">>(),
      ],
    }),

    sheet<Row<"formulationItems">>({
      name: "Formulation Items",
      source: "ProductFormulationItem",
      description:
        "Raw materials per formulation version. Quantity is per finished unit, in the raw material's base unit.",
      rows: data.formulationItems,
      columns: [
        col("Formulation Item ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Formulation ID", "id", (row) => row.formulationId),
        lookup("Formulation Name", "text", (row) => row.formulation.name),
        lookup(
          "Formulation Version",
          "int",
          (row) => row.formulation.version,
        ),
        col("Raw Material ID", "id", (row) => row.rawMaterialId),
        lookup("Raw Material Name", "text", (row) => row.rawMaterial.name),
        lookup("Base Unit", "enum", (row) => row.rawMaterial.baseUnit),
        col("Quantity", "quantity", (row) => row.quantity),
        col("Notes", "text", (row) => row.notes),
        ...timestamps<Row<"formulationItems">>(),
      ],
    }),

    sheet<Row<"packagingConfigurations">>({
      name: "Packaging Configs",
      source: "ProductPackagingConfiguration",
      description:
        "All packaging configuration versions per product, including inactive historical versions.",
      rows: data.packagingConfigurations,
      columns: [
        col("Packaging Config ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Product ID", "id", (row) => row.productId),
        lookup("Product SKU", "text", (row) => row.product.sku),
        lookup("Product Name", "text", (row) => row.product.name),
        col("Name", "text", (row) => row.name),
        col("Version", "int", (row) => row.version),
        col("Is Active", "boolean", (row) => row.isActive),
        col("Notes", "text", (row) => row.notes),
        ...timestamps<Row<"packagingConfigurations">>(),
      ],
    }),

    sheet<Row<"packagingConfigurationItems">>({
      name: "Packaging Config Items",
      source: "ProductPackagingConfigurationItem",
      description:
        "Packaging materials per packaging configuration version. Quantity is pieces per finished unit.",
      rows: data.packagingConfigurationItems,
      columns: [
        col("Packaging Config Item ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Packaging Config ID", "id", (row) => row.configurationId),
        lookup(
          "Packaging Config Name",
          "text",
          (row) => row.configuration.name,
        ),
        lookup(
          "Packaging Config Version",
          "int",
          (row) => row.configuration.version,
        ),
        col(
          "Packaging Material ID",
          "id",
          (row) => row.packagingMaterialId,
        ),
        lookup(
          "Packaging Material Name",
          "text",
          (row) => row.packagingMaterial.name,
        ),
        col("Quantity", "quantity", (row) => row.quantity),
        col("Notes", "text", (row) => row.notes),
        ...timestamps<Row<"packagingConfigurationItems">>(),
      ],
    }),

    sheet<Row<"rawMaterials">>({
      name: "Raw Materials",
      source: "RawMaterial",
      description:
        "Raw material master records. Quantity, value and weighted average cost are current stored balances.",
      rows: data.rawMaterials,
      columns: [
        col("Raw Material ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Name", "text", (row) => row.name),
        col("Category", "text", (row) => row.category),
        col("Base Unit", "enum", (row) => row.baseUnit),
        col("Supplier", "text", (row) => row.supplier),
        col("Notes", "text", (row) => row.notes),
        col(
          "Current Quantity (base unit)",
          "quantity",
          (row) => row.currentQuantity,
        ),
        col(money("Current Value"), "money", (row) => row.currentValue),
        col(
          money("Weighted Avg Cost per Base Unit"),
          "unitCost",
          (row) => row.weightedAverageCost,
        ),
        ...timestamps<Row<"rawMaterials">>(),
      ],
    }),

    sheet<Row<"rawMaterialPurchases">>({
      name: "Raw Material Purchases",
      source: "RawMaterialPurchase",
      description: "Every raw material purchase as recorded.",
      rows: data.rawMaterialPurchases,
      columns: [
        col("Purchase ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Raw Material ID", "id", (row) => row.rawMaterialId),
        lookup("Raw Material Name", "text", (row) => row.rawMaterial.name),
        col("Purchase Date", "datetime", (row) => row.purchaseDate),
        col("Quantity (purchase unit)", "quantity", (row) => row.quantity),
        col("Purchase Unit", "enum", (row) => row.purchaseUnit),
        col(
          "Base Quantity (base unit)",
          "quantity",
          (row) => row.baseQuantity,
        ),
        col(money("Total Amount"), "money", (row) => row.totalAmount),
        col(
          money("Cost per Base Unit"),
          "unitCost",
          (row) => row.costPerBaseUnit,
        ),
        col("Supplier", "text", (row) => row.supplier),
        col("Invoice Reference", "text", (row) => row.invoiceReference),
        col("Notes", "text", (row) => row.notes),
        ...timestamps<Row<"rawMaterialPurchases">>(),
      ],
    }),

    sheet<Row<"rawMaterialTransactions">>({
      name: "Raw Material Ledger",
      source: "RawMaterialInventoryTransaction",
      description:
        "All raw material stock movements (purchase, consumption, wastage, adjustments). Quantity is in base units.",
      rows: data.rawMaterialTransactions,
      columns: [
        col("Transaction ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Raw Material ID", "id", (row) => row.rawMaterialId),
        lookup("Raw Material Name", "text", (row) => row.rawMaterial.name),
        col("Type", "enum", (row) => row.type),
        col("Quantity (base unit)", "quantity", (row) => row.quantity),
        col(money("Unit Cost"), "unitCost", (row) => row.unitCost),
        col(money("Total Value"), "money", (row) => row.totalValue),
        col("Purchase ID", "id", (row) => row.purchaseId),
        col("Reference ID", "text", (row) => row.referenceId),
        col("Notes", "text", (row) => row.notes),
        col("Created At", "datetime", (row) => row.createdAt),
      ],
    }),

    sheet<Row<"packagingMaterials">>({
      name: "Packaging Materials",
      source: "PackagingMaterial",
      description:
        "Packaging material master records. Quantity, value and weighted average cost are current stored balances.",
      rows: data.packagingMaterials,
      columns: [
        col("Packaging Material ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Name", "text", (row) => row.name),
        col("Category", "text", (row) => row.category),
        col("Base Unit", "enum", (row) => row.baseUnit),
        col("Supplier", "text", (row) => row.supplier),
        col("Notes", "text", (row) => row.notes),
        col(
          "Current Quantity (pieces)",
          "quantity",
          (row) => row.currentQuantity,
        ),
        col(money("Current Value"), "unitCost", (row) => row.currentValue),
        col(
          money("Weighted Avg Cost per Piece"),
          "unitCost",
          (row) => row.weightedAverageCost,
        ),
        ...timestamps<Row<"packagingMaterials">>(),
      ],
    }),

    sheet<Row<"packagingMaterialPurchases">>({
      name: "Packaging Purchases",
      source: "PackagingMaterialPurchase",
      description: "Every packaging material purchase as recorded.",
      rows: data.packagingMaterialPurchases,
      columns: [
        col("Purchase ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col(
          "Packaging Material ID",
          "id",
          (row) => row.packagingMaterialId,
        ),
        lookup(
          "Packaging Material Name",
          "text",
          (row) => row.packagingMaterial.name,
        ),
        col("Purchase Date", "datetime", (row) => row.purchaseDate),
        col("Quantity (purchase unit)", "quantity", (row) => row.quantity),
        col("Purchase Unit", "enum", (row) => row.purchaseUnit),
        col(
          "Units per Purchase Unit",
          "quantity",
          (row) => row.unitsPerPurchaseUnit,
        ),
        col("Base Quantity (pieces)", "quantity", (row) => row.baseQuantity),
        col(money("Total Amount"), "money", (row) => row.totalAmount),
        col(
          money("Cost per Piece"),
          "unitCost",
          (row) => row.costPerBaseUnit,
        ),
        col("Supplier", "text", (row) => row.supplier),
        col("Invoice Reference", "text", (row) => row.invoiceReference),
        col("Notes", "text", (row) => row.notes),
        ...timestamps<Row<"packagingMaterialPurchases">>(),
      ],
    }),

    sheet<Row<"packagingMaterialTransactions">>({
      name: "Packaging Ledger",
      source: "PackagingMaterialInventoryTransaction",
      description:
        "All packaging stock movements (purchase, consumption, wastage, adjustments). Quantity is in pieces.",
      rows: data.packagingMaterialTransactions,
      columns: [
        col("Transaction ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col(
          "Packaging Material ID",
          "id",
          (row) => row.packagingMaterialId,
        ),
        lookup(
          "Packaging Material Name",
          "text",
          (row) => row.packagingMaterial.name,
        ),
        col("Type", "enum", (row) => row.type),
        col("Quantity (pieces)", "quantity", (row) => row.quantity),
        col(money("Unit Cost"), "unitCost", (row) => row.unitCost),
        col(money("Total Value"), "unitCost", (row) => row.totalValue),
        col("Purchase ID", "id", (row) => row.purchaseId),
        col("Reference ID", "text", (row) => row.referenceId),
        col("Notes", "text", (row) => row.notes),
        col("Created At", "datetime", (row) => row.createdAt),
      ],
    }),

    sheet<Row<"productionBatches">>({
      name: "Production Batches",
      source: "ProductionBatch",
      description:
        "Production batches with the formulation and packaging versions used and the cost snapshot stored at completion.",
      rows: data.productionBatches,
      columns: [
        col("Batch ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Batch Number", "text", (row) => row.batchNumber),
        col("Product ID", "id", (row) => row.productId),
        lookup("Product SKU", "text", (row) => row.product.sku),
        lookup("Product Name", "text", (row) => row.product.name),
        col("Formulation ID", "id", (row) => row.formulationId),
        lookup(
          "Formulation Version",
          "int",
          (row) => row.formulation.version,
        ),
        col(
          "Packaging Config ID",
          "id",
          (row) => row.packagingConfigurationId,
        ),
        lookup(
          "Packaging Config Version",
          "int",
          (row) => row.packagingConfiguration.version,
        ),
        col("Planned Quantity (units)", "int", (row) => row.plannedQuantity),
        col(
          "Produced Quantity (units)",
          "int",
          (row) => row.producedQuantity,
        ),
        col("Status", "enum", (row) => row.status),
        col(
          money("Raw Material Cost"),
          "unitCost",
          (row) => row.rawMaterialCost,
        ),
        col(
          money("Packaging Material Cost"),
          "unitCost",
          (row) => row.packagingMaterialCost,
        ),
        col(money("Total Cost"), "unitCost", (row) => row.totalCost),
        col(money("Cost per Unit"), "unitCost", (row) => row.costPerUnit),
        col("Completed At", "datetime", (row) => row.completedAt),
        col("Notes", "text", (row) => row.notes),
        ...timestamps<Row<"productionBatches">>(),
      ],
    }),

    sheet<Row<"batchRawMaterialConsumptions">>({
      name: "Batch Raw Material Use",
      source: "ProductionBatchRawMaterialConsumption",
      description:
        "Raw materials consumed by each production batch, with the unit cost stored at the time.",
      rows: data.batchRawMaterialConsumptions,
      columns: [
        col("Consumption ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Batch ID", "id", (row) => row.batchId),
        lookup("Batch Number", "text", (row) => row.batch.batchNumber),
        col("Raw Material ID", "id", (row) => row.rawMaterialId),
        lookup("Raw Material Name", "text", (row) => row.rawMaterial.name),
        lookup("Base Unit", "enum", (row) => row.rawMaterial.baseUnit),
        col("Quantity (base unit)", "quantity", (row) => row.quantity),
        col(money("Unit Cost"), "unitCost", (row) => row.unitCost),
        col(money("Total Cost"), "unitCost", (row) => row.totalCost),
        col("Notes", "text", (row) => row.notes),
        col("Created At", "datetime", (row) => row.createdAt),
      ],
    }),

    sheet<Row<"batchPackagingConsumptions">>({
      name: "Batch Packaging Use",
      source: "ProductionBatchPackagingConsumption",
      description:
        "Packaging materials consumed by each production batch, with the unit cost stored at the time.",
      rows: data.batchPackagingConsumptions,
      columns: [
        col("Consumption ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Batch ID", "id", (row) => row.batchId),
        lookup("Batch Number", "text", (row) => row.batch.batchNumber),
        col(
          "Packaging Material ID",
          "id",
          (row) => row.packagingMaterialId,
        ),
        lookup(
          "Packaging Material Name",
          "text",
          (row) => row.packagingMaterial.name,
        ),
        col("Quantity (pieces)", "quantity", (row) => row.quantity),
        col(money("Unit Cost"), "unitCost", (row) => row.unitCost),
        col(money("Total Cost"), "unitCost", (row) => row.totalCost),
        col("Notes", "text", (row) => row.notes),
        col("Created At", "datetime", (row) => row.createdAt),
      ],
    }),

    sheet<Row<"inventoryTransactions">>({
      name: "Finished Goods Ledger",
      source: "InventoryTransaction",
      description:
        "All finished-goods stock movements, including sales, production runs, write-offs and promotional dispatches. Quantity is in units.",
      rows: data.inventoryTransactions,
      columns: [
        col("Transaction ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Product ID", "id", (row) => row.productId),
        lookup("Product SKU", "text", (row) => row.product.sku),
        lookup("Product Name", "text", (row) => row.product.name),
        col("Type", "enum", (row) => row.type),
        col("Quantity (units)", "int", (row) => row.quantity),
        col(money("Unit Cost"), "unitCost", (row) => row.unitCost),
        col("Reference ID", "text", (row) => row.referenceId),
        col("Notes", "text", (row) => row.notes),
        col("Created At", "datetime", (row) => row.createdAt),
      ],
    }),

    sheet<Row<"customers">>({
      name: "Customers",
      source: "Customer",
      description: "Customer records and stored contact details.",
      rows: data.customers,
      columns: [
        col("Customer ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Name", "text", (row) => row.name),
        col("Email", "text", (row) => row.email),
        col("Phone", "text", (row) => row.phone),
        col("Address Line 1", "text", (row) => row.addressLine1),
        col("Address Line 2", "text", (row) => row.addressLine2),
        col("City", "text", (row) => row.city),
        col("State", "text", (row) => row.state),
        col("Postal Code", "text", (row) => row.postalCode),
        col("Country", "text", (row) => row.country),
        col("Notes", "text", (row) => row.notes),
        ...timestamps<Row<"customers">>(),
      ],
    }),

    sheet<Row<"orders">>({
      name: "Orders",
      source: "Order",
      description: "Complete order history with stored totals and statuses.",
      rows: data.orders,
      columns: [
        col("Order ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Order Number", "text", (row) => row.orderNumber),
        col("Order Date", "datetime", (row) => row.orderDate),
        col("Customer ID", "id", (row) => row.customerId),
        lookup("Customer Name", "text", (row) => row.customer.name),
        col("Payment Status", "enum", (row) => row.paymentStatus),
        col("Fulfillment Status", "enum", (row) => row.fulfillmentStatus),
        col(money("Subtotal"), "money", (row) => row.subtotal),
        col(money("Discount Amount"), "money", (row) => row.discountAmount),
        col(
          money("Shipping Charged"),
          "money",
          (row) => row.shippingCharged,
        ),
        col(money("Total Amount"), "money", (row) => row.totalAmount),
        col("Channel", "text", (row) => row.channel),
        col("Payment Method", "text", (row) => row.paymentMethod),
        col("Notes", "text", (row) => row.notes),
        ...timestamps<Row<"orders">>(),
      ],
    }),

    sheet<Row<"orderItems">>({
      name: "Order Items",
      source: "OrderItem",
      description:
        "Order line items with the unit price and cost snapshot stored when the order was placed.",
      rows: data.orderItems,
      columns: [
        col("Order Item ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Order ID", "id", (row) => row.orderId),
        lookup("Order Number", "text", (row) => row.order.orderNumber),
        col("Product ID", "id", (row) => row.productId),
        lookup("Product SKU", "text", (row) => row.product.sku),
        lookup("Product Name", "text", (row) => row.product.name),
        col("Quantity (units)", "int", (row) => row.quantity),
        col(money("Unit Price"), "money", (row) => row.unitPrice),
        col(
          money("Cost Price Snapshot"),
          "unitCost",
          (row) => row.costPriceSnapshot,
        ),
        calculated(money("Line Revenue"), "money", (row) =>
          row.unitPrice.mul(row.quantity),
        ),
        calculated(money("Line Cost"), "unitCost", (row) =>
          row.costPriceSnapshot.mul(row.quantity),
        ),
      ],
    }),

    sheet<Row<"expenses">>({
      name: "Expenses",
      source: "Expense",
      description:
        "All expense records. Source Type / Source ID link system-generated expenses to their originating record.",
      rows: data.expenses,
      columns: [
        col("Expense ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Expense Date", "datetime", (row) => row.expenseDate),
        col("Category", "enum", (row) => row.category),
        col("Description", "text", (row) => row.description),
        col(money("Amount"), "money", (row) => row.amount),
        col("Vendor", "text", (row) => row.vendor),
        col("Payment Method", "text", (row) => row.paymentMethod),
        col("Is Recurring", "boolean", (row) => row.isRecurring),
        col("Is Cash Expense", "boolean", (row) => row.isCashExpense),
        col("Notes", "text", (row) => row.notes),
        col("Source Type", "text", (row) => row.sourceType),
        col("Source ID", "text", (row) => row.sourceId),
        ...timestamps<Row<"expenses">>(),
      ],
    }),

    sheet<Row<"cashTransactions">>({
      name: "Cash Transactions",
      source: "CashTransaction",
      description:
        "Cash-flow ledger. Amounts are positive; Type indicates inflow or outflow.",
      rows: data.cashTransactions,
      columns: [
        col("Cash Transaction ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Transaction Date", "datetime", (row) => row.transactionDate),
        col("Type", "enum", (row) => row.type),
        col("Category", "enum", (row) => row.category),
        col(money("Amount"), "money", (row) => row.amount),
        col("Payment Method", "text", (row) => row.paymentMethod),
        col("Description", "text", (row) => row.description),
        col("Reference ID", "text", (row) => row.referenceId),
        col("Source Type", "text", (row) => row.sourceType),
        col("Source ID", "text", (row) => row.sourceId),
        col("Notes", "text", (row) => row.notes),
        ...timestamps<Row<"cashTransactions">>(),
      ],
    }),

    sheet<Row<"promotionalDispatches">>({
      name: "Promotional Dispatches",
      source: "PromotionalDispatch",
      description:
        "Free/promotional product dispatches, linked to their inventory transaction and expense.",
      rows: data.promotionalDispatches,
      columns: [
        col("Dispatch ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Product ID", "id", (row) => row.productId),
        lookup("Product SKU", "text", (row) => row.product.sku),
        lookup("Product Name", "text", (row) => row.product.name),
        col("Quantity (units)", "int", (row) => row.quantity),
        col("Recipient", "text", (row) => row.recipient),
        col("Purpose", "text", (row) => row.purpose),
        col("Reference ID", "text", (row) => row.referenceId),
        col(money("Unit Cost"), "money", (row) => row.unitCost),
        col(money("Total Cost"), "money", (row) => row.totalCost),
        col(
          "Inventory Transaction ID",
          "id",
          (row) => row.inventoryTransactionId,
        ),
        col("Expense ID", "id", (row) => row.expenseId),
        col("Created At", "datetime", (row) => row.createdAt),
      ],
    }),

    sheet<Row<"contentItems">>({
      name: "Marketing Content",
      source: "ContentItem",
      description: "Marketing content pipeline items.",
      rows: data.contentItems,
      columns: [
        col("Content Item ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Title", "text", (row) => row.title),
        col("Content Type", "enum", (row) => row.contentType),
        col("Status", "enum", (row) => row.status),
        col("Notes", "text", (row) => row.notes),
        ...timestamps<Row<"contentItems">>(),
      ],
    }),

    sheet<Row<"contentPublications">>({
      name: "Content Publications",
      source: "ContentPublication",
      description:
        "Per-platform publications of content items and their recorded engagement metrics.",
      rows: data.contentPublications,
      columns: [
        col("Publication ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Content Item ID", "id", (row) => row.contentItemId),
        lookup("Content Title", "text", (row) => row.contentItem.title),
        col("Platform", "enum", (row) => row.platform),
        col("Planned Date", "datetime", (row) => row.plannedDate),
        col("Published Date", "datetime", (row) => row.publishedDate),
        col("URL", "text", (row) => row.url),
        col("Views", "int", (row) => row.views),
        col("Reach", "int", (row) => row.reach),
        col("Likes", "int", (row) => row.likes),
        col("Comments", "int", (row) => row.comments),
        col("Shares", "int", (row) => row.shares),
        col("Saves", "int", (row) => row.saves),
        col("Website Clicks", "int", (row) => row.websiteClicks),
        ...timestamps<Row<"contentPublications">>(),
      ],
    }),

    sheet<Row<"goals">>({
      name: "Goals",
      source: "Goal",
      description: "Business goals. Values are in the unit given in the Unit column.",
      rows: data.goals,
      columns: [
        col("Goal ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Name", "text", (row) => row.name),
        col("Category", "text", (row) => row.category),
        col("Target Value", "decimal", (row) => row.targetValue),
        col("Current Value", "decimal", (row) => row.currentValue),
        col("Unit", "text", (row) => row.unit),
        col("Start Date", "datetime", (row) => row.startDate),
        col("End Date", "datetime", (row) => row.endDate),
        col("Is Completed", "boolean", (row) => row.isCompleted),
        ...timestamps<Row<"goals">>(),
      ],
    }),

    sheet<Row<"tasks">>({
      name: "Tasks",
      source: "Task",
      description: "Tasks, optionally linked to a goal.",
      rows: data.tasks,
      columns: [
        col("Task ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Title", "text", (row) => row.title),
        col("Description", "text", (row) => row.description),
        col("Priority", "enum", (row) => row.priority),
        col("Status", "enum", (row) => row.status),
        col("Due Date", "datetime", (row) => row.dueDate),
        col("Goal ID", "id", (row) => row.goalId),
        lookup("Goal Name", "text", (row) => row.goal?.name),
        col("Notes", "text", (row) => row.notes),
        ...timestamps<Row<"tasks">>(),
      ],
    }),

    sheet<Row<"alerts">>({
      name: "Alerts",
      source: "Alert",
      description: "Stored business alerts and whether they were resolved.",
      rows: data.alerts,
      columns: [
        col("Alert ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Title", "text", (row) => row.title),
        col("Message", "text", (row) => row.message),
        col("Severity", "enum", (row) => row.severity),
        col("Is Resolved", "boolean", (row) => row.isResolved),
        col("Link URL", "text", (row) => row.linkUrl),
        col("Created At", "datetime", (row) => row.createdAt),
      ],
    }),

    sheet<Row<"stageProgress">>({
      name: "Stage Progress",
      source: "BusinessStageProgress (+ StageRequirementDef, StageDefinition)",
      description:
        "This business's progress on each stage requirement. Requirement and stage details are lookups from the app-wide stage definitions.",
      rows: data.stageProgress,
      columns: [
        col("Progress ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Requirement ID", "id", (row) => row.requirementId),
        lookup("Requirement Code", "text", (row) => row.requirement.code),
        lookup("Requirement Title", "text", (row) => row.requirement.title),
        lookup("Requirement Type", "enum", (row) => row.requirement.type),
        lookup("Stage ID", "int", (row) => row.requirement.stageId),
        lookup(
          "Stage Name",
          "text",
          (row) => row.requirement.stageDefinition.name,
        ),
        col("Status", "enum", (row) => row.status),
        col("Completed At", "datetime", (row) => row.completedAt),
        col("Blocker Reason", "text", (row) => row.blockerReason),
        col("Notes", "text", (row) => row.notes),
        col("Updated At", "datetime", (row) => row.updatedAt),
      ],
    }),

    sheet<Row<"stageTransitions">>({
      name: "Stage Transitions",
      source: "StageTransition (+ StageDefinition)",
      description: "History of business stage changes.",
      rows: data.stageTransitions,
      columns: [
        col("Transition ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("From Stage ID", "int", (row) => row.fromStageId),
        lookup("From Stage", "text", (row) => row.fromStage.name),
        col("To Stage ID", "int", (row) => row.toStageId),
        lookup("To Stage", "text", (row) => row.toStage.name),
        col("Reason", "text", (row) => row.reason),
        col("Triggered By", "text", (row) => row.triggeredBy),
        col("Created At", "datetime", (row) => row.createdAt),
      ],
    }),

    sheet<Row<"marketAssumptions">>({
      name: "Market Assumptions",
      source: "InvestorMarketAssumption",
      description:
        "TAM / SAM / SOM assumptions. Value is in the currency given in the Currency Code column.",
      rows: data.marketAssumptions,
      columns: [
        col("Assumption ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Market", "enum", (row) => row.market),
        col("Value", "money", (row) => row.value),
        col("Currency Code", "text", (row) => row.currencyCode),
        col("Market Definition", "text", (row) => row.marketDefinition),
        col("Geography", "text", (row) => row.geography),
        col("Methodology", "text", (row) => row.methodology),
        col("Source Type", "enum", (row) => row.sourceType),
        col("Source Name", "text", (row) => row.sourceName),
        col("Source URL", "text", (row) => row.sourceUrl),
        col("As Of Date", "datetime", (row) => row.asOfDate),
        col("Notes", "text", (row) => row.notes),
        ...timestamps<Row<"marketAssumptions">>(),
      ],
    }),

    sheet<Row<"verifiedCashBalances">>({
      name: "Verified Cash Balances",
      source: "InvestorVerifiedCashBalance",
      description:
        "Manually verified cash balances. Amount is in the currency given in the Currency Code column.",
      rows: data.verifiedCashBalances,
      columns: [
        col("Balance ID", "id", (row) => row.id),
        col("Business ID", "id", (row) => row.businessId),
        col("Amount", "money", (row) => row.amount),
        col("Currency Code", "text", (row) => row.currencyCode),
        col("As Of Date", "datetime", (row) => row.asOfDate),
        col("Source Description", "text", (row) => row.sourceDescription),
        col("Notes", "text", (row) => row.notes),
        ...timestamps<Row<"verifiedCashBalances">>(),
      ],
    }),
  ];
}
