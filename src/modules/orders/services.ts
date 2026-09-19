import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { deductStockForOrder } from "@/modules/inventory/services";
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
  }
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
  businessId: string
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
  orderId: string
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
  shippingCharged: number
) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  if (discountAmount > subtotal) {
    throw new Error(
      "Discount cannot be greater than the order subtotal."
    );
  }

  const totalAmount =
    subtotal - discountAmount + shippingCharged;

  return {
    subtotal,
    discountAmount,
    shippingCharged,
    totalAmount,
  };
}

function getProductUnitCost(product: {
  cogs: Prisma.Decimal | null;
  packagingCost: Prisma.Decimal | null;
  variableCost: Prisma.Decimal | null;
}) {
  if (
    product.cogs === null ||
    product.packagingCost === null ||
    product.variableCost === null
  ) {
    throw new Error(
      "One or more selected products do not have complete unit economics. Complete COGS, packaging cost, and variable cost before recording the order."
    );
  }

  return new Prisma.Decimal(product.cogs)
    .add(product.packagingCost)
    .add(product.variableCost);
}

export async function createOrder(
  businessId: string,
  input: CreateOrderInput
): Promise<SerializedOrder> {
  return db.$transaction(async (tx) => {
    // Verify that the customer belongs to this business.
    const customer = await tx.customer.findFirst({
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
      throw new Error("Customer not found.");
    }

    // Load all selected products within the active business.
    const productIds = input.items.map((item) => item.productId);

    const products = await tx.product.findMany({
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
        cogs: true,
        packagingCost: true,
        variableCost: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new Error(
        "One or more selected products could not be found."
      );
    }

    const productMap = new Map(
      products.map((product) => [product.id, product])
    );

    // Validate product state and unit economics before creating anything.
    for (const item of input.items) {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new Error("Selected product not found.");
      }

      if (product.status !== "ACTIVE") {
        throw new Error(
          `${product.name} is not active and cannot be added to an order.`
        );
      }

      getProductUnitCost(product);
    }

    const totals = calculateOrderTotals(
      input.items,
      input.discountAmount,
      input.shippingCharged
    );

    /*
     * Increment the order number atomically.
     *
     * The returned value is the new counter value,
     * so the order being created uses newValue - 1.
     */
    const settings = await tx.businessSettings.update({
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
    });

    const orderSequence = settings.nextOrderNumber - 1;
    const orderNumber = `${settings.orderPrefix}${orderSequence}`;

    const order = await tx.order.create({
      data: {
        businessId,
        customerId: customer.id,
        orderNumber,
        orderDate: input.orderDate,
        paymentStatus: input.paymentStatus,
        fulfillmentStatus: input.fulfillmentStatus,
        subtotal: new Prisma.Decimal(totals.subtotal),
        discountAmount: new Prisma.Decimal(
          totals.discountAmount
        ),
        shippingCharged: new Prisma.Decimal(
          totals.shippingCharged
        ),
        totalAmount: new Prisma.Decimal(totals.totalAmount),
        channel: input.channel,
        paymentMethod: input.paymentMethod ?? null,
        notes: input.notes ?? null,
      },
    });

    /*
     * Create order items and deduct inventory inside the same
     * database transaction.
     *
     * If any inventory deduction fails, the entire order creation
     * transaction rolls back.
     */
    for (const item of input.items) {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new Error("Selected product not found.");
      }

      const costPriceSnapshot = getProductUnitCost(product);

      await tx.orderItem.create({
        data: {
          businessId,
          orderId: order.id,
          productId: product.id,
          quantity: item.quantity,
          unitPrice: new Prisma.Decimal(item.unitPrice),
          costPriceSnapshot,
        },
      });

      await deductStockForOrder(
        tx,
        businessId,
        product.id,
        item.quantity,
        orderNumber
      );
    }

    const createdOrder = await tx.order.findUniqueOrThrow({
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
    });

    return serializeOrder(createdOrder);
  });
}

export async function updateOrder(
  businessId: string,
  input: UpdateOrderInput
): Promise<SerializedOrder> {
  const existingOrder = await db.order.findFirst({
    where: {
      id: input.id,
      businessId,
    },
    select: {
      id: true,
    },
  });

  if (!existingOrder) {
    throw new Error("Order not found.");
  }

  /*
   * Cancellation requires a dedicated workflow because inventory
   * was deducted when the order was created. A cancellation must
   * return the appropriate stock exactly once.
   */
  if (input.fulfillmentStatus === "CANCELLED") {
    throw new Error(
      "Order cancellation requires the dedicated cancellation workflow."
    );
  }

  const data: Prisma.OrderUpdateInput = {};

  if (input.paymentStatus !== undefined) {
    data.paymentStatus = input.paymentStatus;
  }

  if (input.fulfillmentStatus !== undefined) {
    data.fulfillmentStatus = input.fulfillmentStatus;
  }

  if (input.paymentMethod !== undefined) {
    data.paymentMethod = input.paymentMethod;
  }

  if (input.notes !== undefined) {
    data.notes = input.notes;
  }

  const updatedOrder = await db.order.update({
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

  return serializeOrder(updatedOrder);
}