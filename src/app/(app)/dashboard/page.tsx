import Link from "next/link";
import { requireSession, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { planStatus, TRIAL_DAYS, PRO_PRICE_JPY } from "@/lib/plan";
import { buildInsightsReport } from "@/lib/insights";
import { addMonths, currentMonthKey, formatMonthJa } from "@/lib/months";
import { parseFxRates, toBase, formatMoney } from "@/lib/currency";
import { DEAL_STAGE_LABELS } from "@/lib/constants";
import { PageHeader, Card, btnPrimary, btnSecondary, inputCls, labelCls } from "@/components/ui";
import { startProCheckout, openBillingPortal, updateInsightsSettings } from "@/app/actions/billing";
import { startInsightsTrial } from "@/app/actions/base-billing";
import { RevenueStackedChart, PipelineChart } from "./charts";
import { PnlChart, MrrChurnChart, ContractsChart, OutsourcingChart } from "../insights/charts";

export const metadata = { title: "経営数値分析" };

const PRO_FEATURES = [
  "MRR / ARR / 解約率のトレンド分析",
  "LTV・CAC・ユニットエコノミクス (LTV/CAC)",
  "CAC回収期間・ARPU・粗利率",
  "契約の増減 (新規・解約・稼働) の推移",
  "外注費の上限アラートと急増検知",
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string; billing?: string; base?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const orgId = session.org.id;
  const admin = isAdmin(session.role);
  const now = currentMonthKey();

  const [org, openDeals, activeContracts] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: orgId },
      select: { plan: true, trialEndsAt: true, settings: true, stripeCustomerId: true },
    }),
    db.deal.findMany({
      where: { orgId, stage: { in: ["LEAD", "NEGOTIATION", "PROPOSAL"] } },
    }),
    db.contract.count({ where: { orgId, status: "ACTIVE" } }),
  ]);

  // Pro (経営分析) のアクセス状態。トライアルは自動開始せず、ボタンから明示的に始める
  const status = planStatus(org);

  // 売上レポート + 経営指標 (基本指標は全プランで表示、Pro指標はアクセス時のみ描画)
  const report = await buildInsightsReport(orgId, org.settings);
  const base = report.baseCurrency;
  const rates = parseFxRates(session.org.fxRates);
  const fmt = (v: number) => formatMoney(Math.round(v), base);

  // ===== なじみのある基本指標 =====
  const thisMonthRevenue = report.revenue[now] ?? 0;
  const lastMonthRevenue = report.revenue[addMonths(now, -1)] ?? 0;
  const revenueDelta =
    lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : null;
  const thisMonthProfit = report.profit[now] ?? 0;
  const pipelineValue = openDeals.reduce(
    (sum, d) => sum + toBase(d.monthlyFee, d.currency, base, rates),
    0
  );

  const basicTiles = [
    {
      label: `今月の売上 (${formatMonthJa(now)})`,
      value: fmt(thisMonthRevenue),
      sub:
        revenueDelta === null
          ? "前月データなし"
          : `前月比 ${revenueDelta >= 0 ? "+" : ""}${revenueDelta.toFixed(0)}%`,
      subCls: revenueDelta !== null && revenueDelta < 0 ? "text-rose-600" : "text-emerald-700",
    },
    {
      label: "今月の利益",
      value: fmt(thisMonthProfit),
      sub: "売上 − 経費",
      subCls: thisMonthProfit < 0 ? "text-rose-600" : "text-slate-400",
    },
    {
      label: "MRR (毎月の継続収入)",
      value: fmt(report.mrrNow),
      sub: "稼働中契約の月額合計",
      subCls: "text-slate-400",
    },
    {
      label: "稼働中の契約",
      value: `${activeContracts} 件`,
      sub: <Link href="/contracts" className="hover:underline">契約管理へ →</Link>,
      subCls: "text-slate-400",
    },
  ];

  // ===== グラフ用データ =====
  const chartData = report.months.map((m) => {
    const row: Record<string, string | number> = { month: m };
    for (const s of report.serviceRows) row[s.name] = Math.round(s.cells[m].effective);
    row["手入力"] = Math.round(report.manualRows.reduce((sum, r) => sum + (r.cells[m] ?? 0), 0));
    row.revenue = Math.round(report.revenue[m]);
    row.expense = Math.round(report.expense[m]);
    row.profit = Math.round(report.profit[m]);
    row.mrr = Math.round(report.mrr[m]);
    row.churnRate = Number(report.churnRate[m].toFixed(1));
    row.activeContracts = report.activeContracts[m];
    row.newContracts = report.newContracts[m];
    row.churnedContracts = report.churnedContracts[m];
    row.outsourcing = Math.round(report.outsourcingCost[m]);
    return row;
  });
  const hasManual = report.manualRows.some((r) => r.total !== 0);
  const services = report.serviceRows.map((s) => ({ name: s.name, color: s.color }));

  const pipelineData = (["LEAD", "NEGOTIATION", "PROPOSAL"] as const).map((stage) => {
    const deals = openDeals.filter((d) => d.stage === stage);
    return {
      stage: DEAL_STAGE_LABELS[stage],
      count: deals.length,
      amount: Math.round(
        deals.reduce((sum, d) => sum + toBase(d.monthlyFee, d.currency, base, rates), 0)
      ),
    };
  });

  // ===== Pro 指標タイル =====
  const ratioHealth =
    report.ltvCacRatio == null
      ? null
      : report.ltvCacRatio >= 3
        ? { label: "健全 (3以上)", cls: "text-emerald-700" }
        : report.ltvCacRatio >= 1
          ? { label: "要改善 (3未満)", cls: "text-amber-600" }
          : { label: "赤字構造 (1未満)", cls: "text-rose-600" };

  const proTiles: { label: string; value: string; sub: string; subCls?: string }[] = [
    {
      label: "MRR成長率 (前月比)",
      value:
        report.mrrGrowthPct == null
          ? "—"
          : `${report.mrrGrowthPct >= 0 ? "+" : ""}${report.mrrGrowthPct.toFixed(1)}%`,
      sub: `ARR (年間換算) ${fmt(report.arr)}`,
      subCls: report.mrrGrowthPct != null && report.mrrGrowthPct < 0 ? "text-rose-600" : "text-emerald-700",
    },
    {
      label: "解約率 (月次)",
      value: `${report.avgChurnRatePct.toFixed(1)}%`,
      sub: "直近3ヶ月平均",
      subCls: report.avgChurnRatePct > 5 ? "text-rose-600" : undefined,
    },
    { label: "ARPU (契約単価)", value: fmt(report.arpu), sub: "稼働契約1件あたり月次収益" },
    {
      label: "粗利率",
      value: `${report.grossMarginPct.toFixed(0)}%`,
      sub: "直近3ヶ月の (売上−経費) ÷ 売上",
    },
    {
      label: "LTV (顧客生涯価値)",
      value: report.ltv == null ? "—" : fmt(report.ltv),
      sub:
        report.avgLifetimeMonths == null
          ? "解約実績がまだありません"
          : `平均継続 ${report.avgLifetimeMonths.toFixed(0)}ヶ月 × ARPU`,
    },
    {
      label: "CAC (顧客獲得コスト)",
      value: report.cac == null ? "—" : fmt(report.cac),
      sub:
        report.cac == null
          ? "広告・マーケ経費の入力が必要です"
          : `直近6ヶ月: ${report.marketingCategoryNames.join("・") || "広告系カテゴリ"} ÷ 新規契約数`,
    },
    {
      label: "ユニットエコノミクス (LTV/CAC)",
      value: report.ltvCacRatio == null ? "—" : report.ltvCacRatio.toFixed(1),
      sub: ratioHealth?.label ?? "LTV と CAC の両方が必要です",
      subCls: ratioHealth?.cls,
    },
    {
      label: "CAC回収期間",
      value: report.cacPaybackMonths == null ? "—" : `${report.cacPaybackMonths.toFixed(1)}ヶ月`,
      sub: "CAC ÷ ARPU",
    },
  ];

  return (
    <div>
      <PageHeader
        title="経営数値分析"
        description={`${session.org.name} の経営サマリー (${base}換算 — 通貨は「設定 > 組織・通貨」で変更できます)`}
        actions={
          status.isPro && admin && org.stripeCustomerId ? (
            <form action={openBillingPortal}>
              <button type="submit" className={btnSecondary}>
                Pro サブスクリプション管理
              </button>
            </form>
          ) : undefined
        }
      />

      {/* 通知バナー */}
      {sp.upgraded === "1" && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          🎉 Pro プランへの登録が完了しました。ありがとうございます!
        </div>
      )}
      {sp.base === "subscribed" && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          🎉 基本プランへの登録が完了しました。ありがとうございます!
        </div>
      )}
      {sp.billing === "unconfigured" && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          決済設定が未完了です (STRIPE_SECRET_KEY / STRIPE_PRICE_ID_PRO を設定してください)。
        </div>
      )}
      {sp.billing === "forbidden" && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          プラン登録には管理者権限が必要です。組織のオーナーにご依頼ください。
        </div>
      )}

      {/* ===== 基本指標 (誰でもなじみのあるデータを先頭に) ===== */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {basicTiles.map((t, i) => (
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
        {/* 売上・費用・利益 */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">売上・経費・利益の推移</h2>
          <PnlChart data={chartData} baseCurrency={base} />
        </Card>

        {/* パイプライン */}
        <Card className="p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              案件パイプライン ({openDeals.length}件 / 月額換算 {fmt(pipelineValue)})
            </h2>
            <Link href="/deals" className="text-xs font-medium text-akane-600 hover:underline">
              案件ボードへ →
            </Link>
          </div>
          <PipelineChart data={pipelineData} baseCurrency={base} />
        </Card>
      </div>

      {/* ===== 経営分析 (Pro) ===== */}
      <div className="mt-10 mb-4 flex items-center gap-2">
        <h2 className="text-base font-bold text-slate-900">経営分析</h2>
        <span className="rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
          PRO
        </span>
      </div>

      {status.hasAccess ? (
        <>
          {status.inTrial && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-800">
                ⏳ 無料トライアル中 — 残り <strong>{status.trialDaysLeft}日</strong> ({TRIAL_DAYS}
                日間)。終了後は Pro プラン (月額 ¥{PRO_PRICE_JPY}) が必要です。
              </p>
              {admin && (
                <form action={startProCheckout}>
                  <button
                    type="submit"
                    className="rounded-lg bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                  >
                    今すぐ Pro に登録
                  </button>
                </form>
              )}
            </div>
          )}

          {/* アラート */}
          {report.alerts.length > 0 && (
            <div className="mb-6 space-y-2">
              {report.alerts.slice(0, 5).map((a, i) => (
                <div
                  key={i}
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    a.severity === "danger"
                      ? "border-rose-200 bg-rose-50 text-rose-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  {a.severity === "danger" ? "🚨" : "⚠️"} <strong>{formatMonthJa(a.month)}</strong>:{" "}
                  {a.title} — {a.detail}
                </div>
              ))}
            </div>
          )}

          {/* Pro 指標タイル */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {proTiles.map((t) => (
              <Card key={t.label} className="p-5">
                <p className="text-xs font-medium text-slate-500">{t.label}</p>
                <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{t.value}</p>
                <p className={`mt-1 text-xs ${t.subCls ?? "text-slate-400"}`}>{t.sub}</p>
              </Card>
            ))}
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 text-sm font-semibold text-slate-800">MRR と解約率</h2>
              <MrrChurnChart data={chartData} baseCurrency={base} />
            </Card>
            <Card className="p-5">
              <h2 className="mb-4 text-sm font-semibold text-slate-800">契約の増減 (新規・解約・稼働)</h2>
              <ContractsChart data={chartData} />
            </Card>
          </div>

          {/* 外注費 + 分析設定 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <h2 className="mb-1 text-sm font-semibold text-slate-800">外注費の推移</h2>
              <p className="mb-4 text-xs text-slate-400">
                対象カテゴリ: {report.outsourcingCategoryNames.join("・") || "「外注」を含む経費カテゴリ (自動判定)"}
              </p>
              <OutsourcingChart data={chartData} baseCurrency={base} limit={report.outsourcingLimit} />
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 text-sm font-semibold text-slate-800">分析設定</h2>
              <form action={updateInsightsSettings} className="space-y-4">
                <div>
                  <label className={labelCls}>外注費の月次上限 ({base})</label>
                  <input
                    type="number"
                    name="outsourcingLimit"
                    min="0"
                    step="1"
                    defaultValue={report.outsourcingLimit ?? ""}
                    placeholder="例: 300000"
                    className={inputCls}
                  />
                  <p className="mt-1 text-xs text-slate-400">超過した月はアラート表示されます</p>
                </div>
                {report.expenseCategories.length > 0 && (
                  <>
                    <div>
                      <p className={labelCls}>外注費カテゴリ</p>
                      <div className="space-y-1">
                        {report.expenseCategories.map((c) => (
                          <label key={c.id} className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              name="outsourcingCategoryIds"
                              value={c.id}
                              defaultChecked={report.settings.outsourcingCategoryIds.includes(c.id)}
                            />
                            {c.name}
                          </label>
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">未選択なら名前で自動判定</p>
                    </div>
                    <div>
                      <p className={labelCls}>マーケティング費カテゴリ (CAC計算用)</p>
                      <div className="space-y-1">
                        {report.expenseCategories.map((c) => (
                          <label key={c.id} className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              name="marketingCategoryIds"
                              value={c.id}
                              defaultChecked={report.settings.marketingCategoryIds.includes(c.id)}
                            />
                            {c.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <button type="submit" className={btnSecondary}>
                  設定を保存
                </button>
              </form>
            </Card>
          </div>
        </>
      ) : status.trialAvailable ? (
        /* トライアル未開始: 明示的に開始してもらう */
        <Card className="p-8 text-center">
          <p className="text-3xl">📈</p>
          <h3 className="mt-3 text-lg font-bold text-slate-900">
            経営分析を14日間無料で試せます
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            トライアル終了後は月額 ¥{PRO_PRICE_JPY} (基本プランとは別途)。自動課金はされません。
          </p>
          <ul className="mx-auto mt-5 max-w-sm space-y-2 text-left text-sm text-slate-700">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="text-emerald-600">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <form action={startInsightsTrial} className="mt-6">
            <button type="submit" className={btnPrimary}>
              14日間無料トライアルを開始
            </button>
          </form>
        </Card>
      ) : (
        /* トライアル終了 & 未契約 */
        <Card className="p-8 text-center">
          <p className="text-3xl">📈</p>
          <h3 className="mt-3 text-lg font-bold text-slate-900">無料トライアルは終了しました</h3>
          <p className="mt-2 text-sm text-slate-500">
            経営分析は Pro プラン (月額 ¥{PRO_PRICE_JPY}) でご利用いただけます。
          </p>
          <ul className="mx-auto mt-5 max-w-sm space-y-2 text-left text-sm text-slate-700">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="text-emerald-600">✓</span>
                {f}
              </li>
            ))}
          </ul>
          {admin ? (
            <form action={startProCheckout} className="mt-6">
              <button type="submit" className={btnPrimary}>
                Pro プランに登録する (月額 ¥{PRO_PRICE_JPY})
              </button>
            </form>
          ) : (
            <p className="mt-6 text-xs text-slate-400">
              登録には管理者権限が必要です。組織のオーナーにご依頼ください。
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
