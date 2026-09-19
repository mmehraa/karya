import { AppShell } from "@/components/layout/app-shell";
import { getDashboardContext } from "@/modules/business/dashboard-context";
import { getCustomers } from "@/modules/customers/services";
import { CustomerClient } from "@/modules/customers/components/customer-client";

export default async function CustomersPage() {
  const { businessId } = await getDashboardContext();

  const customers = await getCustomers(businessId);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1440px]">
        <CustomerClient customers={customers} />
      </div>
    </AppShell>
  );
}