import type { LeadStatus } from "@prisma/client";

/** JSON shape returned by `GET /api/admin/dashboard`. */
export type AdminDashboardRecentLead = {
  id: string;
  email: string;
  companyName: string | null;
  name: string | null;
  status: LeadStatus;
  source: string;
  createdAt: string;
  lastAction: {
    type: string;
    summary: string;
    at: string;
  } | null;
};

export type AdminDashboardPayload = {
  totalLeads: number;
  newLeadsToday: number;
  conversionRate: number;
  convertedCount: number;
  distinctSourceCount: number;
  leadsByStatus: { status: LeadStatus; count: number }[];
  leadsBySource: { source: string; count: number }[];
  leadsByDay: { date: string; count: number }[];
  recentLeads: AdminDashboardRecentLead[];
};
