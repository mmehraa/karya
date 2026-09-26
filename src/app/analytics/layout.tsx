import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";

interface AnalyticsLayoutProps {
  children: ReactNode;
}

export default function AnalyticsLayout({
  children,
}: AnalyticsLayoutProps) {
  return <AppShell>{children}</AppShell>;
}