"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface DashboardControlsProps {
  businessName: string;
}

const PERIODS = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "3m", label: "3M" },
  { value: "1y", label: "1Y" },
] as const;

function getLocalDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function DashboardControls({
  businessName,
}: DashboardControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isBusinessOpen, setIsBusinessOpen] =
    useState(false);

  const [isCustomOpen, setIsCustomOpen] =
    useState(false);

  const businessRef =
    useRef<HTMLDivElement>(null);

  const customRef =
    useRef<HTMLDivElement>(null);

  const activeRange =
    searchParams.get("range") || "30d";

  const currentFrom =
    searchParams.get("from") || "";

  const currentTo =
    searchParams.get("to") || "";

  const [from, setFrom] = useState(
    currentFrom,
  );

  const [to, setTo] = useState(
    currentTo,
  );

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent,
    ) {
      const target =
        event.target as Node;

      if (
        businessRef.current &&
        !businessRef.current.contains(target)
      ) {
        setIsBusinessOpen(false);
      }

      if (
        customRef.current &&
        !customRef.current.contains(target)
      ) {
        setIsCustomOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, []);

  function setRange(range: string) {
    const params =
      new URLSearchParams(searchParams.toString());

    params.set("range", range);
    params.delete("from");
    params.delete("to");

    router.push(
      `${pathname}?${params.toString()}`,
    );
  }

  function applyCustomRange() {
    if (!from || !to) {
      return;
    }

    const params =
      new URLSearchParams(searchParams.toString());

    params.set("range", "custom");
    params.set("from", from);
    params.set("to", to);

    router.push(
      `${pathname}?${params.toString()}`,
    );

    setIsCustomOpen(false);
  }

  function openCustomRange() {
    if (!from || !to) {
      const today = new Date();

      const previousMonth =
        new Date(today);

      previousMonth.setDate(
        previousMonth.getDate() - 30,
      );

      setFrom(
        getLocalDateValue(previousMonth),
      );

      setTo(
        getLocalDateValue(today),
      );
    }

    setIsCustomOpen(true);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      {/* Business selector */}
      <div
        ref={businessRef}
        className="relative"
      >
        <button
          type="button"
          onClick={() =>
            setIsBusinessOpen(
              (open) => !open,
            )
          }
          className="inline-flex items-center gap-2 rounded-lg px-1 py-1 text-left transition hover:bg-surface-raised/60"
        >
          <span className="text-[25px] font-medium tracking-[-0.035em] text-text-primary">
            {businessName}
          </span>

          <ChevronDown
            className={`h-5 w-5 text-text-secondary transition-transform ${
              isBusinessOpen
                ? "rotate-180"
                : ""
            }`}
          />
        </button>

        {isBusinessOpen && (
          <div className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-surface-raised p-1.5 shadow-xl">
            <div className="px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                Active business
              </p>

              <p className="mt-1 text-sm font-semibold text-text-primary">
                {businessName}
              </p>
            </div>

            <div className="my-1 border-t border-border" />

            <a
              href="/select-business"
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-surface-muted hover:text-text-primary"
            >
              Switch business
            </a>
          </div>
        )}

        <p className="mt-0.5 text-sm text-text-secondary">
          Simple Skincare. Thoughtful Ritual.
        </p>
      </div>

      {/* Period controls */}
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-full border border-border bg-surface-raised p-1 shadow-sm">
          {PERIODS.map((period) => {
            const active =
              activeRange === period.value;

            return (
              <button
                key={period.value}
                type="button"
                onClick={() =>
                  setRange(period.value)
                }
                className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                  active
                    ? "bg-slate-200 text-text-primary"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {period.label}
              </button>
            );
          })}
        </div>

        <div
          ref={customRef}
          className="relative"
        >
          <button
            type="button"
            onClick={openCustomRange}
            className={`inline-flex items-center gap-2 rounded-full border bg-surface-raised px-4 py-3 text-xs font-medium shadow-sm transition ${
              activeRange === "custom"
                ? "border-border-strong text-text-primary"
                : "border-border text-text-secondary"
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            Custom
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {isCustomOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-surface-raised p-4 shadow-xl">
              <p className="text-sm font-semibold text-text-primary">
                Custom period
              </p>

              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-text-secondary">
                    From
                  </span>

                  <input
                    type="date"
                    value={from}
                    onChange={(event) =>
                      setFrom(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-secondary outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-text-secondary">
                    To
                  </span>

                  <input
                    type="date"
                    value={to}
                    onChange={(event) =>
                      setTo(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-secondary outline-none focus:border-emerald-600"
                  />
                </label>

                <button
                  type="button"
                  onClick={applyCustomRange}
                  disabled={!from || !to}
                  className="w-full rounded-lg bg-[#173d34] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#12342d] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Apply period
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}