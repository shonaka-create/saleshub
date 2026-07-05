import "server-only";
import { buildRevenueReport, type RevenueReport } from "./revenue";
import { addMonths, currentMonthKey } from "./months";
import { parseInsightsSettings, type InsightsSettings } from "./plan";
import { formatMoney } from "./currency";

// ===== 経営分析 (Pro) =====
// 契約・売上データから Web制作フリーランス / 小規模制作会社向けの
// SaaS 経営指標 (MRR / 解約率 / LTV / CAC / ユニットエコノミクス) を計算する。

export type InsightsAlert = {
  severity: "warning" | "danger";
  month: string;
  title: string;
  detail: string;
};

export type InsightsReport = {
  months: string[];
  baseCurrency: string;

  // 月次系列 (グラフ用)
  revenue: Record<string, number>;
  expense: Record<string, number>;
  profit: Record<string, number>;
  cumulativeProfit: Record<string, number>;
  mrr: Record<string, number>;
  // ダッシュボード統合用: サービス別売上の内訳行 (売上管理と同じ計算結果)
  serviceRows: RevenueReport["serviceRows"];
  manualRows: RevenueReport["manualRows"];
  activeContracts: Record<string, number>;
  newContracts: Record<string, number>;
  churnedContracts: Record<string, number>;
  churnRate: Record<string, number>; // % (前月稼働数に対する当月解約数)
  outsourcingCost: Record<string, number>;

  // ヘッドライン指標 (直近値・直近3ヶ月平均)
  mrrNow: number;
  mrrGrowthPct: number | null; // 前月比 %
  arr: number;
  arpu: number; // 稼働契約1件あたり月次収益
  avgChurnRatePct: number; // 直近3ヶ月平均 %
  ltv: number | null; // ARPU × 平均継続月数 (解約0なら null = 算出不能)
  avgLifetimeMonths: number | null;
  cac: number | null; // マーケ経費 ÷ 新規契約数 (直近6ヶ月)
  ltvCacRatio: number | null;
  cacPaybackMonths: number | null;
  grossMarginPct: number; // 直近3ヶ月の (売上-費用)/売上

  // 外注費
  outsourcingLimit: number | null;
  outsourcingCategoryNames: string[];
  marketingCategoryNames: string[];
  alerts: InsightsAlert[];

  settings: InsightsSettings;
  expenseCategories: { id: string; name: string }[];
};

function last<T>(months: string[], series: Record<string, T>): T {
  return series[months[months.length - 1]];
}

function avgLastN(months: string[], series: Record<string, number>, n: number): number {
  const slice = months.slice(-n);
  if (slice.length === 0) return 0;
  return slice.reduce((s, m) => s + (series[m] ?? 0), 0) / slice.length;
}

export async function buildInsightsReport(
  orgId: string,
  settingsJson: string
): Promise<InsightsReport> {
  const now = currentMonthKey();
  const from = addMonths(now, -11);
  const report = await buildRevenueReport(orgId, from, now);
  const months = report.months;
  const settings = parseInsightsSettings(settingsJson);

  // --- 契約数の集計 (全サービス合算) ---
  const activeContracts: Record<string, number> = {};
  const newContracts: Record<string, number> = {};
  const churnedContracts: Record<string, number> = {};
  for (const m of months) {
    activeContracts[m] = report.metrics.reduce((s, x) => s + x.active[m], 0);
    newContracts[m] = report.metrics.reduce((s, x) => s + x.new[m], 0);
    churnedContracts[m] = report.metrics.reduce((s, x) => s + x.churn[m], 0);
  }

  // --- 解約率: 当月解約数 ÷ 前月末稼働数 ---
  const churnRate: Record<string, number> = {};
  months.forEach((m, i) => {
    const prevActive = i > 0 ? activeContracts[months[i - 1]] : 0;
    churnRate[m] = prevActive > 0 ? (churnedContracts[m] / prevActive) * 100 : 0;
  });

  // --- 経費カテゴリの分類 (設定があれば設定を、なければ名前で自動判定) ---
  const isMarketing = (row: { categoryId: string; name: string }) =>
    settings.marketingCategoryIds.length > 0
      ? settings.marketingCategoryIds.includes(row.categoryId)
      : /広告|マーケ|宣伝/.test(row.name);
  const isOutsourcing = (row: { categoryId: string; name: string }) =>
    settings.outsourcingCategoryIds.length > 0
      ? settings.outsourcingCategoryIds.includes(row.categoryId)
      : /外注|業務委託/.test(row.name);

  const marketingRows = report.expenseRows.filter(isMarketing);
  const outsourcingRows = report.expenseRows.filter(isOutsourcing);

  const outsourcingCost: Record<string, number> = {};
  for (const m of months) {
    outsourcingCost[m] = outsourcingRows.reduce((s, r) => s + (r.cells[m] ?? 0), 0);
  }

  // --- ヘッドライン指標 ---
  const mrrNow = last(months, report.mrr) ?? 0;
  const mrrPrev = months.length >= 2 ? report.mrr[months[months.length - 2]] ?? 0 : 0;
  const mrrGrowthPct = mrrPrev > 0 ? ((mrrNow - mrrPrev) / mrrPrev) * 100 : null;
  const activeNow = last(months, activeContracts) ?? 0;
  const arpu = activeNow > 0 ? mrrNow / activeNow : 0;

  const avgChurnRatePct = avgLastN(months, churnRate, 3);

  // LTV = ARPU × 平均継続月数 (1/月次解約率)。解約実績ゼロなら算出不能。
  let avgLifetimeMonths: number | null = null;
  let ltv: number | null = null;
  if (avgChurnRatePct > 0) {
    avgLifetimeMonths = Math.min(100 / avgChurnRatePct, 60); // 60ヶ月で頭打ち (過大評価防止)
    ltv = arpu * avgLifetimeMonths;
  }

  // CAC = 直近6ヶ月のマーケティング経費 ÷ 同期間の新規契約数
  const cacWindow = months.slice(-6);
  const marketingSpend = cacWindow.reduce(
    (s, m) => s + marketingRows.reduce((x, r) => x + (r.cells[m] ?? 0), 0),
    0
  );
  const newInWindow = cacWindow.reduce((s, m) => s + newContracts[m], 0);
  const cac = newInWindow > 0 && marketingSpend > 0 ? marketingSpend / newInWindow : null;
  const ltvCacRatio = ltv != null && cac != null && cac > 0 ? ltv / cac : null;
  const cacPaybackMonths = cac != null && arpu > 0 ? cac / arpu : null;

  const rev3 = avgLastN(months, report.revenueTotal, 3);
  const exp3 = avgLastN(months, report.expenseTotal, 3);
  const grossMarginPct = rev3 > 0 ? ((rev3 - exp3) / rev3) * 100 : 0;

  // --- アラート: 外注費の上限超過 + 急増検知 ---
  // 急増判定は「直前3ヶ月平均がある程度の規模」かつ「当月が確定済み」の場合のみ行う。
  // 平均がほぼ0だと少額でも数百倍と表示され、入力ミスでない正常値を誤検知するため下限を設ける。
  const OUTSOURCING_SPIKE_FLOOR = 30000; // これ未満の規模 (baseCurrency の額) では急増判定しない
  const thisMonth = currentMonthKey();
  const alerts: InsightsAlert[] = [];
  for (let i = 0; i < months.length; i++) {
    const m = months[i];
    const cost = outsourcingCost[m];

    // ① 上限超過: 進行中の月でも既に超えていれば通知する (予算オーバーは早く気づきたい)
    const limit = settings.outsourcingLimit;
    const overLimit = limit != null && limit > 0 && cost > limit;
    if (overLimit) {
      alerts.push({
        severity: "danger",
        month: m,
        title: "外注費が設定上限を超過",
        detail: `上限 ${formatMoney(limit, report.baseCurrency)} に対し ${formatMoney(cost, report.baseCurrency)} (${(cost / limit).toFixed(1)}倍) です`,
      });
    }

    // ② 急増検知: 直前3ヶ月平均の1.5倍超。ただし
    //   - 上限超過を通知済みの月は重複を避けてスキップ
    //   - 進行中の当月は部分データで倍率が歪むためスキップ
    //   - 平均・当月とも一定規模以上のときのみ (near-zero 起因の誤検知を防ぐ)
    if (i >= 3 && !overLimit && m !== thisMonth) {
      const prevAvg =
        (outsourcingCost[months[i - 1]] + outsourcingCost[months[i - 2]] + outsourcingCost[months[i - 3]]) / 3;
      if (prevAvg >= OUTSOURCING_SPIKE_FLOOR && cost >= OUTSOURCING_SPIKE_FLOOR && cost > prevAvg * 1.5) {
        alerts.push({
          severity: "warning",
          month: m,
          title: "外注費が急増 (入力ミスの可能性)",
          detail: `直前3ヶ月平均の ${(cost / prevAvg).toFixed(1)} 倍になっています`,
        });
      }
    }
  }
  alerts.sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0));

  return {
    months,
    baseCurrency: report.baseCurrency,
    revenue: report.revenueTotal,
    expense: report.expenseTotal,
    profit: report.profit,
    cumulativeProfit: report.cumulativeProfit,
    mrr: report.mrr,
    serviceRows: report.serviceRows,
    manualRows: report.manualRows,
    activeContracts,
    newContracts,
    churnedContracts,
    churnRate,
    outsourcingCost,
    mrrNow,
    mrrGrowthPct,
    arr: mrrNow * 12,
    arpu,
    avgChurnRatePct,
    ltv,
    avgLifetimeMonths,
    cac,
    ltvCacRatio,
    cacPaybackMonths,
    grossMarginPct,
    outsourcingLimit: settings.outsourcingLimit,
    outsourcingCategoryNames: outsourcingRows.map((r) => r.name),
    marketingCategoryNames: marketingRows.map((r) => r.name),
    alerts,
    settings,
    expenseCategories: report.expenseRows.map((r) => ({ id: r.categoryId, name: r.name })),
  };
}
