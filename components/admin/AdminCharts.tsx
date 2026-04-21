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

const PIE_COLORS = ["#1E5BB5", "#0D9488", "#D97706", "#059669", "#E11D48", "#64748B"];

export function AdminLeadsTrendChart(props: {
  data: { date: string; count: number }[];
}): JSX.Element {
  return (
    <div className="h-64 w-full rounded-lg border border-slate-700 bg-[#1E293B] p-3">
      <p className="mb-2 text-sm font-medium text-slate-300">Son 30 gün — lead</p>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={props.data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: 10 }} />
          <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1E293B",
              border: "1px solid #334155",
              borderRadius: 8,
            }}
            labelStyle={{ color: "#F8FAFC" }}
          />
          <Line type="monotone" dataKey="count" stroke="#1E5BB5" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AdminLeadStatusPie(props: {
  data: { status: string; count: number }[];
}): JSX.Element {
  return (
    <div className="h-64 w-full rounded-lg border border-slate-700 bg-[#1E293B] p-3">
      <p className="mb-2 text-sm font-medium text-slate-300">Durum dağılımı</p>
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie
            data={props.data as { status: string; count: number }[]}
            dataKey="count"
            nameKey="status"
            cx="50%"
            cy="50%"
            outerRadius={70}
            labelLine={false}
          >
            {props.data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#1E293B",
              border: "1px solid #334155",
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
