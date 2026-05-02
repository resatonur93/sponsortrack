import type { LeadStatus } from "@prisma/client";

export const ADMIN_LEAD_STATUS_ORDER: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "DEMO_SCHEDULED",
  "CONVERTED",
  "LOST",
];

export const ADMIN_LEAD_STATUS_CHART_COLORS: Record<LeadStatus, string> = {
  NEW: "#475569",
  CONTACTED: "#2563eb",
  QUALIFIED: "#4f46e5",
  DEMO_SCHEDULED: "#d97706",
  CONVERTED: "#059669",
  LOST: "#e11d48",
};

export const ADMIN_CHART_NAVY = "#0A2A5E";
