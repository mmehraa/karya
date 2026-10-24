import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

const chronological: Array<{
  createdAt?: Prisma.SortOrder;
  id?: Prisma.SortOrder;
}> = [{ createdAt: "asc" }, { id: "asc" }];

/** Generous limit so large exports are not cut off mid-read. */
const EXPORT_TRANSACTION_TIMEOUT_MS = 60_000;

const productLookup = {
  select: {
    sku: true,
    name: true,
  },
} as const;

const nameLookup = {
  select: {
    name: true,
  },
} as const;

/**
 * Reads every record stored for one business.
 *
 * All reads run sequentially in one repeatable-read transaction
 * so ledgers, purchases, orders and cash entries come from the same
 * point-in-time snapshot. Every query is scoped by `businessId`.
 */
export async function getBusinessExportData(businessId: string) {
  const where = { businessId };

  return db.$transaction(
    async (tx) => {
      const business = await tx.business.findUnique({
        where: { id: businessId },
        include: {
          currentStage: nameLookup,
          founderStageAssessment: nameLookup,
        },
      });

      const settings = await tx.businessSettings.findUnique({
        where,
      });

      const products = await tx.product.findMany({
        where,
        orderBy: chronological,
      });

      const formulations = await tx.productFormulation.findMany({
        where,
        orderBy: [
          { productId: "asc" },
          { version: "asc" },
          { id: "asc" },
        ],
        include: { product: productLookup },
      });

      const formulationItems = await tx.productFormulationItem.findMany({
        where,
        orderBy: chronological,
        include: {
          formulation: {
            select: { name: true, version: true },
          },
          rawMaterial: {
            select: { name: true, baseUnit: true },
          },
        },
      });

      const packagingConfigurations = await tx.productPackagingConfiguration.findMany({
        where,
        orderBy: [
          { productId: "asc" },
          { version: "asc" },
          { id: "asc" },
        ],
        include: { product: productLookup },
      });

      const packagingConfigurationItems = await tx.productPackagingConfigurationItem.findMany({
        where,
        orderBy: chronological,
        include: {
          configuration: {
            select: { name: true, version: true },
          },
          packagingMaterial: nameLookup,
        },
      });

      const rawMaterials = await tx.rawMaterial.findMany({
        where,
        orderBy: chronological,
      });

      const rawMaterialPurchases = await tx.rawMaterialPurchase.findMany({
        where,
        orderBy: [
          { purchaseDate: "asc" },
          { id: "asc" },
        ],
        include: { rawMaterial: nameLookup },
      });

      const rawMaterialTransactions = await tx.rawMaterialInventoryTransaction.findMany({
        where,
        orderBy: chronological,
        include: { rawMaterial: nameLookup },
      });

      const packagingMaterials = await tx.packagingMaterial.findMany({
        where,
        orderBy: chronological,
      });

      const packagingMaterialPurchases = await tx.packagingMaterialPurchase.findMany({
        where,
        orderBy: [
          { purchaseDate: "asc" },
          { id: "asc" },
        ],
        include: { packagingMaterial: nameLookup },
      });

      const packagingMaterialTransactions = await tx.packagingMaterialInventoryTransaction.findMany({
        where,
        orderBy: chronological,
        include: { packagingMaterial: nameLookup },
      });

      const productionBatches = await tx.productionBatch.findMany({
        where,
        orderBy: chronological,
        include: {
          product: productLookup,
          formulation: {
            select: { version: true },
          },
          packagingConfiguration: {
            select: { version: true },
          },
        },
      });

      const batchRawMaterialConsumptions = await tx.productionBatchRawMaterialConsumption.findMany({
        where,
        orderBy: chronological,
        include: {
          batch: {
            select: { batchNumber: true },
          },
          rawMaterial: {
            select: { name: true, baseUnit: true },
          },
        },
      });

      const batchPackagingConsumptions = await tx.productionBatchPackagingConsumption.findMany({
        where,
        orderBy: chronological,
        include: {
          batch: {
            select: { batchNumber: true },
          },
          packagingMaterial: nameLookup,
        },
      });

      const inventoryTransactions = await tx.inventoryTransaction.findMany({
        where,
        orderBy: chronological,
        include: { product: productLookup },
      });

      const customers = await tx.customer.findMany({
        where,
        orderBy: chronological,
      });

      const orders = await tx.order.findMany({
        where,
        orderBy: [
          { orderDate: "asc" },
          { id: "asc" },
        ],
        include: { customer: nameLookup },
      });

      const orderItems = await tx.orderItem.findMany({
        where,
        orderBy: [
          { orderId: "asc" },
          { id: "asc" },
        ],
        include: {
          order: {
            select: { orderNumber: true },
          },
          product: productLookup,
        },
      });

      const expenses = await tx.expense.findMany({
        where,
        orderBy: [
          { expenseDate: "asc" },
          { id: "asc" },
        ],
      });

      const cashTransactions = await tx.cashTransaction.findMany({
        where,
        orderBy: [
          { transactionDate: "asc" },
          { id: "asc" },
        ],
      });

      const promotionalDispatches = await tx.promotionalDispatch.findMany({
        where,
        orderBy: chronological,
        include: { product: productLookup },
      });

      const contentItems = await tx.contentItem.findMany({
        where,
        orderBy: chronological,
      });

      const contentPublications = await tx.contentPublication.findMany({
        where,
        orderBy: chronological,
        include: {
          contentItem: {
            select: { title: true },
          },
        },
      });

      const goals = await tx.goal.findMany({
        where,
        orderBy: chronological,
      });

      const tasks = await tx.task.findMany({
        where,
        orderBy: chronological,
        include: { goal: nameLookup },
      });

      const alerts = await tx.alert.findMany({
        where,
        orderBy: chronological,
      });

      const stageProgress = await tx.businessStageProgress.findMany({
        where,
        orderBy: [
          { requirement: { stageId: "asc" } },
          { requirement: { orderIndex: "asc" } },
          { id: "asc" },
        ],
        include: {
          requirement: {
            select: {
              code: true,
              title: true,
              type: true,
              stageId: true,
              stageDefinition: nameLookup,
            },
          },
        },
      });

      const stageTransitions = await tx.stageTransition.findMany({
        where,
        orderBy: chronological,
        include: {
          fromStage: nameLookup,
          toStage: nameLookup,
        },
      });

      const marketAssumptions = await tx.investorMarketAssumption.findMany({
        where,
        orderBy: chronological,
      });

      const verifiedCashBalances = await tx.investorVerifiedCashBalance.findMany({
        where,
        orderBy: chronological,
      });

      return {
        business,
        settings,
        products,
        formulations,
        formulationItems,
        packagingConfigurations,
        packagingConfigurationItems,
        rawMaterials,
        rawMaterialPurchases,
        rawMaterialTransactions,
        packagingMaterials,
        packagingMaterialPurchases,
        packagingMaterialTransactions,
        productionBatches,
        batchRawMaterialConsumptions,
        batchPackagingConsumptions,
        inventoryTransactions,
        customers,
        orders,
        orderItems,
        expenses,
        cashTransactions,
        promotionalDispatches,
        contentItems,
        contentPublications,
        goals,
        tasks,
        alerts,
        stageProgress,
        stageTransitions,
        marketAssumptions,
        verifiedCashBalances,
      };
    },
    {
      isolationLevel:
        Prisma.TransactionIsolationLevel.RepeatableRead,
      timeout: EXPORT_TRANSACTION_TIMEOUT_MS,
    },
  );
}

export type BusinessExportData = Awaited<
  ReturnType<typeof getBusinessExportData>
>;
