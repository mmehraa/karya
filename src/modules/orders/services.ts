import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { deductStockForOrder } from "@/modules/inventory/services";
import { createCashTransactionInTransaction } from "@/modules/cash-flow/services";

import type {
  CreateOrderInput,
  UpdateOrderInput,
} from "./validation";

import type {
  OrderListItem,
  SerializedOrder,
  SerializedOrderItem,
} from "./types";

function serializeOrderItem(
  item: {
    id: string;
    orderId: string;
    productId: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    costPriceSnapshot: Prisma.Decimal;
    product: {
      name: string;
      sku: string;
    };
  },
): SerializedOrderItem {
  const unitPrice = Number(item.unitPrice);

  return {
    id: item.id,
    orderId: item.orderId,
    productId: item.productId,
    productName: item.product.name,
    sku: item.product.sku,
    quantity: item.quantity,
    unitPrice,
    costPriceSnapshot: Number(item.costPriceSnapshot),
    lineSubtotal: unitPrice * item.quantity,
  };
}

function serializeOrder(order: {
  id: string;
  businessId: string;
  customerId: string;
  orderNumber: string;
  orderDate: Date;
  paymentStatus: SerializedOrder["paymentStatus"];
  fulfillmentStatus: SerializedOrder["fulfillmentStatus"];
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  shippingCharged: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  channel: string;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    name: string;
  };
  items: Array<{
    id: string;
    orderId: string;
    productId: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    costPriceSnapshot: Prisma.Decimal;
    product: {
      name: string;
      sku: string;
    };
  }>;
}): SerializedOrder {
  return {
    id: order.id,
    businessId: order.businessId,
    customerId: order.customerId,
    customerName: order.customer.name,
    orderNumber: order.orderNumber,
    orderDate: order.orderDate,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    subtotal: Number(order.subtotal),
    discountAmount: Number(order.discountAmount),
    shippingCharged: Number(order.shippingCharged),
    totalAmount: Number(order.totalAmount),
    channel: order.channel,
    paymentMethod: order.paymentMethod,
    notes: order.notes,
    items: order.items.map(serializeOrderItem),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export async function getOrders(
  businessId: string,
): Promise<OrderListItem[]> {
  const orders = await db.order.findMany({
    where: {
      businessId,
    },
    include: {
      customer: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
    orderBy: [
      {
        orderDate: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    orderDate: order.orderDate,
    customerName: order.customer.name,
    itemCount: order._count.items,
    totalAmount: Number(order.totalAmount),
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    channel: order.channel,
  }));
}

export async function getOrderById(
  businessId: string,
  orderId: string,
): Promise<SerializedOrder | null> {
  const order = await db.order.findFirst({
    where: {
      id: orderId,
      businessId,
    },
    include: {
      customer: {
        select: {
          name: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              name: true,
              sku: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    return null;
  }

  return serializeOrder(order);
}

function calculateOrderTotals(
  items: CreateOrderInput["items"],
  discountAmount: number,
  shippingCharged: number,
) {
  const subtotal = items.reduce(
    (sum, item) =>
      sum + item.quantity * item.unitPrice,
    0,
  );

  if (discountAmount > subtotal) {
    throw new Error(
      "Discount cannot be greater than the order subtotal.",
    );
  }

  const totalAmount =
    subtotal -
    discountAmount +
    shippingCharged;

  return {
    subtotal,
    discountAmount,
    shippingCharged,
    totalAmount,
  };
}

/**
 * Calculate the V2 pre-shipping unit cost for a product.
 *
 * IMPORTANT:
 * This intentionally uses the active formulation,
 * active packaging configuration, and the current
 * weighted-average inventory costs.
 *
 * It does NOT use the legacy Product.cogs,
 * Product.packagingCost, or Product.variableCost fields.
 */
async function getProductUnitCost(
  tx: Prisma.TransactionClient,
  businessId: string,
  productId: string,
): Promise<Prisma.Decimal> {
  const product = await tx.product.findFirst({
    where: {
      id: productId,
      businessId,
    },
    select: {
      id: true,
      name: true,
      status: true,
    },
  });

  if (!product) {
    throw new Error("Product not found.");
  }

  if (product.status !== "ACTIVE") {
    throw new Error(
      `${product.name} is not active and cannot be added to an order.`,
    );
  }

  const activeFormulation =
    await tx.productFormulation.findFirst({
      where: {
        businessId,
        productId,
        isActive: true,
      },
      orderBy: {
        version: "desc",
      },
      select: {
        id: true,
        version: true,
        items: {
          select: {
            quantity: true,
            rawMaterial: {
              select: {
                weightedAverageCost: true,
              },
            },
          },
        },
      },
    });

  if (!activeFormulation) {
    throw new Error(
      `${product.name} does not have an active product formulation.`,
    );
  }

  if (activeFormulation.items.length === 0) {
    throw new Error(
      `${product.name} has an active formulation with no raw materials.`,
    );
  }

  const activePackagingConfiguration =
    await tx.productPackagingConfiguration.findFirst({
      where: {
        businessId,
        productId,
        isActive: true,
      },
      orderBy: {
        version: "desc",
      },
      select: {
        id: true,
        version: true,
        items: {
          select: {
            quantity: true,
            packagingMaterial: {
              select: {
                weightedAverageCost: true,
              },
            },
          },
        },
      },
    });

  if (!activePackagingConfiguration) {
    throw new Error(
      `${product.name} does not have an active packaging configuration.`,
    );
  }

  if (
    activePackagingConfiguration.items.length ===
    0
  ) {
    throw new Error(
      `${product.name} has an active packaging configuration with no packaging materials.`,
    );
  }

  const rawMaterialCost =
    activeFormulation.items.reduce(
      (total, item) => {
        return total.add(
          new Prisma.Decimal(
            item.quantity,
          ).mul(
            item.rawMaterial
              .weightedAverageCost,
          ),
        );
      },
      new Prisma.Decimal(0),
    );

  const packagingCost =
    activePackagingConfiguration.items.reduce(
      (total, item) => {
        return total.add(
          new Prisma.Decimal(
            item.quantity,
          ).mul(
            item.packagingMaterial
              .weightedAverageCost,
          ),
        );
      },
      new Prisma.Decimal(0),
    );

  const preShippingUnitCost =
    rawMaterialCost.add(
      packagingCost,
    );

  if (!preShippingUnitCost.isFinite()) {
    throw new Error(
      `${product.name} does not have a valid product unit cost.`,
    );
  }

  return preShippingUnitCost;
}

/**
 * Creates the customer-payment cash inflow for an order.
 *
 * Order creation is atomic, so the order and its cash movement
 * either both succeed or both roll back.
 */
async function createCustomerPaymentCashTransaction(
  tx: Prisma.TransactionClient,
  input: {
    businessId: string;
    orderId: string;
    orderNumber: string;
    orderDate: Date;
    totalAmount: Prisma.Decimal;
    paymentMethod: string | null;
  },
) {
  await createCashTransactionInTransaction(
    tx,
    {
      businessId: input.businessId,
      transactionDate:
        input.orderDate,
      type: "INFLOW",
      category: "CUSTOMER_PAYMENT",
      amount: input.totalAmount,
      paymentMethod:
        input.paymentMethod,
      description: `Customer payment — ${input.orderNumber}`,
      referenceId: input.orderId,
      sourceType: "ORDER",
      sourceId: input.orderId,
      notes: null,
    },
  );
}

/**
 * Creates the customer-refund cash outflow for an order.
 *
 * The original customer-payment inflow is intentionally retained
 * as historical cash movement. The refund is represented as a
 * separate outflow.
 */
async function createCustomerRefundCashTransaction(
  tx: Prisma.TransactionClient,
  input: {
    businessId: string;
    orderId: string;
    orderNumber: string;
    orderDate: Date;
    totalAmount: Prisma.Decimal;
    paymentMethod: string | null;
  },
) {
  await createCashTransactionInTransaction(
    tx,
    {
      businessId: input.businessId,
      transactionDate:
        new Date(),
      type: "OUTFLOW",
      category: "CUSTOMER_REFUND",
      amount: input.totalAmount,
      paymentMethod:
        input.paymentMethod,
      description: `Customer refund — ${input.orderNumber}`,
      referenceId: input.orderId,
      sourceType: "ORDER_REFUND",
      sourceId: input.orderId,
      notes: `Refund for order ${input.orderNumber}.`,
    },
  );
}

export async function createOrder(
  businessId: string,
  input: CreateOrderInput,
): Promise<SerializedOrder> {
  return db.$transaction(async (tx) => {
    /*
     * ---------------------------------------------------------
     * CUSTOMER
     * ---------------------------------------------------------
     */

    const customer =
      await tx.customer.findFirst({
        where: {
          id: input.customerId,
          businessId,
        },
        select: {
          id: true,
          name: true,
        },
      });

    if (!customer) {
      throw new Error(
        "Customer not found.",
      );
    }

    /*
     * ---------------------------------------------------------
     * PRODUCTS
     * ---------------------------------------------------------
     */

    const productIds =
      input.items.map(
        (item) => item.productId,
      );

    const products =
      await tx.product.findMany({
        where: {
          businessId,
          id: {
            in: productIds,
          },
        },
        select: {
          id: true,
          name: true,
          sku: true,
          status: true,
          sellingPrice: true,
        },
      });

    if (
      products.length !==
      productIds.length
    ) {
      throw new Error(
        "One or more selected products could not be found.",
      );
    }

    const productMap =
      new Map(
        products.map(
          (product) => [
            product.id,
            product,
          ],
        ),
      );

    /*
     * ---------------------------------------------------------
     * PRODUCT ECONOMICS
     * ---------------------------------------------------------
     *
     * Calculate the current V2 pre-shipping cost for every
     * selected product inside the same transaction that creates
     * the order.
     *
     * The resulting value is then stored permanently on the
     * OrderItem as costPriceSnapshot.
     */

    const productCostMap =
      new Map<
        string,
        Prisma.Decimal
      >();

    for (const item of input.items) {
      const product =
        productMap.get(
          item.productId,
        );

      if (!product) {
        throw new Error(
          "Selected product not found.",
        );
      }

      if (
        product.status !==
        "ACTIVE"
      ) {
        throw new Error(
          `${product.name} is not active and cannot be added to an order.`,
        );
      }

      const unitCost =
        await getProductUnitCost(
          tx,
          businessId,
          product.id,
        );

      productCostMap.set(
        product.id,
        unitCost,
      );
    }

    /*
     * ---------------------------------------------------------
     * ORDER TOTALS
     * ---------------------------------------------------------
     */

    const totals =
      calculateOrderTotals(
        input.items,
        input.discountAmount,
        input.shippingCharged,
      );

    /*
     * ---------------------------------------------------------
     * ORDER NUMBER
     * ---------------------------------------------------------
     *
     * Increment the order number atomically.
     */

    const settings =
      await tx.businessSettings.update(
        {
          where: {
            businessId,
          },
          data: {
            nextOrderNumber: {
              increment: 1,
            },
          },
          select: {
            orderPrefix: true,
            nextOrderNumber: true,
          },
        },
      );

    const orderSequence =
      settings.nextOrderNumber -
      1;

    const orderNumber =
      `${settings.orderPrefix}${orderSequence}`;

    /*
     * ---------------------------------------------------------
     * CREATE ORDER
     * ---------------------------------------------------------
     */

    const order =
      await tx.order.create({
        data: {
          businessId,
          customerId:
            customer.id,
          orderNumber,
          orderDate:
            input.orderDate,
          paymentStatus:
            input.paymentStatus,
          fulfillmentStatus:
            input.fulfillmentStatus,

          subtotal:
            new Prisma.Decimal(
              totals.subtotal,
            ),

          discountAmount:
            new Prisma.Decimal(
              totals.discountAmount,
            ),

          shippingCharged:
            new Prisma.Decimal(
              totals.shippingCharged,
            ),

          totalAmount:
            new Prisma.Decimal(
              totals.totalAmount,
            ),

          channel:
            input.channel,
          paymentMethod:
            input.paymentMethod ??
            null,
          notes:
            input.notes ?? null,
        },
      });

    /*
     * ---------------------------------------------------------
     * ORDER ITEMS + INVENTORY
     * ---------------------------------------------------------
     *
     * Everything remains inside the same transaction.
     *
     * If inventory deduction fails, the entire order creation
     * rolls back.
     */

    for (const item of input.items) {
      const product =
        productMap.get(
          item.productId,
        );

      if (!product) {
        throw new Error(
          "Selected product not found.",
        );
      }

      const costPriceSnapshot =
        productCostMap.get(
          product.id,
        );

      if (!costPriceSnapshot) {
        throw new Error(
          `Unable to calculate the unit cost for ${product.name}.`,
        );
      }

      await tx.orderItem.create({
        data: {
          businessId,
          orderId: order.id,
          productId:
            product.id,
          quantity:
            item.quantity,
          unitPrice:
            new Prisma.Decimal(
              item.unitPrice,
            ),

          /*
           * Historical snapshot.
           *
           * Future raw-material or packaging price changes
           * must NOT change this value.
           */
          costPriceSnapshot,
        },
      });

      await deductStockForOrder(
        tx,
        businessId,
        product.id,
        item.quantity,
        orderNumber,
      );
    }

    /*
     * ---------------------------------------------------------
     * CUSTOMER PAYMENT
     * ---------------------------------------------------------
     *
     * Only a PAID order represents money actually received.
     *
     * PENDING → no cash inflow.
     * PAID    → customer-payment cash inflow.
     *
     * REFUNDED is not accepted as an initial cash state because
     * no payment has been received through this order workflow.
     */

    if (
      input.paymentStatus ===
      "PAID"
    ) {
      await createCustomerPaymentCashTransaction(
        tx,
        {
          businessId,
          orderId: order.id,
          orderNumber:
            order.orderNumber,
          orderDate:
            order.orderDate,
          totalAmount:
            order.totalAmount,
          paymentMethod:
            order.paymentMethod,
        },
      );
    }

    if (
      input.paymentStatus ===
      "REFUNDED"
    ) {
      throw new Error(
        "An order cannot be created directly as REFUNDED.",
      );
    }

    /*
     * ---------------------------------------------------------
     * RETURN CREATED ORDER
     * ---------------------------------------------------------
     */

    const createdOrder =
      await tx.order.findUniqueOrThrow(
        {
          where: {
            id: order.id,
          },
          include: {
            customer: {
              select: {
                name: true,
              },
            },
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    sku: true,
                  },
                },
              },
            },
          },
        },
      );

    return serializeOrder(
      createdOrder,
    );
  });
}

export async function updateOrder(
  businessId: string,
  input: UpdateOrderInput,
): Promise<SerializedOrder> {
  return db.$transaction(
    async (tx) => {
      const existingOrder =
        await tx.order.findFirst({
          where: {
            id: input.id,
            businessId,
          },
          select: {
            id: true,
            orderNumber: true,
            orderDate: true,
            paymentStatus: true,
            fulfillmentStatus: true,
            totalAmount: true,
            paymentMethod: true,
          },
        });

      if (!existingOrder) {
        throw new Error(
          "Order not found.",
        );
      }

      /*
       * Cancellation requires a dedicated workflow because
       * inventory was deducted when the order was created.
       *
       * Phase 3C will implement the dedicated cancellation
       * and inventory-restoration workflow.
       */
      if (
        input.fulfillmentStatus ===
        "CANCELLED"
      ) {
        throw new Error(
          "Order cancellation requires the dedicated cancellation workflow.",
        );
      }

      const previousPaymentStatus =
        existingOrder.paymentStatus;

      const nextPaymentStatus =
        input.paymentStatus ??
        previousPaymentStatus;

      /*
       * ---------------------------------------------------------
       * PAYMENT STATE VALIDATION
       * ---------------------------------------------------------
       */

      if (
        previousPaymentStatus ===
          "REFUNDED" &&
        nextPaymentStatus !==
          "REFUNDED"
      ) {
        throw new Error(
          "A refunded order cannot be moved back to another payment status.",
        );
      }

      if (
        previousPaymentStatus ===
          "PENDING" &&
        nextPaymentStatus ===
          "REFUNDED"
      ) {
        throw new Error(
          "A pending order cannot be refunded because no payment has been recorded.",
        );
      }

      const data: Prisma.OrderUpdateInput =
        {};

      if (
        input.paymentStatus !==
        undefined
      ) {
        data.paymentStatus =
          input.paymentStatus;
      }

      if (
        input.fulfillmentStatus !==
        undefined
      ) {
        data.fulfillmentStatus =
          input.fulfillmentStatus;
      }

      if (
        input.paymentMethod !==
        undefined
      ) {
        data.paymentMethod =
          input.paymentMethod;
      }

      if (input.notes !== undefined) {
        data.notes =
          input.notes;
      }

      const updatedOrder =
        await tx.order.update({
          where: {
            id: existingOrder.id,
          },
          data,
          include: {
            customer: {
              select: {
                name: true,
              },
            },
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    sku: true,
                  },
                },
              },
            },
          },
        });

      /*
       * ---------------------------------------------------------
       * PAYMENT → PAID
       * ---------------------------------------------------------
       *
       * PENDING → PAID creates the customer-payment inflow.
       */
      if (
        previousPaymentStatus !==
          "PAID" &&
        nextPaymentStatus ===
          "PAID"
      ) {
        const existingPayment =
          await tx.cashTransaction.findFirst(
            {
              where: {
                businessId,
                sourceType:
                  "ORDER",
                sourceId:
                  existingOrder.id,
                category:
                  "CUSTOMER_PAYMENT",
              },
            },
          );

        if (!existingPayment) {
          await createCustomerPaymentCashTransaction(
            tx,
            {
              businessId,
              orderId:
                updatedOrder.id,
              orderNumber:
                updatedOrder.orderNumber,
              orderDate:
                updatedOrder.orderDate,
              totalAmount:
                updatedOrder.totalAmount,
              paymentMethod:
                updatedOrder.paymentMethod,
            },
          );
        } else {
          /*
           * This is defensive protection against duplicate
           * customer-payment entries.
           */
          await tx.cashTransaction.update({
            where: {
              id: existingPayment.id,
            },
            data: {
              transactionDate:
                updatedOrder.orderDate,
              amount:
                updatedOrder.totalAmount,
              paymentMethod:
                updatedOrder.paymentMethod,
              description:
                `Customer payment — ${updatedOrder.orderNumber}`,
            },
          });
        }
      }

      /*
       * ---------------------------------------------------------
       * PAID → PAID
       * ---------------------------------------------------------
       *
       * If the payment method is edited while the order is
       * already paid, keep the linked cash transaction aligned.
       *
       * The cash amount remains the same because order totals
       * cannot currently be edited by updateOrder.
       */
      if (
        previousPaymentStatus ===
          "PAID" &&
        nextPaymentStatus ===
          "PAID"
      ) {
        const existingPayment =
          await tx.cashTransaction.findFirst(
            {
              where: {
                businessId,
                sourceType:
                  "ORDER",
                sourceId:
                  existingOrder.id,
                category:
                  "CUSTOMER_PAYMENT",
              },
            },
          );

        if (existingPayment) {
          await tx.cashTransaction.update({
            where: {
              id: existingPayment.id,
            },
            data: {
              transactionDate:
                updatedOrder.orderDate,
              amount:
                updatedOrder.totalAmount,
              paymentMethod:
                updatedOrder.paymentMethod,
              description:
                `Customer payment — ${updatedOrder.orderNumber}`,
            },
          });
        }
      }

      /*
       * ---------------------------------------------------------
       * PAID → REFUNDED
       * ---------------------------------------------------------
       *
       * Keep the original customer payment as historical cash
       * movement and create a separate refund outflow.
       */
      if (
        previousPaymentStatus ===
          "PAID" &&
        nextPaymentStatus ===
          "REFUNDED"
      ) {
        const existingRefund =
          await tx.cashTransaction.findFirst(
            {
              where: {
                businessId,
                sourceType:
                  "ORDER_REFUND",
                sourceId:
                  existingOrder.id,
                category:
                  "CUSTOMER_REFUND",
              },
            },
          );

        if (!existingRefund) {
          await createCustomerRefundCashTransaction(
            tx,
            {
              businessId,
              orderId:
                updatedOrder.id,
              orderNumber:
                updatedOrder.orderNumber,
              orderDate:
                updatedOrder.orderDate,
              totalAmount:
                updatedOrder.totalAmount,
              paymentMethod:
                updatedOrder.paymentMethod,
            },
          );
        }
      }

      return serializeOrder(
        updatedOrder,
      );
    },
  );
}