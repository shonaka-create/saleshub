import { requireSession, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { planStatus, startTrial, TRIAL_DAYS, PRO_PRICE_JPY } from "@/lib/plan";
import { buildInsightsReport } from "@/lib/insights";
import { formatMoney } from "@/lib/currency";
import { formatMonthJa } from "@/lib/months";
import { PageHeader, Card, btnPrimary, btnSecondary, inputCls, labelCls } from "@/components/ui";
import { startProCheckout, openBillingPortal, updateInsightsSettings } from "@/app/actions/billing";
import { PnlChart, MrrChurnChart, ContractsChart, OutsourcingChart } from "./charts";

export const metadata = { title: "経営分析" };

const PRO_FEATURES = [
  "売上・費用・利益の推移グラフ",
  "MRR / ARR / 解約率のトレンド",
  "LTV・CAC・ユニットエコノミクス (LTV/CAC)",
  "CAC回収期間・ARPU・粗利率",
  "外注費の上限アラートと急増検知",
];

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string; billing?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const admin = isAdmin(session.role);

  let org = await db.organization.findUniqueOrThrow({
    where: { id: session.org.id },
    select: { plan: true, trialEndsAt: true, settings: true, stripeCustomerId: true },
  });

  // 初回アクセスで14日間の無料トライアルを自動開始
  let status = planStatus(org);
  if (status.trialAvailable) {
    const endsAt = await startTrial(session.org.id);
    org = { ...org, trialEndsAt: endsAt };
    status = planStatus(org);
  }

  // ===== ペイウォール (トライアル終了 & 未契約) =====
  if (!status.hasAccess) {
    return (
      <>
        <PageHeader title="経営分析" description="Pro プラン限定機能" />
        <Card className="mx-auto max-w-xl p-8 text-center">
          <p className="text-3xl">📈</p>
          <h2 className="mt-3 text-lg font-bold text-slate-900">
            無料トライアルは終了しました
          </h2>
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
          {sp.billing === "unconfigured" && (
            <p className="mt-3 text-xs text-rose-600">
              決済設定が未完了です (STRIPE_SECRET_KEY / STRIPE_PRICE_ID_PRO を設定してください)。
            </p>
          )}
        </Card>
      </>
    );
  }

  // ===== 分析本体 =====
  const report = await buildInsightsReport(session.org.id, org.settings);
  const base = report.baseCurrency;

  const chartData = report.months.map((m) => ({
    month: m,
    revenue: Math.round(report.revenue[m]),
    expense: Math.round(report.expense[m]),
    profit: Math.round(report.profit[m]),
    mrr: Math.round(report.mrr[m]),
    churnRate: Number(report.churnRate[m].toFixed(1)),
    activeContracts: report.activeContracts[m],
    newContracts: report.newContracts[m],
    churnedContracts: report.churnedContracts[m],
    outsourcing: Math.round(report.outsourcingCost[m]),
  }));

  const fmt = (v: number) => formatMoney(Math.round(v), base);
  const ratioHealth =
    report.ltvCacRatio == null
      ? null
      : report.ltvCacRatio >= 3
        ? { label: "健全 (3以上)", cls: "text-emerald-700" }
        : report.ltvCacRatio >= 1
          ? { label: "要改善 (3未満)", cls: "text-amber-600" }
          : { label: "赤字構造 (1未満)", cls: "text-rose-600" };

  const tiles: { label: string; value: string; sub: string; subCls?: string }[] = [
    {
      label: "MRR (月次経常収益)",
      value: fmt(report.mrrNow),
      sub:
        report.mrrGrowthPct == null
          ? "前月データなし"
          : `前月比 ${report.mrrGrowthPct >= 0 ? "+" : ""}${report.mrrGrowthPct.toFixed(1)}%`,
      subCls: report.mrrGrowthPct != null && report.mrrGrowthPct < 0 ? "text-rose-600" : "text-emerald-700",
    },
    { label: "ARR (年間換算)", value: fmt(report.arr), sub: "MRR × 12" },
    {
      label: "解約率 (月次)",
      value: `${report.avgChurnRatePct.toFixed(1)}%`,
      sub: "直近3ヶ月平均",
      subCls: report.avgChurnRatePct > 5 ? "text-rose-600" : undefined,
    },
    { label: "ARPU (契約単価)", value: fmt(report.arpu), sub: "稼働契約1件あたり月次収益" },
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
      sub: `粗利率 ${report.grossMarginPct.toFixed(0)}% (直近3ヶ月)`,
    },
  ];

  return (
    <div>
      <PageHeader
        title="経営分析"
        description={`SaaS経営指標とユニットエコノミクス (${base}換算)`}
        actions={
          status.isPro ? (
            admin && org.stripeCustomerId ? (
              <form action={openBillingPortal}>
                <button type="submit" className={btnSecondary}>
                  サブスクリプション管理
                </button>
              </form>
            ) : undefined
          ) : admin ? (
            <form action={startProCheckout}>
              <button type="submit" className={btnPrimary}>
                Pro に登録 (月額 ¥{PRO_PRICE_JPY})
              </button>
            </form>
          ) : undefined
        }
      />

      {sp.upgraded === "1" && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          🎉 Pro プランへの登録が完了しました。ありがとうございます!
        </div>
      )}
      {sp.billing === "unconfigured" && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          決済設定が未完了です (STRIPE_SECRET_KEY / STRIPE_PRICE_ID_PRO を設定してください)。
        </div>
      )}
      {status.inTrial && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            ⏳ 無料トライアル中 — 残り <strong>{status.trialDaysLeft}日</strong> (
            {TRIAL_DAYS}日間)。終了後は Pro プラン (月額 ¥{PRO_PRICE_JPY}) が必要です。
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

      {/* 指標タイル */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-5">
            <p className="text-xs font-medium text-slate-500">{t.label}</p>
            <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{t.value}</p>
            <p className={`mt-1 text-xs ${t.subCls ?? "text-slate-400"}`}>{t.sub}</p>
          </Card>
        ))}
      </div>

      {/* 売上・費用・利益 */}
      <Card className="mb-6 p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">売上・費用・利益の推移</h2>
        <PnlChart data={chartData} baseCurrency={base} />
      </Card>

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

      {/* 外注費 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-1 text-sm font-semibold text-slate-800">外注費の推移</h2>
          <p className="mb-4 text-xs text-slate-400">
            対象カテゴリ: {report.outsourcingCategoryNames.join("・") || "「外注」を含む経費カテゴリ (自動判定)"}
          </p>
          <OutsourcingChart data={chartData} baseCurrency={base} limit={report.outsourcingLimit} />
        </Card>

        {/* 設定 */}
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
    </div>
  );
}
