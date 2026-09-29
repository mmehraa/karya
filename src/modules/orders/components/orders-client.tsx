"use client";

import {
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  Download,
  Loader2,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { ProductStatus } from "@prisma/client";

import {
  createOrderAction,
  updateOrderAction,
} from "@/modules/orders/actions";
import type { OrderListItem } from "@/modules/orders/types";
import type { SerializedCustomer } from "@/modules/customers/types";
import type { SerializedProduct } from "@/modules/products/types";

interface OrdersClientProps {
  orders: OrderListItem[];
  customers: SerializedCustomer[];
  products: SerializedProduct[];
}

interface OrderItemDraft {
  productId: string;
  quantity: string;
  unitPrice: string;
}

interface OrderFormState {
  customerId: string;
  orderDate: string;
  paymentStatus: "PENDING" | "PAID" | "REFUNDED";
  fulfillmentStatus:
    | "PENDING"
    | "PROCESSING"
    | "PACKED"
    | "SHIPPED"
    | "DELIVERED";
  discountAmount: string;
  shippingCharged: string;
  channel: string;
  paymentMethod: string;
  notes: string;
  items: OrderItemDraft[];
}

type OrderTab =
  | "ALL"
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "CANCELLED";

const EMPTY_ITEM: OrderItemDraft = {
  productId: "",
  quantity: "1",
  unitPrice: "",
};

function getLocalDateValue() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDefaultFormState(): OrderFormState {
  return {
    customerId: "",
    orderDate: getLocalDateValue(),
    paymentStatus: "PENDING",
    fulfillmentStatus: "PENDING",
    discountAmount: "0",
    shippingCharged: "0",
    channel: "Direct",
    paymentMethod: "",
    notes: "",
    items: [{ ...EMPTY_ITEM }],
  };
}

function formatCurrency(value: number) {
  return `₹${value.toFixed(2)}`;
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getTabOrders(
  orders: OrderListItem[],
  tab: OrderTab,
) {
  switch (tab) {
    case "PENDING":
      return orders.filter(
        (order) =>
          order.paymentStatus === "PENDING" ||
          order.fulfillmentStatus === "PENDING",
      );

    case "PROCESSING":
      return orders.filter(
        (order) =>
          order.fulfillmentStatus === "PROCESSING" ||
          order.fulfillmentStatus === "PACKED" ||
          order.fulfillmentStatus === "SHIPPED",
      );

    case "COMPLETED":
      return orders.filter(
        (order) => order.fulfillmentStatus === "DELIVERED",
      );

    case "CANCELLED":
      return orders.filter(
        (order) => order.fulfillmentStatus === "CANCELLED",
      );

    case "ALL":
    default:
      return orders;
  }
}

export function OrdersClient({
  orders,
  customers,
  products,
}: OrdersClientProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<OrderTab>("ALL");
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderListItem | null>(
    null,
  );
  const [editPaymentStatus, setEditPaymentStatus] =
    useState<"PENDING" | "PAID" | "REFUNDED">("PENDING");
  const [editFulfillmentStatus, setEditFulfillmentStatus] =
    useState<
      "PENDING" | "PROCESSING" | "PACKED" | "SHIPPED" | "DELIVERED"
    >("PENDING");
  const [editError, setEditError] = useState<string | null>(null);
  const [formData, setFormData] = useState<OrderFormState>(
    getDefaultFormState(),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeProducts = useMemo(
    () =>
      products.filter(
        (product) => product.status === ProductStatus.ACTIVE,
      ),
    [products],
  );

  const visibleOrders = useMemo(
    () => getTabOrders(orders, activeTab),
    [orders, activeTab],
  );

  const subtotal = useMemo(() => {
    return formData.items.reduce((total, item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);

      if (
        !Number.isFinite(quantity) ||
        !Number.isFinite(unitPrice) ||
        quantity <= 0 ||
        unitPrice < 0
      ) {
        return total;
      }

      return total + quantity * unitPrice;
    }, 0);
  }, [formData.items]);

  const discount = Number(formData.discountAmount) || 0;
  const shipping = Number(formData.shippingCharged) || 0;
  const total = Math.max(0, subtotal - discount + shipping);

  const hasStockIssue = useMemo(() => {
    return formData.items.some((item) => {
      if (!item.productId) {
        return false;
      }

      const product = activeProducts.find(
        (candidate) => candidate.id === item.productId,
      );

      if (!product) {
        return false;
      }

      const quantity = Number(item.quantity);

      return (
        Number.isInteger(quantity) &&
        quantity >= 1 &&
        quantity > product.currentStock
      );
    });
  }, [formData.items, activeProducts]);

  function openNewOrder() {
    setFormData(getDefaultFormState());
    setError(null);
    setIsNewOrderOpen(true);
  }

  function closeNewOrder() {
    if (isPending) {
      return;
    }

    setIsNewOrderOpen(false);
    setError(null);
  }

  function updateFormField<K extends keyof OrderFormState>(
    field: K,
    value: OrderFormState[K],
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateItem(
    index: number,
    field: keyof OrderItemDraft,
    value: string,
  ) {
    setFormData((current) => {
      const items = [...current.items];

      items[index] = {
        ...items[index],
        [field]: value,
      };

      return {
        ...current,
        items,
      };
    });
  }

  function handleProductChange(
    index: number,
    productId: string,
  ) {
    const product = activeProducts.find(
      (item) => item.id === productId,
    );

    setFormData((current) => {
      const items = [...current.items];

      items[index] = {
        ...items[index],
        productId,
        unitPrice:
          product?.sellingPrice !== null &&
          product?.sellingPrice !== undefined
            ? product.sellingPrice.toFixed(2)
            : "",
      };

      return {
        ...current,
        items,
      };
    });
  }

  function addItem() {
    setFormData((current) => ({
      ...current,
      items: [...current.items, { ...EMPTY_ITEM }],
    }));
  }

  function removeItem(index: number) {
    setFormData((current) => {
      if (current.items.length === 1) {
        return current;
      }

      return {
        ...current,
        items: current.items.filter(
          (_, itemIndex) => itemIndex !== index,
        ),
      };
    });
  }


  function openEditOrder(order: OrderListItem) {
    setEditingOrder(order);
    setEditPaymentStatus(order.paymentStatus);
    setEditFulfillmentStatus(
      order.fulfillmentStatus === "CANCELLED"
        ? "PENDING"
        : order.fulfillmentStatus,
    );
    setEditError(null);
  }

  function closeEditOrder() {
    if (isPending) {
      return;
    }

    setEditingOrder(null);
    setEditError(null);
  }

  function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingOrder) {
      return;
    }

    setEditError(null);

    startTransition(async () => {
      const result = await updateOrderAction({
        id: editingOrder.id,
        paymentStatus: editPaymentStatus,
        fulfillmentStatus: editFulfillmentStatus,
      });

      if (!result.success) {
        setEditError(
          result.error ?? "Unable to update the order.",
        );
        return;
      }

      setEditingOrder(null);
      setEditError(null);
      router.refresh();
    });
  }

  function exportOrders() {
    if (orders.length === 0) {
      return;
    }

    const headers = [
      "Order",
      "Customer",
      "Date",
      "Items",
      "Total",
      "Payment",
      "Fulfillment",
    ];

    const rows = orders.map((order) => [
      order.orderNumber,
      order.customerName,
      new Intl.DateTimeFormat("en-IN").format(
        order.orderDate,
      ),
      order.itemCount,
      order.totalAmount.toFixed(2),
      formatStatus(order.paymentStatus),
      formatStatus(order.fulfillmentStatus),
    ]);

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) => {
            const text = String(value).replace(/"/g, '""');
            return `"${text}"`;
          })
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "orders.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError(null);

    if (customers.length === 0) {
      setError(
        "You need to add at least one customer before recording an order.",
      );
      return;
    }

    if (!formData.customerId) {
      setError("Please select a customer.");
      return;
    }

    if (!formData.orderDate) {
      setError("Please select an order date.");
      return;
    }

    if (formData.items.length === 0) {
      setError(
        "An order must contain at least one product.",
      );
      return;
    }

    const productIds = new Set<string>();

    for (const item of formData.items) {
      if (!item.productId) {
        setError(
          "Please select a product for every order line.",
        );
        return;
      }

      if (productIds.has(item.productId)) {
        setError(
          "The same product cannot be added twice. Adjust its quantity instead.",
        );
        return;
      }

      productIds.add(item.productId);

      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);

      if (
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        setError(
          "Each product quantity must be a whole number of at least 1.",
        );
        return;
      }

      if (
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
      ) {
        setError(
          "Each unit price must be a valid non-negative amount.",
        );
        return;
      }

      const product = activeProducts.find(
        (candidate) => candidate.id === item.productId,
      );

      if (!product) {
        setError(
          "One of the selected products is no longer active.",
        );
        return;
      }

      if (product.sellingPrice === null) {
        setError(
          `${product.name} does not have a selling price recorded.`,
        );
        return;
      }

      if (quantity > product.currentStock) {
        setError(
          `${product.name} has only ${product.currentStock} unit${
            product.currentStock === 1 ? "" : "s"
          } in recorded stock.`,
        );
        return;
      }
    }

    const discountAmount = Number(
      formData.discountAmount,
    );
    const shippingCharged = Number(
      formData.shippingCharged,
    );

    if (
      !Number.isFinite(discountAmount) ||
      discountAmount < 0
    ) {
      setError(
        "Discount must be a valid non-negative amount.",
      );
      return;
    }

    if (
      !Number.isFinite(shippingCharged) ||
      shippingCharged < 0
    ) {
      setError(
        "Shipping charged must be a valid non-negative amount.",
      );
      return;
    }

    if (discountAmount > subtotal) {
      setError(
        "Discount cannot be greater than the order subtotal.",
      );
      return;
    }

    startTransition(async () => {
      const result = await createOrderAction({
        customerId: formData.customerId,
        orderDate: new Date(
          `${formData.orderDate}T12:00:00`,
        ),
        paymentStatus: formData.paymentStatus,
        fulfillmentStatus: formData.fulfillmentStatus,
        discountAmount,
        shippingCharged,
        channel: formData.channel,
        paymentMethod:
          formData.paymentMethod.trim() || null,
        notes: formData.notes.trim() || null,
        items: formData.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      });

      if (!result.success) {
        setError(
          result.error ?? "Unable to create the order.",
        );
        return;
      }

      setIsNewOrderOpen(false);
      setFormData(getDefaultFormState());
      setError(null);

      router.refresh();
    });
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm">
        {/* Header */}
        <div className="border-b border-border px-5 pb-4 pt-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[22px] font-semibold tracking-[-0.04em] text-text-primary">
                Orders
              </h1>

              <p className="mt-1 text-xs text-text-secondary">
                Manage and track your customer orders.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportOrders}
                disabled={orders.length === 0}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 text-[11px] font-medium text-text-secondary transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>

              <button
                type="button"
                onClick={openNewOrder}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0f3d35] px-3.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#0b302a]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Order
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border px-5 sm:px-6">
          <div className="flex items-center gap-1 overflow-x-auto">
            <OrderTabButton
              label="All Orders"
              count={orders.length}
              active={activeTab === "ALL"}
              onClick={() => setActiveTab("ALL")}
            />

            <OrderTabButton
              label="Pending"
              count={
                getTabOrders(orders, "PENDING").length
              }
              active={activeTab === "PENDING"}
              onClick={() => setActiveTab("PENDING")}
            />

            <OrderTabButton
              label="Processing"
              count={
                getTabOrders(orders, "PROCESSING").length
              }
              active={activeTab === "PROCESSING"}
              onClick={() => setActiveTab("PROCESSING")}
            />

            <OrderTabButton
              label="Completed"
              count={
                getTabOrders(orders, "COMPLETED").length
              }
              active={activeTab === "COMPLETED"}
              onClick={() => setActiveTab("COMPLETED")}
            />

            <OrderTabButton
              label="Cancelled"
              count={
                getTabOrders(orders, "CANCELLED").length
              }
              active={activeTab === "CANCELLED"}
              onClick={() => setActiveTab("CANCELLED")}
            />
          </div>
        </div>

        {/* Content */}
        {visibleOrders.length === 0 ? (
          <EmptyOrdersState
            hasAnyOrders={orders.length > 0}
            onAddOrder={openNewOrder}
          />
        ) : (
          <OrdersTable orders={visibleOrders} onEditOrder={openEditOrder} />
        )}
      </section>


      {/* Edit Order Modal */}
      {editingOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEditOrder();
            }
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  Order Management
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-text-primary">
                  Edit {editingOrder.orderNumber}
                </h2>
                <p className="mt-1 text-xs text-text-secondary">
                  Update payment and fulfillment status for this order.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditOrder}
                disabled={isPending}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-muted transition hover:bg-surface-muted hover:text-text-secondary disabled:opacity-40"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-6 px-6 py-6">
              <div className="rounded-xl border border-border bg-surface-muted p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                      Order
                    </p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">
                      {editingOrder.orderNumber}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {editingOrder.customerName} -{" "}
                      {formatCurrency(editingOrder.totalAmount)}
                    </p>
                  </div>

                  <StatusBadge
                    label={formatStatus(editingOrder.paymentStatus)}
                    tone={
                      editingOrder.paymentStatus === "PAID"
                        ? "success"
                        : editingOrder.paymentStatus === "REFUNDED"
                          ? "danger"
                          : "neutral"
                    }
                  />
                </div>
              </div>

              {editError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Payment Status">
                  <select
                    value={editPaymentStatus}
                    onChange={(event) =>
                      setEditPaymentStatus(
                        event.target.value as typeof editPaymentStatus,
                      )
                    }
                    disabled={isPending}
                    className={inputClass}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="PAID">Paid</option>
                    <option value="REFUNDED">Refunded</option>
                  </select>
                </FormField>

                <FormField label="Fulfillment Status">
                  <select
                    value={editFulfillmentStatus}
                    onChange={(event) =>
                      setEditFulfillmentStatus(
                        event.target.value as typeof editFulfillmentStatus,
                      )
                    }
                    disabled={isPending}
                    className={inputClass}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="PACKED">Packed</option>
                    <option value="SHIPPED">Shipped</option>
                    <option value="DELIVERED">Delivered</option>
                  </select>
                </FormField>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold text-amber-900">
                  Cash flow is updated automatically
                </p>
                <p className="mt-1 text-[11px] leading-5 text-amber-800">
                  Moving an order from Pending to Paid records the customer
                  payment as cash inflow. Refunding a paid order records a
                  separate customer refund as cash outflow.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
                <button
                  type="button"
                  onClick={closeEditOrder}
                  disabled={isPending}
                  className="rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted disabled:opacity-40"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0f3d35] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#0b302a] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isPending && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {isNewOrderOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeNewOrder();
            }
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-text-primary">
                  Add Order
                </h2>

                <p className="mt-1 text-xs text-text-secondary">
                  Record a customer sale using your active
                  product catalog.
                </p>
              </div>

              <button
                type="button"
                onClick={closeNewOrder}
                disabled={isPending}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-muted transition hover:bg-surface-muted hover:text-text-secondary disabled:opacity-40"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="overflow-y-auto px-6 py-6"
            >
              {customers.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                    <div>
                      <h3 className="text-sm font-semibold text-amber-900">
                        Add a customer first
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-amber-800">
                        Orders must be associated with a
                        real customer record.
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          closeNewOrder();
                          router.push("/customers");
                        }}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-surface-raised px-3 py-2 text-xs font-semibold text-amber-900 shadow-sm ring-1 ring-amber-200 hover:bg-amber-50"
                      >
                        <UserPlus className="h-4 w-4" />
                        Go to Customers
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-7">
                  {/* Order Details */}
                  <section>
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-text-primary">
                        Order Details
                      </h3>

                      <p className="mt-1 text-xs text-text-secondary">
                        Basic information about this sale.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField label="Customer">
                        <select
                          value={formData.customerId}
                          onChange={(event) =>
                            updateFormField(
                              "customerId",
                              event.target.value,
                            )
                          }
                          disabled={isPending}
                          className={inputClass}
                        >
                          <option value="">
                            Select customer
                          </option>

                          {customers.map((customer) => (
                            <option
                              key={customer.id}
                              value={customer.id}
                            >
                              {customer.name}
                              {customer.phone
                                ? ` — ${customer.phone}`
                                : ""}
                            </option>
                          ))}
                        </select>
                      </FormField>

                      <FormField label="Order Date">
                        <div className="relative">
                          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />

                          <input
                            type="date"
                            value={formData.orderDate}
                            onChange={(event) =>
                              updateFormField(
                                "orderDate",
                                event.target.value,
                              )
                            }
                            disabled={isPending}
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </FormField>

                      <FormField label="Sales Channel">
                        <input
                          type="text"
                          value={formData.channel}
                          onChange={(event) =>
                            updateFormField(
                              "channel",
                              event.target.value,
                            )
                          }
                          placeholder="Direct"
                          disabled={isPending}
                          className={inputClass}
                        />
                      </FormField>

                      <FormField label="Payment Method">
                        <input
                          type="text"
                          value={formData.paymentMethod}
                          onChange={(event) =>
                            updateFormField(
                              "paymentMethod",
                              event.target.value,
                            )
                          }
                          placeholder="UPI, Cash, Bank Transfer..."
                          disabled={isPending}
                          className={inputClass}
                        />
                      </FormField>
                    </div>
                  </section>

                  {/* Products */}
                  <section>
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-text-primary">
                          Products
                        </h3>

                        <p className="mt-1 text-xs text-text-secondary">
                          Add active products included in this
                          order.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={addItem}
                        disabled={
                          isPending ||
                          activeProducts.length === 0
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-muted disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Product
                      </button>
                    </div>

                    {activeProducts.length === 0 ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                        <p className="text-sm font-semibold text-amber-900">
                          No active products available
                        </p>

                        <p className="mt-1 text-xs text-amber-800">
                          An order can only contain active
                          products with a recorded selling
                          price.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {formData.items.map(
                          (item, index) => {
                            const selectedProduct =
                              activeProducts.find(
                                (product) =>
                                  product.id ===
                                  item.productId,
                              );

                            const lineTotal =
                              (Number(item.quantity) || 0) *
                              (Number(item.unitPrice) || 0);

                            return (
                              <div
                                key={index}
                                className="rounded-xl border border-border bg-surface-muted/50 p-4"
                              >
                                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_100px_130px_120px_40px] md:items-end">
                                  <FormField label="Product">
                                    <select
                                      value={
                                        item.productId
                                      }
                                      onChange={(event) =>
                                        handleProductChange(
                                          index,
                                          event.target
                                            .value,
                                        )
                                      }
                                      disabled={isPending}
                                      className={inputClass}
                                    >
                                      <option value="">
                                        Select product
                                      </option>

                                      {activeProducts.map(
                                        (product) => (
                                          <option
                                            key={
                                              product.id
                                            }
                                            value={
                                              product.id
                                            }
                                          >
                                            {product.name}{" "}
                                            ({product.sku})
                                          </option>
                                        ),
                                      )}
                                    </select>

                                    {selectedProduct && (
                                      <p className="mt-1.5 text-[10px] text-text-muted">
                                        Stock:{" "}
                                        {
                                          selectedProduct.currentStock
                                        }{" "}
                                        · Price:{" "}
                                        {selectedProduct.sellingPrice !==
                                        null
                                          ? formatCurrency(
                                              selectedProduct.sellingPrice,
                                            )
                                          : "Not recorded"}
                                      </p>
                                    )}
                                  </FormField>

                                  <FormField label="Quantity">
                                    <input
                                      type="number"
                                      min="1"
                                      step="1"
                                      value={
                                        item.quantity
                                      }
                                      onChange={(event) =>
                                        updateItem(
                                          index,
                                          "quantity",
                                          event.target
                                            .value,
                                        )
                                      }
                                      disabled={isPending}
                                      className={inputClass}
                                    />
                                  </FormField>

                                  <FormField label="Unit Price">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={
                                        item.unitPrice
                                      }
                                      onChange={(event) =>
                                        updateItem(
                                          index,
                                          "unitPrice",
                                          event.target
                                            .value,
                                        )
                                      }
                                      disabled={isPending}
                                      className={inputClass}
                                    />
                                  </FormField>

                                  <FormField label="Line Total">
                                    <div className="flex h-10 items-center rounded-lg border border-border bg-surface-raised px-3 text-sm font-semibold text-text-primary">
                                      {formatCurrency(
                                        lineTotal,
                                      )}
                                    </div>
                                  </FormField>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeItem(index)
                                    }
                                    disabled={
                                      isPending ||
                                      formData.items
                                        .length === 1
                                    }
                                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-raised text-text-muted hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                                    aria-label="Remove product"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    )}
                  </section>

                  {/* Additional Details */}
                  <section className="grid gap-6 md:grid-cols-[1fr_300px]">
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">
                        Additional Details
                      </h3>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <FormField label="Payment Status">
                          <select
                            value={
                              formData.paymentStatus
                            }
                            onChange={(event) =>
                              updateFormField(
                                "paymentStatus",
                                event.target
                                  .value as OrderFormState["paymentStatus"],
                              )
                            }
                            disabled={isPending}
                            className={inputClass}
                          >
                            <option value="PENDING">
                              Pending
                            </option>
                            <option value="PAID">
                              Paid
                            </option>
                            <option value="REFUNDED">
                              Refunded
                            </option>
                          </select>
                        </FormField>

                        <FormField label="Fulfillment Status">
                          <select
                            value={
                              formData.fulfillmentStatus
                            }
                            onChange={(event) =>
                              updateFormField(
                                "fulfillmentStatus",
                                event.target
                                  .value as OrderFormState["fulfillmentStatus"],
                              )
                            }
                            disabled={isPending}
                            className={inputClass}
                          >
                            <option value="PENDING">
                              Pending
                            </option>
                            <option value="PROCESSING">
                              Processing
                            </option>
                            <option value="PACKED">
                              Packed
                            </option>
                            <option value="SHIPPED">
                              Shipped
                            </option>
                            <option value="DELIVERED">
                              Delivered
                            </option>
                          </select>
                        </FormField>

                        <FormField label="Discount">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              formData.discountAmount
                            }
                            onChange={(event) =>
                              updateFormField(
                                "discountAmount",
                                event.target.value,
                              )
                            }
                            disabled={isPending}
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Shipping Charged">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              formData.shippingCharged
                            }
                            onChange={(event) =>
                              updateFormField(
                                "shippingCharged",
                                event.target.value,
                              )
                            }
                            disabled={isPending}
                            className={inputClass}
                          />
                        </FormField>

                        <div className="sm:col-span-2">
                          <FormField label="Notes">
                            <textarea
                              value={formData.notes}
                              onChange={(event) =>
                                updateFormField(
                                  "notes",
                                  event.target.value,
                                )
                              }
                              rows={3}
                              placeholder="Optional order notes..."
                              disabled={isPending}
                              className={`${inputClass} resize-none`}
                            />
                          </FormField>
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="rounded-xl border border-border bg-surface-muted p-5">
                      <h3 className="text-sm font-semibold text-text-primary">
                        Order Summary
                      </h3>

                      <div className="mt-4 space-y-3 text-xs">
                        <div className="flex justify-between text-text-secondary">
                          <span>Subtotal</span>
                          <span>
                            {formatCurrency(subtotal)}
                          </span>
                        </div>

                        <div className="flex justify-between text-text-secondary">
                          <span>Discount</span>
                          <span>
                            -
                            {formatCurrency(
                              Math.max(0, discount),
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between text-text-secondary">
                          <span>Shipping</span>
                          <span>
                            {formatCurrency(
                              Math.max(0, shipping),
                            )}
                          </span>
                        </div>

                        <div className="border-t border-border pt-3">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-text-primary">
                              Total
                            </span>

                            <span className="text-lg font-bold text-text-primary">
                              {formatCurrency(total)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
                    <button
                      type="button"
                      onClick={closeNewOrder}
                      disabled={isPending}
                      className="rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted disabled:opacity-40"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={
                        isPending ||
                        customers.length === 0 ||
                        activeProducts.length === 0 ||
                        hasStockIssue
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-[#0f3d35] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#0b302a] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}

                      {isPending
                        ? "Adding Order..."
                        : "Add Order"}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function OrderTabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative shrink-0 px-4 py-3 text-[10px] font-medium transition ${
        active
          ? "text-text-primary"
          : "text-text-secondary hover:text-text-primary"
      }`}
    >
      {label}

      {count > 0 && (
        <span
          className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] ${
            active
              ? "bg-surface-muted text-text-secondary"
              : "bg-surface-muted text-text-muted"
          }`}
        >
          {count}
        </span>
      )}

      {active && (
        <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[#174c42]" />
      )}
    </button>
  );
}

function EmptyOrdersState({
  hasAnyOrders,
  onAddOrder,
}: {
  hasAnyOrders: boolean;
  onAddOrder: () => void;
}) {
  return (
    <div className="flex min-h-[310px] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted">
        <ShoppingCart className="h-6 w-6 text-text-secondary" />
      </div>

      <h2 className="mt-4 text-sm font-semibold text-text-primary">
        {hasAnyOrders
          ? "No orders in this view"
          : "No orders yet"}
      </h2>

      <p className="mt-1 max-w-sm text-[11px] leading-5 text-text-muted">
        {hasAnyOrders
          ? "There are no orders matching the selected status."
          : "Your orders will appear here once you start receiving sales."}
      </p>

      {!hasAnyOrders && (
        <button
          type="button"
          onClick={onAddOrder}
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[#0f3d35] px-4 py-2.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#0b302a]"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Order
        </button>
      )}
    </div>
  );
}

function OrdersTable({
  orders,
  onEditOrder,
}: {
  orders: OrderListItem[];
  onEditOrder: (order: OrderListItem) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[850px] text-left">
        <thead>
          <tr className="border-b border-border bg-surface-muted/60">
            <TableHeader>Order</TableHeader>
            <TableHeader>Customer</TableHeader>
            <TableHeader>Date</TableHeader>
            <TableHeader>Items</TableHeader>
            <TableHeader>Total</TableHeader>
            <TableHeader>Payment</TableHeader>
            <TableHeader>Fulfillment</TableHeader>
            <TableHeader>Actions</TableHeader>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {orders.map((order) => (
            <tr
              key={order.id}
              className="transition-colors hover:bg-surface-muted/60"
            >
              <td className="px-5 py-4 text-xs font-semibold text-text-primary">
                {order.orderNumber}
              </td>

              <td className="px-5 py-4 text-xs font-medium text-text-secondary">
                {order.customerName}
              </td>

              <td className="px-5 py-4 text-xs text-text-secondary">
                {new Intl.DateTimeFormat("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }).format(order.orderDate)}
              </td>

              <td className="px-5 py-4 text-xs text-text-secondary">
                {order.itemCount}
              </td>

              <td className="px-5 py-4 text-xs font-semibold text-text-primary">
                {formatCurrency(order.totalAmount)}
              </td>

              <td className="px-5 py-4">
                <StatusBadge
                  label={formatStatus(
                    order.paymentStatus,
                  )}
                  tone={
                    order.paymentStatus === "PAID"
                      ? "success"
                      : order.paymentStatus === "REFUNDED"
                        ? "danger"
                        : "neutral"
                  }
                />
              </td>

              <td className="px-5 py-4">
                <StatusBadge
                  label={formatStatus(
                    order.fulfillmentStatus,
                  )}
                  tone={
                    order.fulfillmentStatus === "DELIVERED"
                      ? "success"
                      : order.fulfillmentStatus ===
                          "CANCELLED"
                        ? "danger"
                        : "neutral"
                  }
                />
              </td>

              <td className="px-5 py-4 text-right">
                <button
                  type="button"
                  onClick={() => onEditOrder(order)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-raised text-text-muted transition hover:border-border-strong hover:bg-surface-muted hover:text-text-secondary"
                  aria-label={`Edit ${order.orderNumber}`}
                  title={`Edit ${order.orderNumber}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted">
      {children}
    </th>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "danger" | "neutral";
}) {
  const styles = {
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    danger:
      "border-red-200 bg-red-50 text-red-700",
    neutral:
      "border-border bg-surface-muted text-text-secondary",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-semibold ${styles[tone]}`}
    >
      {label}
    </span>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold text-text-secondary">
        {label}
      </label>

      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-xs text-text-primary outline-none transition placeholder:text-text-muted focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-surface-muted";