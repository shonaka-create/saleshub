"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import { formatMonthShort, formatMonthJa } from "@/lib/months";
import { formatCompact, formatMoney } from "@/lib/currency";

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

type ChartRow = Record<string, string | number>;

// 売上・費用・利益 (棒2本 + 利益ライン)
export function PnlChart({ data, baseCurrency }: { data: ChartRow[]; baseCurrency: string }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="month" tickFormatter={formatMonthShort} {...axisProps} />
        <YAxis tickFormatter={(v: number) => formatCompact(v, baseCurrency)} {...axisProps} width={70} />
        <Tooltip
          formatter={(value: ValueType, name: NameType) =>
            [formatMoney(Number(value ?? 0), baseCurrency), String(name ?? "")] as [string, string]
          }
          labelFormatter={(label: string) => formatMonthJa(label)}
          contentStyle={tooltipStyle}
          cursor={{ fill: "rgba(0,0,0,0.03)" }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#52514e" }} />
        <Bar name="売上" dataKey="revenue" fill="#2a78d6" maxBarSize={18} radius={[3, 3, 0, 0]} />
        <Bar name="費用" dataKey="expense" fill="#d6702a" maxBarSize={18} radius={[3, 3, 0, 0]} />
        <Line
          name="利益"
          dataKey="profit"
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

// MRR (棒) + 解約率% (ライン・右軸)
export function MrrChurnChart({ data, baseCurrency }: { data: ChartRow[]; baseCurrency: string }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="month" tickFormatter={formatMonthShort} {...axisProps} />
        <YAxis
          yAxisId="money"
          tickFormatter={(v: number) => formatCompact(v, baseCurrency)}
          {...axisProps}
          width={70}
        />
        <YAxis
          yAxisId="pct"
          orientation="right"
          tickFormatter={(v: number) => `${v}%`}
          {...axisProps}
          width={45}
        />
        <Tooltip
          formatter={(value: ValueType, name: NameType) => {
            const label = String(name ?? "");
            const v = Number(value ?? 0);
            return [label === "解約率" ? `${v.toFixed(1)}%` : formatMoney(v, baseCurrency), label] as [
              string,
              string,
            ];
          }}
          labelFormatter={(label: string) => formatMonthJa(label)}
          contentStyle={tooltipStyle}
          cursor={{ fill: "rgba(0,0,0,0.03)" }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#52514e" }} />
        <Bar yAxisId="money" name="MRR" dataKey="mrr" fill="#2a78d6" maxBarSize={20} radius={[3, 3, 0, 0]} />
        <Line
          yAxisId="pct"
          name="解約率"
          dataKey="churnRate"
          stroke="#c2410c"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          type="monotone"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// 契約数の動き (新規 / 解約 / 稼働)
export function ContractsChart({ data }: { data: ChartRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="month" tickFormatter={formatMonthShort} {...axisProps} />
        <YAxis allowDecimals={false} {...axisProps} width={40} />
        <Tooltip
          formatter={(value: ValueType, name: NameType) =>
            [`${value} 件`, String(name ?? "")] as [string, string]
          }
          labelFormatter={(label: string) => formatMonthJa(label)}
          contentStyle={tooltipStyle}
          cursor={{ fill: "rgba(0,0,0,0.03)" }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#52514e" }} />
        <Bar name="新規" dataKey="newContracts" fill="#15803d" maxBarSize={16} radius={[3, 3, 0, 0]} />
        <Bar name="解約" dataKey="churnedContracts" fill="#c2410c" maxBarSize={16} radius={[3, 3, 0, 0]} />
        <Line
          name="稼働契約数"
          dataKey="activeContracts"
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

// 外注費 + 上限ライン
export function OutsourcingChart({
  data,
  baseCurrency,
  limit,
}: {
  data: ChartRow[];
  baseCurrency: string;
  limit: number | null;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="month" tickFormatter={formatMonthShort} {...axisProps} />
        <YAxis tickFormatter={(v: number) => formatCompact(v, baseCurrency)} {...axisProps} width={70} />
        <Tooltip
          formatter={(value: ValueType) =>
            [formatMoney(Number(value ?? 0), baseCurrency), "外注費"] as [string, string]
          }
          labelFormatter={(label: string) => formatMonthJa(label)}
          contentStyle={tooltipStyle}
          cursor={{ fill: "rgba(0,0,0,0.03)" }}
        />
        <Bar name="外注費" dataKey="outsourcing" maxBarSize={22} radius={[3, 3, 0, 0]} fill="#d6702a" />
        {limit != null && (
          <ReferenceLine
            y={limit}
            stroke="#be123c"
            strokeDasharray="6 4"
            label={{
              value: `上限 ${formatCompact(limit, baseCurrency)}`,
              position: "insideTopRight",
              fill: "#be123c",
              fontSize: 11,
            }}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
