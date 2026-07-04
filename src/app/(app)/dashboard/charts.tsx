"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import { formatMonthShort, formatMonthJa } from "@/lib/months";
import { formatCompact, formatMoney } from "@/lib/currency";

// ダッシュボード共通のチャートスタイル (recessiveなグリッド・軸、控えめなインク)
const INK_MUTED = "#898781";
const GRID = "#e1e0d9";
const BASELINE = "#c3c2b7";

const axisProps = {
  tick: { fill: INK_MUTED, fontSize: 11 },
  axisLine: { stroke: BASELINE },
  tickLine: false as const,
};

function moneyTooltip(baseCurrency: string) {
  return {
    formatter: (value: ValueType, name: NameType) =>
      [formatMoney(Number(value ?? 0), baseCurrency), String(name ?? "")] as [string, string],
    labelFormatter: (label: string) => formatMonthJa(label),
    contentStyle: {
      borderRadius: 8,
      border: "1px solid #e2e8f0",
      fontSize: 12,
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    },
  };
}

type ChartRow = Record<string, string | number>;

export function RevenueStackedChart({
  data,
  services,
  hasManual,
  baseCurrency,
}: {
  data: ChartRow[];
  services: { name: string; color: string }[];
  hasManual: boolean;
  baseCurrency: string;
}) {
  const seriesNames = [...services.map((s) => s.name), ...(hasManual ? ["未分類"] : [])];
  const lastSeries = seriesNames[seriesNames.length - 1];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="month" tickFormatter={formatMonthShort} {...axisProps} />
        <YAxis tickFormatter={(v: number) => formatCompact(v, baseCurrency)} {...axisProps} width={70} />
        <Tooltip {...moneyTooltip(baseCurrency)} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#52514e" }} />
        {services.map((s) => (
          <Bar
            key={s.name}
            dataKey={s.name}
            stackId="rev"
            fill={s.color}
            stroke="#ffffff"
            strokeWidth={1}
            maxBarSize={28}
            radius={s.name === lastSeries ? [3, 3, 0, 0] : undefined}
          />
        ))}
        {hasManual && (
          <Bar
            dataKey="未分類"
            stackId="rev"
            fill="#94a3b8"
            stroke="#ffffff"
            strokeWidth={1}
            maxBarSize={28}
            radius={[3, 3, 0, 0]}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProfitChart({ data, baseCurrency }: { data: ChartRow[]; baseCurrency: string }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="month" tickFormatter={formatMonthShort} {...axisProps} />
        <YAxis tickFormatter={(v: number) => formatCompact(v, baseCurrency)} {...axisProps} width={70} />
        <Tooltip {...moneyTooltip(baseCurrency)} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#52514e" }} />
        <Bar name="営業利益" dataKey="profit" fill="#2a78d6" maxBarSize={20} radius={[3, 3, 0, 0]} />
        <Line
          name="累計利益"
          dataKey="cumulative"
          stroke="#104281"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          type="monotone"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function MrrChart({ data, baseCurrency }: { data: ChartRow[]; baseCurrency: string }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="month" tickFormatter={formatMonthShort} {...axisProps} />
        <YAxis tickFormatter={(v: number) => formatCompact(v, baseCurrency)} {...axisProps} width={70} />
        <Tooltip {...moneyTooltip(baseCurrency)} />
        <Line
          name="MRR"
          dataKey="mrr"
          stroke="#2a78d6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          type="monotone"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PipelineChart({
  data,
  baseCurrency,
}: {
  data: { stage: string; count: number; amount: number }[];
  baseCurrency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 60, left: 8, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" tickFormatter={(v: number) => formatCompact(v, baseCurrency)} {...axisProps} />
        <YAxis type="category" dataKey="stage" {...axisProps} width={80} />
        <Tooltip
          formatter={(value: ValueType) =>
            [formatMoney(Number(value ?? 0), baseCurrency), "月額換算"] as [string, string]
          }
          cursor={{ fill: "rgba(0,0,0,0.03)" }}
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Bar
          dataKey="amount"
          fill="#2a78d6"
          maxBarSize={22}
          radius={[0, 3, 3, 0]}
          label={{
            position: "right",
            fill: "#52514e",
            fontSize: 11,
            formatter: (v: unknown) => formatCompact(Number(v), baseCurrency),
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
