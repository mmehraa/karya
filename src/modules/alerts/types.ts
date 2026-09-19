import type {
  AlertSeverity,
} from "@prisma/client";

export interface SerializedAlert {
  id: string;
  businessId: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  isResolved: boolean;
  linkUrl: string | null;
  createdAt: Date;
}

export interface AlertsSummary {
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  infoAlerts: number;
  warningAlerts: number;
  criticalAlerts: number;
}

export interface AlertSyncResult {
  created: number;
  updated: number;
  resolved: number;
  active: number;
}