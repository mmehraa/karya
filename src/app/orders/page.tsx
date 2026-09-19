import { getDashboardContext } from "@/modules/business/dashboard-context";
import { getOrders } from "@/modules/orders/services";
import { getCustomers } from "@/modules/customers/services";
import { getActiveBusinessProducts } from "@/modules/products/services";
import { OrdersClient } from "@/modules/orders/components/orders-client";
import { AppShell } from "@/components/layout/app-shell";

export default async function OrdersPage() {
  const { businessId } = await getDashboardContext();

  const [orders, customers, products] = await Promise.all([
    getOrders(businessId),
    getCustomers(businessId),
    getActiveBusinessProducts(),
  ]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1440px]">
        <OrdersClient
          orders={orders}
          customers={customers}
          products={products}
        />
      </div>
    </AppShell>
  );
}