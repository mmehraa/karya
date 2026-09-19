"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Milestone,
  Package,
  Layers,
  ShoppingBag,
  Users,
  Wallet,
  Megaphone,
  Target,
  CheckSquare,
  AlertTriangle,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  enabled: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    enabled: true,
  },
  {
    label: "Stage & Gates",
    href: "/stages",
    icon: Milestone,
    enabled: true,
  },
  {
    label: "Products",
    href: "/products",
    icon: Package,
    enabled: true,
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: Layers,
    enabled: true,
  },
  {
    label: "Orders",
    href: "/orders",
    icon: ShoppingBag,
    enabled: true,
  },
  {
    label: "Customers",
    href: "/customers",
    icon: Users,
    enabled: true,
  },
  {
    label: "Finance",
    href: "/finance",
    icon: Wallet,
    enabled: true,
  },
  {
    label: "Marketing",
    href: "/marketing",
    icon: Megaphone,
    enabled: true,
  },
  {
    label: "Goals",
    href: "/goals",
    icon: Target,
    enabled: true,
  },
  {
    label: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
    enabled: true,
  },
  {
    label: "Alerts",
    href: "/alerts",
    icon: AlertTriangle,
    enabled: true,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    enabled: true,
  },
];

interface SidebarProps {
  businessName: string;
  industry: string;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  businessName,
  industry,
  isOpen,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[2px] transition-opacity duration-200",
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-[min(360px,88vw)] flex-col border-l border-slate-200 bg-[#fbfaf7] shadow-2xl transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        aria-hidden={!isOpen}
      >
        {/* Drawer Header */}
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 px-5">
          <div>
            <div className="text-lg font-semibold tracking-[-0.03em] text-slate-950">
              Karya<span className="text-emerald-700">.</span>
            </div>

            <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-slate-400">
              Business Operating System
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Business Context */}
        <div className="border-b border-slate-200 px-5 py-5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Active Business
          </p>

          <p className="truncate text-sm font-semibold text-slate-900">
            {businessName}
          </p>

          <p className="mt-0.5 truncate text-xs text-slate-500">
            {industry}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Workspace
          </p>

          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;

              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(item.href));

              if (!item.enabled) {
                return (
                  <div
                    key={item.label}
                    className="flex cursor-not-allowed select-none items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-[17px] w-[17px] text-slate-300" />
                      <span>{item.label}</span>
                    </div>

                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-400">
                      Soon
                    </span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-emerald-50 font-semibold text-emerald-900"
                      : "text-slate-600 hover:bg-white hover:text-slate-950"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[17px] w-[17px] transition-colors",
                      isActive
                        ? "text-emerald-700"
                        : "text-slate-400 group-hover:text-slate-600"
                    )}
                  />

                  <span>{item.label}</span>

                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-200 p-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>

            <div>
              <p className="text-[11px] font-semibold text-slate-700">
                Local database connected
              </p>
              <p className="text-[10px] text-slate-400">
                PostgreSQL
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}