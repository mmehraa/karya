
"use client";

import { useEffect, useRef, type KeyboardEvent, type RefObject } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Milestone,
  Package,
  Factory,
  Layers,
  Boxes,
  ShoppingBag,
  Users,
  Wallet,
  ArrowLeftRight,
  BarChart3,
  TrendingUp,
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
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, enabled: true },
  { label: "Stage & Gates", href: "/stages", icon: Milestone, enabled: true },
  { label: "Products", href: "/products", icon: Package, enabled: true },
  { label: "Production", href: "/production-batches", icon: Factory, enabled: true },
  { label: "Inventory", href: "/inventory", icon: Layers, enabled: true },
  { label: "Materials", href: "/materials", icon: Boxes, enabled: true },
  { label: "Orders", href: "/orders", icon: ShoppingBag, enabled: true },
  { label: "Customers", href: "/customers", icon: Users, enabled: true },
  { label: "Finance", href: "/finance", icon: Wallet, enabled: true },
  { label: "Cash Flow", href: "/cash-flow", icon: ArrowLeftRight, enabled: true },
  { label: "Analytics", href: "/analytics", icon: BarChart3, enabled: true },
  { label: "Investor Metrics", href: "/investor-metrics", icon: TrendingUp, enabled: true },
  { label: "Marketing", href: "/marketing", icon: Megaphone, enabled: true },
  { label: "Goals", href: "/goals", icon: Target, enabled: true },
  { label: "Tasks", href: "/tasks", icon: CheckSquare, enabled: true },
  { label: "Alerts", href: "/alerts", icon: AlertTriangle, enabled: true },
  { label: "Settings", href: "/settings", icon: Settings, enabled: true },
];

interface SidebarProps {
  businessName: string;
  industry: string;
  isOpen: boolean;
  onClose: () => void;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Sidebar({
  businessName,
  industry,
  isOpen,
  onClose,
  menuButtonRef,
}: SidebarProps) {
  const pathname = usePathname();
  const panelRef = useRef<HTMLElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;

      const firstFocusable =
        panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);

      firstFocusable?.focus();
      return;
    }

    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      menuButtonRef.current?.focus();
    }
  }, [isOpen, menuButtonRef]);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!isOpen) return;

    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const panel = panelRef.current;
    if (!panel) return;

    const focusableElements = Array.from(
      panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter(
      (element) =>
        !element.hasAttribute("disabled") &&
        element.getAttribute("aria-hidden") !== "true",
    );

    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && (activeElement === firstElement || !panel.contains(activeElement))) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && (activeElement === lastElement || !panel.contains(activeElement))) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] transition-opacity duration-200",
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        ref={panelRef}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-[min(360px,88vw)] flex-col border-l border-border bg-surface shadow-[var(--shadow-overlay)] transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
        role="dialog"
        aria-modal={isOpen}
        aria-label="Workspace navigation"
        aria-hidden={!isOpen}
        inert={!isOpen}
        onKeyDown={handleKeyDown}
      >
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-border px-5">
          <div>
            <div className="text-lg font-semibold tracking-[-0.03em] text-text-primary">
              Karya<span className="text-accent">.</span>
            </div>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-text-muted">
              Business Operating System
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-raised text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="border-b border-border px-5 py-5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Active Business
          </p>
          <p className="truncate text-sm font-semibold text-text-primary">
            {businessName}
          </p>
          <p className="mt-0.5 truncate text-xs text-text-secondary">
            {industry}
          </p>
        </div>

        <nav
          className="flex-1 overflow-y-auto px-3 py-4"
          aria-label="Main navigation"
        >
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Workspace
          </p>

          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;

              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              if (!item.enabled) {
                return (
                  <div
                    key={item.label}
                    className="flex cursor-not-allowed select-none items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-text-muted opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
                      <span>{item.label}</span>
                    </div>
                    <span className="rounded-md bg-surface-muted px-1.5 py-0.5 text-[9px] font-medium text-text-muted">
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
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                    isActive
                      ? "bg-accent-soft font-semibold text-text-primary"
                      : "text-text-secondary hover:bg-surface-muted hover:text-text-primary",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[17px] w-[17px] shrink-0 transition-colors",
                      isActive
                        ? "text-accent"
                        : "text-text-muted group-hover:text-text-secondary",
                    )}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="shrink-0 border-t border-border p-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-raised px-3 py-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-30" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            <div>
              <p className="text-[11px] font-semibold text-text-primary">
                Local database connected
              </p>
              <p className="text-[10px] text-text-muted">PostgreSQL</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}