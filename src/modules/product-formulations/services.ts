import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

import type {
  CreateProductFormulationInput,
} from "./validation";

import type {
  SerializedProductFormulation,
  SerializedProductFormulationItem,
  ProductFormulationSummary,
} from "./types";

function decimalToNumber(
  value:
    | Prisma.Decimal
    | number
    | string
    | null
    | undefined
): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);

  return Number.isNaN(parsed) ? 0 : parsed;
}

function serializeFormulationItem(item: {
  id: string;
  rawMaterialId: string;
  quantity: Prisma.Decimal;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  rawMaterial: {
    name: string;
    baseUnit: "GRAM" | "MILLILITER" | "PIECE";
    weightedAverageCost: Prisma.Decimal;
  };
}): SerializedProductFormulationItem {
  const quantity = decimalToNumber(item.quantity);

  const weightedAverageCost = decimalToNumber(
    item.rawMaterial.weightedAverageCost
  );

  const lineCostDecimal = new Prisma.Decimal(
    item.quantity.toString()
  ).mul(item.rawMaterial.weightedAverageCost);

  const lineCost = decimalToNumber(lineCostDecimal);

  return {
    id: item.id,
    rawMaterialId: item.rawMaterialId,
    rawMaterialName: item.rawMaterial.name,
    baseUnit: item.rawMaterial.baseUnit,
    quantity,
    weightedAverageCost,
    lineCost,
    notes: item.notes,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function serializeFormulation(formulation: {
  id: string;
  businessId: string;
  productId: string;
  name: string;
  version: number;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    rawMaterialId: string;
    quantity: Prisma.Decimal;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    rawMaterial: {
      name: string;
      baseUnit: "GRAM" | "MILLILITER" | "PIECE";
      weightedAverageCost: Prisma.Decimal;
    };
  }>;
}): SerializedProductFormulation {
  const items = formulation.items.map(
    serializeFormulationItem
  );

  const totalCostDecimal = items.reduce(
    (total, item) =>
      total.add(
        new Prisma.Decimal(
          item.lineCost.toString()
        )
      ),
    new Prisma.Decimal(0)
  );

  return {
    id: formulation.id,
    businessId: formulation.businessId,
    productId: formulation.productId,
    name: formulation.name,
    version: formulation.version,
    isActive: formulation.isActive,
    notes: formulation.notes,
    items,
    totalRawMaterialCost:
      decimalToNumber(totalCostDecimal),
    createdAt: formulation.createdAt,
    updatedAt: formulation.updatedAt,
  };
}

export async function getProductFormulations(
  businessId: string,
  productId: string
): Promise<SerializedProductFormulation[]> {
  const product = await db.product.findFirst({
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

  const formulations =
    await db.productFormulation.findMany({
      where: {
        businessId,
        productId,
      },
      include: {
        items: {
          include: {
            rawMaterial: {
              select: {
                name: true,
                baseUnit: true,
                weightedAverageCost: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        version: "desc",
      },
    });

  return formulations.map(
    serializeFormulation
  );
}

export async function getActiveProductFormulation(
  businessId: string,
  productId: string
): Promise<SerializedProductFormulation | null> {
  const product = await db.product.findFirst({
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

  const formulation =
    await db.productFormulation.findFirst({
      where: {
        businessId,
        productId,
        isActive: true,
      },
      include: {
        items: {
          include: {
            rawMaterial: {
              select: {
                name: true,
                baseUnit: true,
                weightedAverageCost: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        version: "desc",
      },
    });

  if (!formulation) {
    return null;
  }

  return serializeFormulation(formulation);
}

export async function createProductFormulation(
  businessId: string,
  input: CreateProductFormulationInput
): Promise<SerializedProductFormulation> {
  const rawMaterialIds = input.items.map(
    (item) => item.rawMaterialId
  );

  const uniqueRawMaterialIds = [
    ...new Set(rawMaterialIds),
  ];

  if (
    uniqueRawMaterialIds.length !==
    rawMaterialIds.length
  ) {
    throw new Error(
      "A raw material can only appear once in a formulation."
    );
  }

  const formulation = await db.$transaction(
    async (tx) => {
      const product = await tx.product.findFirst({
        where: {
          id: input.productId,
          businessId,
        },
        select: {
          id: true,
        },
      });

      if (!product) {
        throw new Error("Product not found.");
      }

      const rawMaterials =
        await tx.rawMaterial.findMany({
          where: {
            businessId,
            id: {
              in: uniqueRawMaterialIds,
            },
          },
          select: {
            id: true,
          },
        });

      if (
        rawMaterials.length !==
        uniqueRawMaterialIds.length
      ) {
        throw new Error(
          "One or more selected raw materials were not found in this business."
        );
      }

      const latestFormulation =
        await tx.productFormulation.findFirst({
          where: {
            businessId,
            productId: input.productId,
          },
          orderBy: {
            version: "desc",
          },
          select: {
            version: true,
          },
        });

      const nextVersion =
        (latestFormulation?.version ?? 0) + 1;

      await tx.productFormulation.updateMany({
        where: {
          businessId,
          productId: input.productId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      return tx.productFormulation.create({
        data: {
          businessId,
          productId: input.productId,
          name: input.name,
          version: nextVersion,
          isActive: true,
          notes: input.notes ?? null,

          items: {
            create: input.items.map((item) => ({
              businessId,
              rawMaterialId:
                item.rawMaterialId,
              quantity: new Prisma.Decimal(
                item.quantity.toFixed(6)
              ),
              notes: item.notes ?? null,
            })),
          },
        },

        include: {
          items: {
            include: {
              rawMaterial: {
                select: {
                  name: true,
                  baseUnit: true,
                  weightedAverageCost: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });
    }
  );

  return serializeFormulation(formulation);
}

/**
 * Deletes a formulation version.
 *
 * Rules:
 * - Tenant isolation is enforced through businessId.
 * - A formulation referenced by ANY production batch cannot
 *   be deleted because production history depends on it.
 * - If the deleted version was active and another version
 *   remains, the latest remaining version becomes active.
 * - If no versions remain, the product has no active
 *   formulation.
 *
 * The operation is transactional.
 */
export async function deleteProductFormulation(
  businessId: string,
  formulationId: string
): Promise<void> {
  await db.$transaction(async (tx) => {
    const formulation =
      await tx.productFormulation.findFirst({
        where: {
          id: formulationId,
          businessId,
        },
        select: {
          id: true,
          productId: true,
          version: true,
          isActive: true,
        },
      });

    if (!formulation) {
      throw new Error(
        "Formulation version not found."
      );
    }

    const productionBatchCount =
      await tx.productionBatch.count({
        where: {
          businessId,
          formulationId,
        },
      });

    if (productionBatchCount > 0) {
      throw new Error(
        "This formulation version is used by a production batch and cannot be deleted."
      );
    }

    await tx.productFormulation.delete({
      where: {
        id: formulation.id,
      },
    });

    if (formulation.isActive) {
      const fallback =
        await tx.productFormulation.findFirst({
          where: {
            businessId,
            productId:
              formulation.productId,
          },
          orderBy: {
            version: "desc",
          },
          select: {
            id: true,
          },
        });

      if (fallback) {
        await tx.productFormulation.update({
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

export async function getProductFormulationSummaries(
  businessId: string,
  productId: string
): Promise<ProductFormulationSummary[]> {
  const product = await db.product.findFirst({
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

  const formulations =
    await db.productFormulation.findMany({
      where: {
        businessId,
        productId,
      },
      include: {
        items: {
          include: {
            rawMaterial: {
              select: {
                weightedAverageCost: true,
              },
            },
          },
        },
      },
      orderBy: {
        version: "desc",
      },
    });

  return formulations.map(
    (formulation) => {
      const totalCost =
        formulation.items.reduce(
          (total, item) => {
            const lineCost =
              new Prisma.Decimal(
                item.quantity.toString()
              ).mul(
                item.rawMaterial
                  .weightedAverageCost
              );

            return total.add(lineCost);
          },
          new Prisma.Decimal(0)
        );

      return {
        id: formulation.id,
        productId:
          formulation.productId,
        name: formulation.name,
        version:
          formulation.version,
        isActive:
          formulation.isActive,
        totalRawMaterialCost:
          decimalToNumber(totalCost),
        createdAt:
          formulation.createdAt,
        updatedAt:
          formulation.updatedAt,
      };
    }
  );
}