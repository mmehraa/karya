"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { RefObject } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Boxes,
  CheckSquare,
  Factory,
  LayoutDashboard,
  Menu,
  Megaphone,
  Milestone,
  Package,
  Settings,
  ShoppingBag,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopNavProps {
  stageName: string;
  stageId: number;
  onMenuClick: () => void;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  isMenuOpen: boolean;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const PRIMARY_NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Products", href: "/products", icon: Package },
  { label: "Production", href: "/production-batches", icon: Factory },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Orders", href: "/orders", icon: ShoppingBag },
  { label: "Finance", href: "/finance", icon: Wallet },
  { label: "Insights", href: "/analytics", icon: BarChart3 },
];

const MORE_NAV: NavItem[] = [
  { label: "Materials", href: "/materials", icon: Boxes },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Cash Flow", href: "/cash-flow", icon: ArrowLeftRight },
  { label: "Investor Metrics", href: "/investor-metrics", icon: TrendingUp },
  { label: "Marketing", href: "/marketing", icon: Megaphone },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Alerts", href: "/alerts", icon: AlertTriangle },
  { label: "Stage & Gates", href: "/stages", icon: Milestone },
  { label: "Settings", href: "/settings", icon: Settings },
];

function isCurrent(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getDate() {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date());
}

export function TopNav({
  stageName,
  stageId,
  onMenuClick,
  menuButtonRef,
  isMenuOpen,
}: TopNavProps) {
  const pathname = usePathname();
  const moreActive = MORE_NAV.some((item) => isCurrent(pathname, item.href));

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur">
      <div className="mx-auto flex min-h-[68px] w-full max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          aria-label="Karya home"
          className="shrink-0 text-[27px] font-semibold tracking-[-0.055em] text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
        >
          Karya<span className="text-accent">.</span>
        </Link>

        <nav aria-label="Primary navigation" className="hidden min-w-0 flex-1 items-center gap-1 lg:flex">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const active = isCurrent(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                  active
                    ? "bg-accent-soft text-text-primary"
                    : "text-text-secondary hover:bg-surface-muted hover:text-text-primary",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
          <details className="group relative shrink-0">
            <summary
              className={cn(
                "flex h-10 cursor-pointer list-none items-center rounded-xl px-3 text-[13px] font-medium transition-colors marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring [&::-webkit-details-marker]:hidden",
                moreActive
                  ? "bg-accent-soft text-text-primary"
                  : "text-text-secondary hover:bg-surface-muted hover:text-text-primary",
              )}
            >
              More <span className="ml-1 text-[10px]" aria-hidden="true">⌄</span>
            </summary>
            <div className="absolute left-0 top-full z-50 mt-2 grid w-56 gap-1 rounded-2xl border border-border bg-surface p-2 shadow-[var(--shadow-overlay)]">
              {MORE_NAV.map((item) => {
                const Icon = item.icon;
                const active = isCurrent(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                      active
                        ? "bg-accent-soft font-semibold text-text-primary"
                        : "text-text-secondary hover:bg-surface-muted hover:text-text-primary",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </details>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <div className="hidden text-right xl:block">
            <p className="text-[11px] text-text-muted">{getDate()}</p>
            <p className="text-xs font-medium text-text-secondary">{getGreeting()}</p>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-[10px] font-medium text-text-secondary md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
            <span>Stage {stageId}</span>
            <span className="max-w-28 truncate font-semibold text-text-primary">{stageName}</span>
          </div>
          <button
            ref={menuButtonRef}
            type="button"
            onClick={onMenuClick}
            aria-label={isMenuOpen ? "Navigation menu open" : "Open navigation menu"}
            aria-haspopup="dialog"
            aria-expanded={isMenuOpen}
            aria-controls="workspace-navigation"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-text-primary transition-colors hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
