import type { ReactNode } from "react";
import { getDashboardContext } from "@/modules/business/dashboard-context";
import { AppShellClient } from "@/components/layout/app-shell-client";

interface AppShellProps {
  children: ReactNode;
}

export async function AppShell({ children }: AppShellProps) {
  const { business } = await getDashboardContext();

  return (
    <AppShellClient
      businessName={business.name}
      industry={business.industry}
      stageName={business.currentStage.name}
      stageId={business.currentStage.id}
    >
      {children}
    </AppShellClient>
  );
}