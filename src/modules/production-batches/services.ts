import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

import type {
  SerializedProductionBatch,
  SerializedProductionBatchPackagingConsumption,
  SerializedProductionBatchRawMaterialConsumption,
} from "./types";

import type {
  CompleteProductionBatchInput,
  CreateProductionBatchInput,
} from "./validation";

function decimalToNumber(
  value: Prisma.Decimal | null,
): number | null {
  return value === null ? null : Number(value);
}

function serializeRawMaterialConsumption(
  item: {
    id: string;
    rawMaterialId: string;
    quantity: Prisma.Decimal;
    unitCost: Prisma.Decimal;
    totalCost: Prisma.Decimal;
    notes: string | null;
    rawMaterial: {
      name: string;
      baseUnit:
        | "GRAM"
        | "MILLILITER"
        | "PIECE";
    };
  },
): SerializedProductionBatchRawMaterialConsumption {
  return {
    id: item.id,
    rawMaterialId: item.rawMaterialId,
    rawMaterialName: item.rawMaterial.name,
    baseUnit: item.rawMaterial.baseUnit,
    quantity: Number(item.quantity),
    unitCost: Number(item.unitCost),
    totalCost: Number(item.totalCost),
    notes: item.notes,
  };
}

function serializePackagingConsumption(
  item: {
    id: string;
    packagingMaterialId: string;
    quantity: Prisma.Decimal;
    unitCost: Prisma.Decimal;
    totalCost: Prisma.Decimal;
    notes: string | null;
    packagingMaterial: {
      name: string;
      baseUnit: "PIECE";
    };
  },
): SerializedProductionBatchPackagingConsumption {
  return {
    id: item.id,
    packagingMaterialId:
      item.packagingMaterialId,
    packagingMaterialName:
      item.packagingMaterial.name,
    baseUnit:
      item.packagingMaterial.baseUnit,
    quantity: Number(item.quantity),
    unitCost: Number(item.unitCost),
    totalCost: Number(item.totalCost),
    notes: item.notes,
  };
}

function serializeProductionBatch(
  batch: {
    id: string;
    businessId: string;
    productId: string;
    formulationId: string;
    packagingConfigurationId: string;
    batchNumber: string;
    plannedQuantity: number;
    producedQuantity: number | null;
    status:
      | "DRAFT"
      | "COMPLETED"
      | "CANCELLED";
    rawMaterialCost: Prisma.Decimal | null;
    packagingMaterialCost: Prisma.Decimal | null;
    totalCost: Prisma.Decimal | null;
    costPerUnit: Prisma.Decimal | null;
    completedAt: Date | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;

    product: {
      name: string;
      sku: string;
    };

    formulation: {
      name: string;
      version: number;
    };

    packagingConfiguration: {
      name: string;
      version: number;
    };

    rawMaterialConsumptions: Array<{
      id: string;
      rawMaterialId: string;
      quantity: Prisma.Decimal;
      unitCost: Prisma.Decimal;
      totalCost: Prisma.Decimal;
      notes: string | null;
      rawMaterial: {
        name: string;
        baseUnit:
          | "GRAM"
          | "MILLILITER"
          | "PIECE";
      };
    }>;

    packagingConsumptions: Array<{
      id: string;
      packagingMaterialId: string;
      quantity: Prisma.Decimal;
      unitCost: Prisma.Decimal;
      totalCost: Prisma.Decimal;
      notes: string | null;
      packagingMaterial: {
        name: string;
        baseUnit: "PIECE";
      };
    }>;
  },
): SerializedProductionBatch {
  return {
    id: batch.id,
    businessId: batch.businessId,

    productId: batch.productId,
    productName: batch.product.name,
    productSku: batch.product.sku,

    formulationId: batch.formulationId,
    formulationName: batch.formulation.name,
    formulationVersion: batch.formulation.version,

    packagingConfigurationId:
      batch.packagingConfigurationId,
    packagingConfigurationName:
      batch.packagingConfiguration.name,
    packagingConfigurationVersion:
      batch.packagingConfiguration.version,

    batchNumber: batch.batchNumber,

    plannedQuantity:
      batch.plannedQuantity,

    producedQuantity:
      batch.producedQuantity,

    status: batch.status,

    rawMaterialCost:
      decimalToNumber(
        batch.rawMaterialCost,
      ),

    packagingMaterialCost:
      decimalToNumber(
        batch.packagingMaterialCost,
      ),

    totalCost:
      decimalToNumber(
        batch.totalCost,
      ),

    costPerUnit:
      decimalToNumber(
        batch.costPerUnit,
      ),

    completedAt:
      batch.completedAt,

    notes:
      batch.notes,

    createdAt:
      batch.createdAt,

    updatedAt:
      batch.updatedAt,

    rawMaterialConsumptions:
      batch.rawMaterialConsumptions.map(
        serializeRawMaterialConsumption,
      ),

    packagingConsumptions:
      batch.packagingConsumptions.map(
        serializePackagingConsumption,
      ),
  };
}

const productionBatchInclude = {
  product: {
    select: {
      name: true,
      sku: true,
    },
  },

  formulation: {
    select: {
      name: true,
      version: true,
    },
  },

  packagingConfiguration: {
    select: {
      name: true,
      version: true,
    },
  },

  rawMaterialConsumptions: {
    orderBy: {
      createdAt: "asc" as const,
    },

    include: {
      rawMaterial: {
        select: {
          name: true,
          baseUnit: true,
        },
      },
    },
  },

  packagingConsumptions: {
    orderBy: {
      createdAt: "asc" as const,
    },

    include: {
      packagingMaterial: {
        select: {
          name: true,
          baseUnit: true,
        },
      },
    },
  },
};

export async function createProductionBatch(
  businessId: string,
  input: CreateProductionBatchInput,
): Promise<SerializedProductionBatch> {
  return db.$transaction(async (tx) => {
    const existingBatch =
      await tx.productionBatch.findFirst({
        where: {
          businessId,
          batchNumber: input.batchNumber,
        },
        select: {
          id: true,
        },
      });

    if (existingBatch) {
      throw new Error(
        "A production batch with this batch number already exists.",
      );
    }

    const product =
      await tx.product.findFirst({
        where: {
          id: input.productId,
          businessId,
        },
        select: {
          id: true,
        },
      });

    if (!product) {
      throw new Error(
        "Product not found.",
      );
    }

    const formulation =
      await tx.productFormulation.findFirst({
        where: {
          id: input.formulationId,
          businessId,
          productId: input.productId,
        },
        select: {
          id: true,
          version: true,
          isActive: true,
        },
      });

    if (!formulation) {
      throw new Error(
        "The selected formulation does not belong to this product.",
      );
    }

    const packagingConfiguration =
      await tx.productPackagingConfiguration.findFirst({
        where: {
          id:
            input.packagingConfigurationId,
          businessId,
          productId:
            input.productId,
        },
        select: {
          id: true,
          version: true,
          isActive: true,
        },
      });

    if (!packagingConfiguration) {
      throw new Error(
        "The selected packaging configuration does not belong to this product.",
      );
    }

    const batch =
      await tx.productionBatch.create({
        data: {
          businessId,

          productId:
            input.productId,

          formulationId:
            input.formulationId,

          packagingConfigurationId:
            input.packagingConfigurationId,

          batchNumber:
            input.batchNumber,

          plannedQuantity:
            input.plannedQuantity,

          notes:
            input.notes?.trim() || null,
        },

        include:
          productionBatchInclude,
      });

    return serializeProductionBatch(
      batch,
    );
  });
}

export async function getProductionBatches(
  businessId: string,
  productId?: string,
): Promise<SerializedProductionBatch[]> {
  const batches =
    await db.productionBatch.findMany({
      where: {
        businessId,

        ...(productId
          ? {
              productId,
            }
          : {}),
      },

      orderBy: [
        {
          createdAt: "desc",
        },
        {
          batchNumber: "desc",
        },
      ],

      include:
        productionBatchInclude,
    });

  return batches.map(
    serializeProductionBatch,
  );
}

export async function getProductionBatch(
  businessId: string,
  batchId: string,
): Promise<SerializedProductionBatch> {
  const batch =
    await db.productionBatch.findFirst({
      where: {
        id: batchId,
        businessId,
      },

      include:
        productionBatchInclude,
    });

  if (!batch) {
    throw new Error(
      "Production batch not found.",
    );
  }

  return serializeProductionBatch(
    batch,
  );
}

/**
 * Completes a production batch atomically.
 *
 * This operation:
 *
 * 1. Loads the batch and its exact formulation/configuration versions.
 * 2. Calculates material requirements from actual produced quantity.
 * 3. Locks raw-material and packaging-material inventory rows.
 * 4. Verifies sufficient stock.
 * 5. Consumes raw materials.
 * 6. Consumes packaging materials.
 * 7. Creates detailed batch consumption records.
 * 8. Calculates actual batch cost.
 * 9. Adds finished units to product inventory.
 * 10. Creates a PRODUCTION_RUN inventory transaction.
 * 11. Marks the batch COMPLETED.
 *
 * If anything fails, the entire transaction rolls back.
 */
export async function completeProductionBatch(
  businessId: string,
  input: CompleteProductionBatchInput,
): Promise<SerializedProductionBatch> {
  return db.$transaction(
    async (tx) => {
      const batch =
        await tx.productionBatch.findFirst({
          where: {
            id: input.batchId,
            businessId,
          },

          include: {
            formulation: {
              include: {
                items: {
                  orderBy: {
                    createdAt: "asc",
                  },
                },
              },
            },

            packagingConfiguration: {
              include: {
                items: {
                  orderBy: {
                    createdAt: "asc",
                  },
                },
              },
            },

            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                currentStock: true,
                promotionalStock: true,
              },
            },
          },
        });

      if (!batch) {
        throw new Error(
          "Production batch not found.",
        );
      }

      if (batch.status === "COMPLETED") {
        throw new Error(
          "This production batch has already been completed.",
        );
      }

      if (batch.status === "CANCELLED") {
        throw new Error(
          "A cancelled production batch cannot be completed.",
        );
      }

      if (
        batch.formulation.productId !==
        batch.productId
      ) {
        throw new Error(
          "The batch formulation does not belong to the selected product.",
        );
      }

      if (
        batch.packagingConfiguration.productId !==
        batch.productId
      ) {
        throw new Error(
          "The batch packaging configuration does not belong to the selected product.",
        );
      }

      if (
        batch.formulation.items.length ===
        0
      ) {
        throw new Error(
          "The selected formulation contains no raw materials.",
        );
      }

      if (
        batch.packagingConfiguration.items
          .length === 0
      ) {
        throw new Error(
          "The selected packaging configuration contains no packaging materials.",
        );
      }

      const producedQuantity =
        new Prisma.Decimal(
          input.producedQuantity,
        );

      /*
       * ---------------------------------------------------------------
       * PREPARE RAW MATERIAL REQUIREMENTS
       * ---------------------------------------------------------------
       */

      const rawRequirements =
        batch.formulation.items.map(
          (item) => ({
            rawMaterialId:
              item.rawMaterialId,

            quantity:
              item.quantity.mul(
                producedQuantity,
              ),
          }),
        );

      /*
       * ---------------------------------------------------------------
       * PREPARE PACKAGING REQUIREMENTS
       * ---------------------------------------------------------------
       */

      const packagingRequirements =
        batch.packagingConfiguration.items.map(
          (item) => ({
            packagingMaterialId:
              item.packagingMaterialId,

            quantity:
              item.quantity.mul(
                producedQuantity,
              ),
          }),
        );

      /*
       * ---------------------------------------------------------------
       * LOCK + LOAD RAW MATERIALS
       * ---------------------------------------------------------------
       */

      const rawMaterialStates =
        new Map<
          string,
          {
            id: string;
            name: string;
            currentQuantity: Prisma.Decimal;
            currentValue: Prisma.Decimal;
            weightedAverageCost: Prisma.Decimal;
          }
        >();

      for (const requirement of rawRequirements) {
        const rows =
          await tx.$queryRaw<
            Array<{
              id: string;
              name: string;
              currentQuantity: Prisma.Decimal;
              currentValue: Prisma.Decimal;
              weightedAverageCost: Prisma.Decimal;
            }>
          >`
            SELECT
              "id",
              "name",
              "currentQuantity",
              "currentValue",
              "weightedAverageCost"
            FROM "RawMaterial"
            WHERE
              "id" = ${requirement.rawMaterialId}
              AND "businessId" = ${businessId}
            FOR UPDATE
          `;

        const material =
          rows[0];

        if (!material) {
          throw new Error(
            "One of the raw materials used by this formulation no longer exists.",
          );
        }

        rawMaterialStates.set(
          material.id,
          material,
        );
      }

      /*
       * ---------------------------------------------------------------
       * LOCK + LOAD PACKAGING MATERIALS
       * ---------------------------------------------------------------
       */

      const packagingMaterialStates =
        new Map<
          string,
          {
            id: string;
            name: string;
            currentQuantity: Prisma.Decimal;
            currentValue: Prisma.Decimal;
            weightedAverageCost: Prisma.Decimal;
          }
        >();

      for (const requirement of packagingRequirements) {
        const rows =
          await tx.$queryRaw<
            Array<{
              id: string;
              name: string;
              currentQuantity: Prisma.Decimal;
              currentValue: Prisma.Decimal;
              weightedAverageCost: Prisma.Decimal;
            }>
          >`
            SELECT
              "id",
              "name",
              "currentQuantity",
              "currentValue",
              "weightedAverageCost"
            FROM "PackagingMaterial"
            WHERE
              "id" = ${requirement.packagingMaterialId}
              AND "businessId" = ${businessId}
            FOR UPDATE
          `;

        const material =
          rows[0];

        if (!material) {
          throw new Error(
            "One of the packaging materials used by this configuration no longer exists.",
          );
        }

        packagingMaterialStates.set(
          material.id,
          material,
        );
      }

      /*
       * ---------------------------------------------------------------
       * VERIFY RAW MATERIAL STOCK
       * ---------------------------------------------------------------
       */

      for (const requirement of rawRequirements) {
        const material =
          rawMaterialStates.get(
            requirement.rawMaterialId,
          );

        if (!material) {
          throw new Error(
            "Raw material inventory could not be loaded.",
          );
        }

        if (
          material.currentQuantity.lt(
            requirement.quantity,
          )
        ) {
          throw new Error(
            `Insufficient stock for raw material "${material.name}". ` +
              `Required ${requirement.quantity.toString()}, ` +
              `available ${material.currentQuantity.toString()}.`,
          );
        }
      }

      /*
       * ---------------------------------------------------------------
       * VERIFY PACKAGING STOCK
       * ---------------------------------------------------------------
       */

      for (const requirement of packagingRequirements) {
        const material =
          packagingMaterialStates.get(
            requirement.packagingMaterialId,
          );

        if (!material) {
          throw new Error(
            "Packaging material inventory could not be loaded.",
          );
        }

        if (
          material.currentQuantity.lt(
            requirement.quantity,
          )
        ) {
          throw new Error(
            `Insufficient stock for packaging material "${material.name}". ` +
              `Required ${requirement.quantity.toString()}, ` +
              `available ${material.currentQuantity.toString()}.`,
          );
        }
      }

      /*
       * ---------------------------------------------------------------
       * CONSUME RAW MATERIALS
       * ---------------------------------------------------------------
       */

      let rawMaterialCost =
        new Prisma.Decimal(0);

      for (const requirement of rawRequirements) {
        const material =
          rawMaterialStates.get(
            requirement.rawMaterialId,
          );

        if (!material) {
          throw new Error(
            "Raw material inventory could not be loaded.",
          );
        }

        const unitCost =
          material.weightedAverageCost;

        const totalCost =
          requirement.quantity.mul(
            unitCost,
          );

        const newQuantity =
          material.currentQuantity.sub(
            requirement.quantity,
          );

        const newValue =
          material.currentValue.sub(
            totalCost,
          );

        const normalizedValue =
          newValue.lt(0)
            ? new Prisma.Decimal(0)
            : newValue;

        const newWeightedAverageCost =
          newQuantity.gt(0)
            ? normalizedValue.div(
                newQuantity,
              )
            : new Prisma.Decimal(0);

        await tx.rawMaterialInventoryTransaction.create(
          {
            data: {
              businessId,

              rawMaterialId:
                material.id,

              type: "CONSUMPTION",

              quantity:
                requirement.quantity,

              unitCost,

              totalValue:
                totalCost,

              referenceId:
                batch.id,

              notes:
                `Production batch ${batch.batchNumber}`,
            },
          },
        );

        await tx.rawMaterial.update({
          where: {
            id: material.id,
          },

          data: {
            currentQuantity:
              newQuantity,

            currentValue:
              normalizedValue,

            weightedAverageCost:
              newWeightedAverageCost,
          },
        });

        await tx.productionBatchRawMaterialConsumption.create(
          {
            data: {
              businessId,

              batchId:
                batch.id,

              rawMaterialId:
                material.id,

              quantity:
                requirement.quantity,

              unitCost,

              totalCost,

              notes:
                `Consumed for production batch ${batch.batchNumber}`,
            },
          },
        );

        rawMaterialCost =
          rawMaterialCost.add(
            totalCost,
          );
      }

      /*
       * ---------------------------------------------------------------
       * CONSUME PACKAGING MATERIALS
       * ---------------------------------------------------------------
       */

      let packagingMaterialCost =
        new Prisma.Decimal(0);

      for (const requirement of packagingRequirements) {
        const material =
          packagingMaterialStates.get(
            requirement.packagingMaterialId,
          );

        if (!material) {
          throw new Error(
            "Packaging material inventory could not be loaded.",
          );
        }

        const unitCost =
          material.weightedAverageCost;

        const totalCost =
          requirement.quantity.mul(
            unitCost,
          );

        const newQuantity =
          material.currentQuantity.sub(
            requirement.quantity,
          );

        const newValue =
          material.currentValue.sub(
            totalCost,
          );

        const normalizedValue =
          newValue.lt(0)
            ? new Prisma.Decimal(0)
            : newValue;

        const newWeightedAverageCost =
          newQuantity.gt(0)
            ? normalizedValue.div(
                newQuantity,
              )
            : new Prisma.Decimal(0);

        await tx.packagingMaterialInventoryTransaction.create(
          {
            data: {
              businessId,

              packagingMaterialId:
                material.id,

              type: "CONSUMPTION",

              quantity:
                requirement.quantity,

              unitCost,

              totalValue:
                totalCost,

              referenceId:
                batch.id,

              notes:
                `Production batch ${batch.batchNumber}`,
            },
          },
        );

        await tx.packagingMaterial.update({
          where: {
            id: material.id,
          },

          data: {
            currentQuantity:
              newQuantity,

            currentValue:
              normalizedValue,

            weightedAverageCost:
              newWeightedAverageCost,
          },
        });

        await tx.productionBatchPackagingConsumption.create(
          {
            data: {
              businessId,

              batchId:
                batch.id,

              packagingMaterialId:
                material.id,

              quantity:
                requirement.quantity,

              unitCost,

              totalCost,

              notes:
                `Consumed for production batch ${batch.batchNumber}`,
            },
          },
        );

        packagingMaterialCost =
          packagingMaterialCost.add(
            totalCost,
          );
      }

      /*
       * ---------------------------------------------------------------
       * CALCULATE BATCH COST
       * ---------------------------------------------------------------
       */

      const totalCost =
        rawMaterialCost.add(
          packagingMaterialCost,
        );

      const costPerUnit =
        totalCost.div(
          producedQuantity,
        );

      /*
       * ---------------------------------------------------------------
       * ADD FINISHED GOODS TO PRODUCT INVENTORY
       * ---------------------------------------------------------------
       */

      const producedUnits =
        input.producedQuantity;

      const previousStock =
        batch.product.currentStock;

      const newStock =
        previousStock +
        producedUnits;

      await tx.inventoryTransaction.create({
        data: {
          businessId,

          productId:
            batch.productId,

          type: "PRODUCTION_RUN",

          quantity:
            producedUnits,

          unitCost:
            costPerUnit,

          referenceId:
            batch.id,

          notes:
            `Production batch ${batch.batchNumber}`,
        },
      });

      await tx.product.update({
        where: {
          id: batch.productId,
        },

        data: {
          currentStock:
            newStock,
        },
      });

      /*
       * ---------------------------------------------------------------
       * COMPLETE BATCH
       * ---------------------------------------------------------------
       */

      const updatedBatch =
        await tx.productionBatch.update({
          where: {
            id: batch.id,
          },

          data: {
            producedQuantity:
              producedUnits,

            status:
              "COMPLETED",

            rawMaterialCost,

            packagingMaterialCost,

            totalCost,

            costPerUnit,

            completedAt:
              new Date(),

            notes:
              input.notes !== undefined
                ? input.notes.trim() || null
                : batch.notes,
          },

          include:
            productionBatchInclude,
        });

      return serializeProductionBatch(
        updatedBatch,
      );
    },
  );
}

export async function cancelProductionBatch(
  businessId: string,
  batchId: string,
): Promise<SerializedProductionBatch> {
  return db.$transaction(async (tx) => {
    const batch =
      await tx.productionBatch.findFirst({
        where: {
          id: batchId,
          businessId,
        },

        select: {
          id: true,
          status: true,
        },
      });

    if (!batch) {
      throw new Error(
        "Production batch not found.",
      );
    }

    if (batch.status === "COMPLETED") {
      throw new Error(
        "A completed production batch cannot be cancelled.",
      );
    }

    if (batch.status === "CANCELLED") {
      throw new Error(
        "This production batch is already cancelled.",
      );
    }

    const updatedBatch =
      await tx.productionBatch.update({
        where: {
          id: batch.id,
        },

        data: {
          status:
            "CANCELLED",
        },

        include:
          productionBatchInclude,
      });

    return serializeProductionBatch(
      updatedBatch,
    );
  });
}

export async function deleteProductionBatch(
  businessId: string,
  batchId: string,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const batch =
      await tx.productionBatch.findFirst({
        where: {
          id: batchId,
          businessId,
        },

        select: {
          id: true,
          status: true,
        },
      });

    if (!batch) {
      throw new Error(
        "Production batch not found.",
      );
    }

    if (batch.status !== "CANCELLED") {
      throw new Error(
        "Only cancelled production batches can be deleted.",
      );
    }

    await tx.productionBatch.delete({
      where: {
        id: batch.id,
      },
    });
  });
}
