import { getDashboardContext } from "@/modules/business/dashboard-context";
import { getAlerts } from "@/modules/alerts/services";
import { AlertsClient } from "@/modules/alerts/components/alerts-client";

export default async function AlertsPage() {
  const { businessId } =
    await getDashboardContext();

  const alerts = await getAlerts(businessId);

  return (
    <div className="mx-auto w-full max-w-[1280px]">
      <AlertsClient alerts={alerts} />
    </div>
  );
}