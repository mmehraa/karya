import { getDashboardContext } from "@/modules/business/dashboard-context";
import { getSettingsPageData } from "@/modules/settings/services";
import { SettingsClient } from "@/modules/settings/components/settings-client";

export default async function SettingsPage() {
  const { businessId } = await getDashboardContext();

  const {
    profile,
    settings,
  } = await getSettingsPageData(businessId);

  return (
    <SettingsClient
      profile={profile}
      settings={settings}
    />
  );
}