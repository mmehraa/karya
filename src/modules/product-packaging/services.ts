import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

import type {
  SerializedProductPackagingConfiguration,
  SerializedProductPackagingConfigurationItem,
} from "./types";

import type {
  CreateProductPackagingConfigurationInput,
} from "./validation";

/**
 * Converts a Prisma Decimal into a JavaScript number.
 *
 * These values are used for JSON serialization across
 * Server Action → Client Component boundaries.
 */
function decimalToNumber(
  value: Prisma.Decimal | null | undefined
): number {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value.toString());
}

/**
 * Builds the serialized representation of a packaging
 * configuration and calculates its current packaging cost.
 *
 * IMPORTANT:
 *
 * Packaging cost is NOT stored permanently in the
 * configuration.
 *
 * It is calculated dynamically from the current
 * weighted-average cost of each PackagingMaterial.
 *
 * Therefore, if a packaging material is purchased later
 * at a different price, the configuration's current
 * packaging cost automatically reflects the new
 * weighted-average cost.
 */
function serializePackagingConfiguration(
  configuration: {
    id: string;
    businessId: string;
    productId: string;
    name: string;
    version: number;
    isActive: boolean;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    product: {
      name: string;
      sku: string;
    };
    items: Array<{
      id: string;
      quantity: Prisma.Decimal;
      notes: string | null;
      packagingMaterial: {
        id: string;
        name: string;
        baseUnit: "PIECE";
        weightedAverageCost: Prisma.Decimal;
      };
    }>;
  }
): SerializedProductPackagingConfiguration {
  const items: SerializedProductPackagingConfigurationItem[] =
    configuration.items.map((item) => {
      const quantity = decimalToNumber(item.quantity);

      const weightedAverageCost = decimalToNumber(
        item.packagingMaterial.weightedAverageCost
      );

      const lineCost =
        quantity * weightedAverageCost;

      return {
        id: item.id,
        packagingMaterialId:
          item.packagingMaterial.id,
        packagingMaterialName:
          item.packagingMaterial.name,
        baseUnit:
          item.packagingMaterial.baseUnit,
        quantity,
        weightedAverageCost,
        lineCost,
        notes: item.notes,
      };
    });

  const totalPackagingCost = items.reduce(
    (total, item) => total + item.lineCost,
    0
  );

  return {
    id: configuration.id,
    businessId: configuration.businessId,
    productId: configuration.productId,
    productName: configuration.product.name,
    productSku: configuration.product.sku,
    name: configuration.name,
    version: configuration.version,
    isActive: configuration.isActive,
    notes: configuration.notes,
    items,
    totalPackagingCost,
    createdAt: configuration.createdAt,
    updatedAt: configuration.updatedAt,
  };
}

/**
 * Creates a new packaging configuration version.
 *
 * Rules:
 * - Product must belong to the active business.
 * - Every packaging material must belong to the active business.
 * - A packaging material may appear only once in a version.
 * - A new version automatically becomes active.
 * - Any previous active version is deactivated.
 * - Creating a configuration NEVER consumes inventory.
 * - Packaging cost is calculated dynamically from the
 *   current weighted-average material costs.
 */
export async function createProductPackagingConfiguration(
  businessId: string,
  input: CreateProductPackagingConfigurationInput
): Promise<SerializedProductPackagingConfiguration> {
  return db.$transaction(async (tx) => {
    const product =
      await tx.product.findFirst({
        where: {
          id: input.productId,
          businessId,
        },
        select: {
          id: true,
          name: true,
          sku: true,
        },
      });

    if (!product) {
      throw new Error("Product not found.");
    }

    const requestedMaterialIds =
      input.items.map(
        (item) =>
          item.packagingMaterialId
      );

    const uniqueMaterialIds =
      Array.from(
        new Set(requestedMaterialIds)
      );

    if (
      uniqueMaterialIds.length !==
      requestedMaterialIds.length
    ) {
      throw new Error(
        "The same packaging material cannot be added more than once to the same configuration."
      );
    }

    const packagingMaterials =
      await tx.packagingMaterial.findMany({
        where: {
          businessId,
          id: {
            in: uniqueMaterialIds,
          },
        },
        select: {
          id: true,
          name: true,
          baseUnit: true,
          weightedAverageCost: true,
        },
      });

    if (
      packagingMaterials.length !==
      uniqueMaterialIds.length
    ) {
      throw new Error(
        "One or more packaging materials were not found or do not belong to this business."
      );
    }

    const latestVersion =
      await tx.productPackagingConfiguration.findFirst({
        where: {
          businessId,
          productId: product.id,
        },
        orderBy: {
          version: "desc",
        },
        select: {
          version: true,
        },
      });

    const nextVersion =
      (latestVersion?.version ?? 0) + 1;

    await tx.productPackagingConfiguration.updateMany({
      where: {
        businessId,
        productId: product.id,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    const configuration =
      await tx.productPackagingConfiguration.create({
        data: {
          businessId,
          productId: product.id,
          name:
            input.name ??
            "Default Packaging",
          version: nextVersion,
          isActive: true,
          notes:
            input.notes ?? null,
          items: {
            create: input.items.map(
              (item) => ({
                businessId,
                packagingMaterialId:
                  item.packagingMaterialId,
                quantity:
                  new Prisma.Decimal(
                    item.quantity
                  ),
                notes:
                  item.notes ?? null,
              })
            ),
          },
        },
        include: {
          product: {
            select: {
              name: true,
              sku: true,
            },
          },
          items: {
            orderBy: {
              createdAt: "asc",
            },
            include: {
              packagingMaterial: {
                select: {
                  id: true,
                  name: true,
                  baseUnit: true,
                  weightedAverageCost: true,
                },
              },
            },
          },
        },
      });

    return serializePackagingConfiguration(
      configuration
    );
  });
}

/**
 * Returns all packaging configurations for a product,
 * including historical versions.
 *
 * Costs are calculated using the CURRENT weighted-average
 * cost of each packaging material.
 */
export async function getProductPackagingConfigurations(
  businessId: string,
  productId: string
): Promise<
  SerializedProductPackagingConfiguration[]
> {
  const product =
    await db.product.findFirst({
      where: {
        id: productId,
        businessId,
      },
      select: {
        id: true,
      },
    });

  if (!product) {
    throw new Error("Product not found.");
  }

  const configurations =
    await db.productPackagingConfiguration.findMany({
      where: {
        businessId,
        productId,
      },
      orderBy: {
        version: "asc",
      },
      include: {
        product: {
          select: {
            name: true,
            sku: true,
          },
        },
        items: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            packagingMaterial: {
              select: {
                id: true,
                name: true,
                baseUnit: true,
                weightedAverageCost: true,
              },
            },
          },
        },
      },
    });

  return configurations.map(
    serializePackagingConfiguration
  );
}

/**
 * Returns one packaging configuration.
 */
export async function getProductPackagingConfiguration(
  businessId: string,
  configurationId: string
): Promise<
  SerializedProductPackagingConfiguration
> {
  const configuration =
    await db.productPackagingConfiguration.findFirst({
      where: {
        id: configurationId,
        businessId,
      },
      include: {
        product: {
          select: {
            name: true,
            sku: true,
          },
        },
        items: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            packagingMaterial: {
              select: {
                id: true,
                name: true,
                baseUnit: true,
                weightedAverageCost: true,
              },
            },
          },
        },
      },
    });

  if (!configuration) {
    throw new Error(
      "Packaging configuration not found."
    );
  }

  return serializePackagingConfiguration(
    configuration
  );
}

/**
 * Returns the currently active packaging configuration
 * for a product.
 */
export async function getActiveProductPackagingConfiguration(
  businessId: string,
  productId: string
): Promise<
  SerializedProductPackagingConfiguration | null
> {
  const configuration =
    await db.productPackagingConfiguration.findFirst({
      where: {
        businessId,
        productId,
        isActive: true,
      },
      orderBy: {
        version: "desc",
      },
      include: {
        product: {
          select: {
            name: true,
            sku: true,
          },
        },
        items: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            packagingMaterial: {
              select: {
                id: true,
                name: true,
                baseUnit: true,
                weightedAverageCost: true,
              },
            },
          },
        },
      },
    });

  if (!configuration) {
    return null;
  }

  return serializePackagingConfiguration(
    configuration
  );
}

/**
 * Deletes a packaging configuration version.
 *
 * Rules:
 * - Configuration must belong to the active business.
 * - A configuration referenced by a production batch
 *   cannot be deleted.
 * - Active configurations may be deleted.
 * - If the deleted configuration was active and another
 *   version remains, the latest remaining version becomes
 *   active.
 * - If the deleted configuration was the only version,
 *   the product is left without a packaging configuration.
 *
 * This operation never changes inventory.
 */
export async function deleteProductPackagingConfiguration(
  businessId: string,
  configurationId: string
): Promise<void> {
  await db.$transaction(async (tx) => {
    const configuration =
      await tx.productPackagingConfiguration.findFirst({
        where: {
          id: configurationId,
          businessId,
        },
        select: {
          id: true,
          productId: true,
          version: true,
          isActive: true,
        },
      });

    if (!configuration) {
      throw new Error(
        "Packaging configuration not found."
      );
    }

    const productionBatchCount =
      await tx.productionBatch.count({
        where: {
          businessId,
          packagingConfigurationId:
            configurationId,
        },
      });

    if (productionBatchCount > 0) {
      throw new Error(
        "This packaging configuration is used by a production batch and cannot be deleted."
      );
    }

    await tx.productPackagingConfiguration.delete({
      where: {
        id: configuration.id,
      },
    });

    if (configuration.isActive) {
      const fallback =
        await tx.productPackagingConfiguration.findFirst({
          where: {
            businessId,
            productId: configuration.productId,
          },
          orderBy: {
            version: "desc",
          },
          select: {
            id: true,
          },
        });

      if (fallback) {
        await tx.productPackagingConfiguration.update({
          where: {
            id: fallback.id,
          },
          data: {
            isActive: true,
          },
        });
      }
    }
  });
}