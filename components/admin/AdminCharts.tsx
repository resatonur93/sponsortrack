"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const NAVY = "#0A2A5E";
const GOLD = "#D4AF87";

const PIE_COLORS = [NAVY, GOLD, "#0D9488", "#059669", "#C41E3A", "#5C6570"];

export function AdminLeadsTrendChart(props: {
  data: { date: string; count: number }[];
}): JSX.Element {
  return (
    <div className="h-64 w-full rounded-lg border border-brand-navy/10 bg-white p-3 shadow-card">
      <p className="mb-2 text-sm font-semibold text-brand-navy">
        Son 30 gün — lead
      </p>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={props.data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,42,94,0.12)" />
          <XAxis dataKey="date" tick={{ fill: "#5C6570", fontSize: 10 }} />
          <YAxis tick={{ fill: "#5C6570", fontSize: 10 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid rgba(10,42,94,0.15)",
              borderRadius: 8,
            }}
            labelStyle={{ color: NAVY }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke={NAVY}
            strokeWidth={2}
            dot={{ fill: GOLD, stroke: NAVY, strokeWidth: 1, r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AdminLeadStatusPie(props: {
  data: { status: string; count: number }[];
}): JSX.Element {
  return (
    <div className="h-64 w-full rounded-lg border border-brand-navy/10 bg-white p-3 shadow-card">
      <p className="mb-2 text-sm font-semibold text-brand-navy">Durum dağılımı</p>
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie
            data={props.data as { status: string; count: number }[]}
            dataKey="count"
            nameKey="status"
            cx="50%"
            cy="50%"
            outerRadius={72}
            label
          >
            {props.data.map((_, index) => (
              <Cell key={`cell-${String(index)}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Legend />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid rgba(10,42,94,0.15)",
              borderRadius: 8,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
