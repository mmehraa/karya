import { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

export default function ProductsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}