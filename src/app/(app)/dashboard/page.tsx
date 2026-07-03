import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildRevenueReport } from "@/lib/revenue";
import { addMonths, currentMonthKey, formatMonthJa } from "@/lib/months";
import { parseFxRates, toBase, formatMoney } from "@/lib/currency";
import { DEAL_STAGE_LABELS } from "@/lib/constants";
import { PageHeader, Card } from "@/components/ui";
import { RevenueStackedChart, ProfitChart, MrrChart, PipelineChart } from "./charts";

export const metadata = { title: "ダッシュボード" };

export default async function DashboardPage() {
  const session = await requireSession();
  const orgId = session.org.id;
  const now = currentMonthKey();
  const from = addMonths(now, -11);

  const [report, openDeals, activeContracts] = await Promise.all([
    buildRevenueReport(orgId, from, now),
    db.deal.findMany({
      where: { orgId, stage: { in: ["LEAD", "NEGOTIATION", "PROPOSAL"] } },
    }),
    db.contract.count({ where: { orgId, status: "ACTIVE" } }),
  ]);

  const rates = parseFxRates(session.org.fxRates);
  const base = session.org.baseCurrency;

  const thisMonthRevenue = report.revenueTotal[now] ?? 0;
  const lastMonthRevenue = report.revenueTotal[addMonths(now, -1)] ?? 0;
  const revenueDelta = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : null;
  const mrrNow = report.mrr[now] ?? 0;
  const pipelineValue = openDeals.reduce(
    (sum, d) => sum + toBase(d.monthlyFee, d.currency, base, rates),
    0
  );

  // グラフ用データ (サービス名をキーに展開)
  const chartData = report.months.map((m) => {
    const row: Record<string, string | number> = { month: m };
    for (const s of report.serviceRows) row[s.name] = Math.round(s.cells[m].effective);
    row["手入力"] = Math.round(report.manualRows.reduce((sum, r) => sum + (r.cells[m] ?? 0), 0));
    row.profit = Math.round(report.profit[m]);
    row.cumulative = Math.round(report.cumulativeProfit[m]);
    row.mrr = Math.round(report.mrr[m]);
    return row;
  });
  const hasManual = report.manualRows.length > 0;
  const services = report.serviceRows.map((s) => ({ name: s.name, color: s.color }));

  const pipelineData = (["LEAD", "NEGOTIATION", "PROPOSAL"] as const).map((stage) => {
    const deals = openDeals.filter((d) => d.stage === stage);
    return {
      stage: DEAL_STAGE_LABELS[stage],
      count: deals.length,
      amount: Math.round(deals.reduce((sum, d) => sum + toBase(d.monthlyFee, d.currency, base, rates), 0)),
    };
  });

  const tiles = [
    {
      label: `今月の売上 (${formatMonthJa(now)})`,
      value: formatMoney(Math.round(thisMonthRevenue), base),
      sub: revenueDelta === null ? "前月データなし" : `前月比 ${revenueDelta >= 0 ? "+" : ""}${revenueDelta.toFixed(0)}%`,
      subCls: revenueDelta !== null && revenueDelta < 0 ? "text-rose-600" : "text-emerald-700",
    },
    { label: "MRR (月次経常収益)", value: formatMoney(Math.round(mrrNow), base), sub: "稼働中契約の月額合計", subCls: "text-slate-400" },
    { label: "稼働中の契約", value: `${activeContracts} 件`, sub: <Link href="/contracts" className="hover:underline">契約管理へ →</Link>, subCls: "text-slate-400" },
    { label: "商談中パイプライン", value: formatMoney(Math.round(pipelineValue), base), sub: `${openDeals.length} 件の進行中案件 (月額換算)`, subCls: "text-slate-400" },
  ];

  return (
    <div>
      <PageHeader
        title="ダッシュボード"
        description={`${session.org.name} の経営数値サマリー (${base}換算)`}
      />

      {/* 統計タイル */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <Card key={i} className="p-5">
            <p className="text-xs font-medium text-slate-500">{t.label}</p>
            <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{t.value}</p>
            <p className={`mt-1 text-xs ${t.subCls}`}>{t.sub}</p>
          </Card>
        ))}
      </div>

      {/* サービス別売上 */}
      <Card className="mb-6 p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-slate-800">サービス別 月次売上</h2>
          <Link href="/revenue" className="text-xs font-medium text-akane-600 hover:underline">
            売上管理 (表で見る) →
          </Link>
        </div>
        <RevenueStackedChart data={chartData} services={services} hasManual={hasManual} baseCurrency={base} />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 利益 */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">営業利益と累計利益</h2>
          <ProfitChart data={chartData} baseCurrency={base} />
        </Card>

        {/* MRR */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">MRR推移</h2>
          <MrrChart data={chartData} baseCurrency={base} />
        </Card>
      </div>

      {/* パイプライン */}
      <Card className="mt-6 p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-slate-800">案件パイプライン (進行中)</h2>
          <Link href="/deals" className="text-xs font-medium text-akane-600 hover:underline">
            案件ボードへ →
          </Link>
        </div>
        <PipelineChart data={pipelineData} baseCurrency={base} />
      </Card>
    </div>
  );
}
