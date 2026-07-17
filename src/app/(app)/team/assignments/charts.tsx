"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import { formatMonthShort, formatMonthJa } from "@/lib/months";
import { useIsMobile } from "@/components/use-is-mobile";

const INK_MUTED = "#898781";
const GRID = "#e1e0d9";
const BASELINE = "#c3c2b7";

const axisProps = {
  tick: { fill: INK_MUTED, fontSize: 11 },
  axisLine: { stroke: BASELINE },
  tickLine: false as const,
};

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

// 積み上げ用の系列色 (顧客・メンバー数ぶん循環)
export const SERIES_COLORS = [
  "#2a78d6",
  "#d6702a",
  "#10b981",
  "#8b5cf6",
  "#f43f5e",
  "#0ea5e9",
  "#f59e0b",
  "#64748b",
];

type ChartRow = Record<string, string | number>;

const fmtHours = (value: ValueType, name: NameType) =>
  [`${Number(value ?? 0)}h`, String(name ?? "")] as [string, string];

// 対象月のメンバー別工数 (顧客/案件で積み上げ)
export function MemberHoursChart({ data, series }: { data: ChartRow[]; series: string[] }) {
  const mobile = useIsMobile();
  return (
    <ResponsiveContainer width="100%" height={mobile ? 220 : 280}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="member" {...axisProps} interval={0} />
        <YAxis tickFormatter={(v: number) => `${v}h`} {...axisProps} width={mobile ? 40 : 52} />
        <Tooltip formatter={fmtHours} contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#52514e" }} />
        {series.map((name, i) => (
          <Bar
            key={name}
            name={name}
            dataKey={name}
            stackId="hours"
            fill={SERIES_COLORS[i % SERIES_COLORS.length]}
            maxBarSize={40}
            radius={i === series.length - 1 ? [3, 3, 0, 0] : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// 直近6ヶ月の月次推移 (メンバーで積み上げ)
export function MonthlyTrendChart({ data, series }: { data: ChartRow[]; series: string[] }) {
  const mobile = useIsMobile();
  return (
    <ResponsiveContainer width="100%" height={mobile ? 220 : 280}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="month" tickFormatter={formatMonthShort} {...axisProps} />
        <YAxis tickFormatter={(v: number) => `${v}h`} {...axisProps} width={mobile ? 40 : 52} />
        <Tooltip
          formatter={fmtHours}
          labelFormatter={(label: string) => formatMonthJa(label)}
          contentStyle={tooltipStyle}
          cursor={{ fill: "rgba(0,0,0,0.03)" }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#52514e" }} />
        {series.map((name, i) => (
          <Bar
            key={name}
            name={name}
            dataKey={name}
            stackId="hours"
            fill={SERIES_COLORS[i % SERIES_COLORS.length]}
            maxBarSize={28}
            radius={i === series.length - 1 ? [3, 3, 0, 0] : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
