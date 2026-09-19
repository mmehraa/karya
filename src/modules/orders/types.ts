import type {
  OrderFulfillmentStatus,
  OrderPaymentStatus,
} from "@prisma/client";

export interface SerializedOrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  costPriceSnapshot: number;
  lineSubtotal: number;
}

export interface SerializedOrder {
  id: string;
  businessId: string;
  customerId: string | null;
  customerName: string | null;
  orderNumber: string;
  orderDate: Date;

  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus: OrderFulfillmentStatus;

  subtotal: number;
  discountAmount: number;
  shippingCharged: number;
  totalAmount: number;

  channel: string;
  paymentMethod: string | null;
  notes: string | null;

  items: SerializedOrderItem[];

  createdAt: Date;
  updatedAt: Date;
}

export interface OrderListItem {
  id: string;
  orderNumber: string;
  orderDate: Date;
  customerName: string | null;
  itemCount: number;
  totalAmount: number;
  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
  channel: string;
}