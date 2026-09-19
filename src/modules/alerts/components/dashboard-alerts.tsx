"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CircleAlert,
  Info,
  ShieldAlert,
} from "lucide-react";

import { AlertSeverity } from "@prisma/client";

import type { SerializedAlert } from "../types";

interface DashboardAlertsProps {
  alerts: SerializedAlert[];
}

function severityClasses(
  severity: AlertSeverity,
): string {
  switch (severity) {
    case AlertSeverity.CRITICAL:
      return "border-red-200 bg-red-50";

    case AlertSeverity.WARNING:
      return "border-amber-200 bg-amber-50";

    case AlertSeverity.INFO:
      return "border-blue-200 bg-blue-50";

    default:
      return "border-slate-200 bg-slate-50";
  }
}

function iconClasses(
  severity: AlertSeverity,
): string {
  switch (severity) {
    case AlertSeverity.CRITICAL:
      return "text-red-600";

    case AlertSeverity.WARNING:
      return "text-amber-600";

    case AlertSeverity.INFO:
      return "text-blue-600";

    default:
      return "text-slate-500";
  }
}

function SeverityIcon({
  severity,
}: {
  severity: AlertSeverity;
}) {
  if (severity === AlertSeverity.CRITICAL) {
    return <ShieldAlert className="h-5 w-5" />;
  }

  if (severity === AlertSeverity.WARNING) {
    return <CircleAlert className="h-5 w-5" />;
  }

  return <Info className="h-5 w-5" />;
}

export function DashboardAlerts({
  alerts,
}: DashboardAlertsProps) {
  const activeAlerts = alerts.filter(
    (alert) => !alert.isResolved,
  );

  if (activeAlerts.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex items-center gap-3 px-5 py-6 sm:px-7">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
            <AlertTriangle className="h-5 w-5 text-slate-400" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              No active alerts
            </h3>

            <p className="mt-0.5 text-xs text-slate-500">
              No operational issues currently require attention.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const visibleAlerts = activeAlerts.slice(0, 5);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="divide-y divide-slate-100">
        {visibleAlerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-start gap-4 px-5 py-4 sm:px-7"
          >
            <div
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${severityClasses(
                alert.severity,
              )} ${iconClasses(alert.severity)}`}
            >
              <SeverityIcon severity={alert.severity} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  {alert.title}
                </h3>

                {alert.severity === AlertSeverity.CRITICAL && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                    Critical
                  </span>
                )}

                {alert.severity === AlertSeverity.WARNING && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    Warning
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm leading-5 text-slate-600">
                {alert.message}
              </p>
            </div>

            {alert.linkUrl && (
              <Link
                href={alert.linkUrl}
                className="mt-1 shrink-0 text-xs font-semibold text-slate-500 transition hover:text-slate-900"
              >
                Open
              </Link>
            )}
          </div>
        ))}
      </div>

      {activeAlerts.length > 5 && (
        <div className="flex items-center justify-center border-t border-slate-100 bg-slate-50 px-5 py-3">
          <Link
            href="/alerts"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900"
          >
            View {activeAlerts.length - 5} more{" "}
            {activeAlerts.length - 5 === 1 ? "alert" : "alerts"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </section>
  );
}