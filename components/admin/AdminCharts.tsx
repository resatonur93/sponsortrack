"use client";

import type { LeadStatus } from "@prisma/client";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
} from "recharts";
import {
  ADMIN_CHART_NAVY,
  ADMIN_LEAD_STATUS_CHART_COLORS,
  ADMIN_LEAD_STATUS_ORDER,
} from "@/lib/admin/chart-colors";

function formatTrendDay(dateIso: string, localeTag: string): string {
  const d = new Date(`${dateIso}T12:00:00Z`);
  return d.toLocaleDateString(localeTag, { day: "numeric", month: "short" });
}

export function AdminLeadsTrendChart(props: {
  data: { date: string; count: number }[];
  title: string;
  emptyHint: string;
  localeTag: string;
  leadsLabel: string;
}): JSX.Element {
  const chartData = props.data.map((row) => ({
    ...row,
    label: formatTrendDay(row.date, props.localeTag),
  }));
  const hasAny = props.data.some((d) => d.count > 0);

  return (
    <div className="flex h-[300px] w-full flex-col overflow-hidden rounded-2xl border border-brand-navy/12 bg-white p-4 shadow-card ring-1 ring-brand-navy/5 md:h-[340px]">
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-brand-navy">{props.title}</p>
      </div>
      <div className="relative min-h-[220px] flex-1">
        {!hasAny ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-brand-navy/15 bg-brand-navy/[0.02] px-4 text-center text-sm text-brand-slate">
            {props.emptyHint}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="adminLeadArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ADMIN_CHART_NAVY} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={ADMIN_CHART_NAVY} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,42,94,0.1)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#5C6570", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#5C6570", fontSize: 10 }}
                allowDecimals={false}
                width={32}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const n = payload[0].value as number;
                  const raw = payload[0].payload as { date?: string };
                  return (
                    <div className="rounded-lg border border-brand-navy/15 bg-white px-3 py-2 text-sm shadow-lg">
                      <p className="font-semibold text-brand-navy">{raw.date ?? label}</p>
                      <p className="tabular-nums text-slate-600">
                        {n} {props.leadsLabel}
                      </p>
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey="count" stroke="none" fill="url(#adminLeadArea)" />
              <Line
                type="monotone"
                dataKey="count"
                stroke={ADMIN_CHART_NAVY}
                strokeWidth={2.5}
                dot={{ fill: "#D4AF87", stroke: ADMIN_CHART_NAVY, strokeWidth: 1.5, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

type StatusRow = { status: LeadStatus; count: number };

export function AdminLeadStatusDonut(props: {
  data: StatusRow[];
  title: string;
  emptyHint: string;
  labelForStatus: (s: LeadStatus) => string;
}): JSX.Element {
  const map = new Map(props.data.map((d) => [d.status, d.count]));
  const pieData = ADMIN_LEAD_STATUS_ORDER.map((status) => {
    const count = map.get(status) ?? 0;
    if (count <= 0) return null;
    return {
      name: props.labelForStatus(status),
      status,
      value: count,
      fill: ADMIN_LEAD_STATUS_CHART_COLORS[status],
    };
  }).filter((x): x is NonNullable<typeof x> => x != null);

  const total = pieData.reduce((a, b) => a + b.value, 0);

  return (
    <div className="flex h-[300px] w-full flex-col overflow-hidden rounded-2xl border border-brand-navy/12 bg-white p-4 shadow-card ring-1 ring-brand-navy/5 md:h-[340px]">
      <p className="mb-2 text-sm font-bold text-brand-navy">{props.title}</p>
      <div className="relative min-h-[220px] flex-1">
        {total === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-brand-navy/15 bg-brand-navy/[0.02] px-4 text-center text-sm text-brand-slate">
            {props.emptyHint}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="48%"
                innerRadius={58}
                outerRadius={88}
                paddingAngle={2}
                stroke="#fff"
                strokeWidth={2}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.status} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as { name: string; value: number };
                  return (
                    <div className="rounded-lg border border-brand-navy/15 bg-white px-3 py-2 text-sm shadow-lg">
                      <p className="font-semibold text-brand-navy">{row.name}</p>
                      <p className="tabular-nums text-slate-600">{row.value}</p>
                    </div>
                  );
                }}
              />
              <Legend verticalAlign="bottom" height={42} formatter={(value) => <span className="text-xs">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
