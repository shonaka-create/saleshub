import "server-only";
import { db } from "./db";
import { parseFxRates, toBase } from "./currency";
import { monthKey, monthRange } from "./months";
import { MONTHLY_VALUE_TYPES } from "./constants";

export type ServiceRow = {
  serviceId: string;
  name: string;
  color: string;
  category: string;
  // 月キー → { auto, override, effective }
  cells: Record<string, { auto: number; override: number | null; effective: number }>;
  total: number;
};

export type ManualRow = {
  label: string;
  cells: Record<string, number>;
  total: number;
};

export type ExpenseRow = {
  categoryId: string;
  name: string;
  cells: Record<string, number>;
  total: number;
};

export type ContractMetrics = {
  serviceId: string;
  name: string;
  color: string;
  active: Record<string, number>; // 月末時点の稼働契約数
  new: Record<string, number>;
  churn: Record<string, number>;
};

export type RevenueReport = {
  months: string[];
  baseCurrency: string;
  serviceRows: ServiceRow[];
  manualRows: ManualRow[];
  expenseRows: ExpenseRow[];
  revenueTotal: Record<string, number>;
  expenseTotal: Record<string, number>;
  profit: Record<string, number>;
  cumulativeProfit: Record<string, number>;
  mrr: Record<string, number>; // 月次経常収益 (初期費用を除く)
  metrics: ContractMetrics[];
};

// 契約データ + 手入力データから月次売上レポートを組み立てる (金額はすべて基準通貨換算)
export async function buildRevenueReport(orgId: string, from: string, to: string): Promise<RevenueReport> {
  const months = monthRange(from, to);
  const [org, services, contracts, values, expenseCategories] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: orgId } }),
    db.service.findMany({ where: { orgId, archived: false }, orderBy: { sortOrder: "asc" } }),
    db.contract.findMany({ where: { orgId } }),
    db.monthlyValue.findMany({ where: { orgId, month: { gte: from, lte: to } } }),
    db.expenseCategory.findMany({ where: { orgId }, orderBy: { sortOrder: "asc" } }),
  ]);
  const rates = parseFxRates(org.fxRates);
  const base = org.baseCurrency;

  // --- 契約からの自動計算 ---
  const autoByService: Record<string, Record<string, number>> = {};
  const mrrByMonth: Record<string, number> = Object.fromEntries(months.map((m) => [m, 0]));
  const metricsByService: Record<string, ContractMetrics> = {};
  for (const s of services) {
    autoByService[s.id] = Object.fromEntries(months.map((m) => [m, 0]));
    metricsByService[s.id] = {
      serviceId: s.id,
      name: s.name,
      color: s.color,
      active: Object.fromEntries(months.map((m) => [m, 0])),
      new: Object.fromEntries(months.map((m) => [m, 0])),
      churn: Object.fromEntries(months.map((m) => [m, 0])),
    };
  }

  for (const c of contracts) {
    if (!autoByService[c.serviceId]) continue; // アーカイブ済みサービス
    const startKey = monthKey(c.startDate);
    const endKey = c.endDate ? monthKey(c.endDate) : null;
    const initial = toBase(c.initialFee, c.currency, base, rates);
    const monthly = toBase(c.monthlyFee, c.currency, base, rates);
    for (const m of months) {
      const started = m >= startKey;
      const notEnded = !endKey || m <= endKey;
      if (m === startKey) {
        autoByService[c.serviceId][m] += initial;
        metricsByService[c.serviceId].new[m]++;
      }
      if (started && notEnded) {
        autoByService[c.serviceId][m] += monthly;
        mrrByMonth[m] += monthly;
        metricsByService[c.serviceId].active[m]++;
      }
      if (endKey && m === endKey) {
        metricsByService[c.serviceId].churn[m]++;
      }
    }
  }

  // --- 手入力値 ---
  const overrides = new Map<string, number>(); // `${serviceId}:${month}` → amount
  const manualMap = new Map<string, Record<string, number>>(); // label → month → amount
  const expenseMap = new Map<string, Record<string, number>>(); // categoryId → month → amount
  for (const v of values) {
    if (v.type === MONTHLY_VALUE_TYPES.REVENUE_OVERRIDE && v.serviceId) {
      overrides.set(`${v.serviceId}:${v.month}`, v.amount);
    } else if (v.type === MONTHLY_VALUE_TYPES.REVENUE_MANUAL && v.label) {
      const row = manualMap.get(v.label) ?? {};
      row[v.month] = (row[v.month] ?? 0) + v.amount;
      manualMap.set(v.label, row);
    } else if (v.type === MONTHLY_VALUE_TYPES.EXPENSE && v.expenseCategoryId) {
      const row = expenseMap.get(v.expenseCategoryId) ?? {};
      row[v.month] = (row[v.month] ?? 0) + v.amount;
      expenseMap.set(v.expenseCategoryId, row);
    }
  }

  // --- 行の組み立て ---
  const serviceRows: ServiceRow[] = services.map((s) => {
    const cells: ServiceRow["cells"] = {};
    let total = 0;
    for (const m of months) {
      const auto = autoByService[s.id][m];
      const override = overrides.get(`${s.id}:${m}`) ?? null;
      const effective = override ?? auto;
      cells[m] = { auto, override, effective };
      total += effective;
    }
    return { serviceId: s.id, name: s.name, color: s.color, category: s.category, cells, total };
  });

  const manualRows: ManualRow[] = [...manualMap.entries()].map(([label, byMonth]) => {
    const cells: Record<string, number> = {};
    let total = 0;
    for (const m of months) {
      cells[m] = byMonth[m] ?? 0;
      total += cells[m];
    }
    return { label, cells, total };
  });

  const expenseRows: ExpenseRow[] = expenseCategories.map((cat) => {
    const byMonth = expenseMap.get(cat.id) ?? {};
    const cells: Record<string, number> = {};
    let total = 0;
    for (const m of months) {
      cells[m] = byMonth[m] ?? 0;
      total += cells[m];
    }
    return { categoryId: cat.id, name: cat.name, cells, total };
  });

  const revenueTotal: Record<string, number> = {};
  const expenseTotal: Record<string, number> = {};
  const profit: Record<string, number> = {};
  const cumulativeProfit: Record<string, number> = {};
  let cum = 0;
  for (const m of months) {
    revenueTotal[m] =
      serviceRows.reduce((sum, r) => sum + r.cells[m].effective, 0) +
      manualRows.reduce((sum, r) => sum + r.cells[m], 0);
    expenseTotal[m] = expenseRows.reduce((sum, r) => sum + r.cells[m], 0);
    profit[m] = revenueTotal[m] - expenseTotal[m];
    cum += profit[m];
    cumulativeProfit[m] = cum;
  }

  return {
    months,
    baseCurrency: base,
    serviceRows,
    manualRows,
    expenseRows,
    revenueTotal,
    expenseTotal,
    profit,
    cumulativeProfit,
    mrr: mrrByMonth,
    metrics: Object.values(metricsByService),
  };
}
