import "server-only";
import { db } from "./db";

// Pro プラン (経営分析) のアクセス制御。
// - PRO: Stripe サブスクリプション契約中
// - FREE + トライアル: 経営分析への初回アクセスから14日間は無料で全機能を利用可能

export const TRIAL_DAYS = 14;
export const PRO_PRICE_JPY = 490;
// MAX Pro: 相談君 (専属COOチャット + 週1回の管理者カスタマイズ)。現在は Coming Soon で課金導線なし。
export const MAX_PRO_PRICE_JPY = 3000;

export type PlanStatus = {
  isPro: boolean;
  inTrial: boolean;
  trialEndsAt: Date | null;
  trialDaysLeft: number; // トライアル中のみ >0
  hasAccess: boolean; // Pro 機能を表示してよいか
  trialAvailable: boolean; // まだトライアルを開始していない
};

export function planStatus(org: { plan: string; trialEndsAt: Date | null }): PlanStatus {
  const isPro = org.plan === "PRO";
  const now = Date.now();
  const trialEndsAt = org.trialEndsAt;
  const inTrial = !isPro && trialEndsAt != null && trialEndsAt.getTime() > now;
  const trialDaysLeft = inTrial
    ? Math.max(1, Math.ceil((trialEndsAt!.getTime() - now) / (24 * 60 * 60 * 1000)))
    : 0;
  return {
    isPro,
    inTrial,
    trialEndsAt,
    trialDaysLeft,
    hasAccess: isPro || inTrial,
    trialAvailable: !isPro && trialEndsAt == null,
  };
}

// 経営分析への初回アクセス時にトライアルを開始する (既に開始済みなら何もしない)
export async function startTrial(orgId: string): Promise<Date> {
  const endsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  await db.organization.updateMany({
    where: { id: orgId, trialEndsAt: null, plan: "FREE" },
    data: { trialEndsAt: endsAt },
  });
  const org = await db.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: { trialEndsAt: true },
  });
  return org.trialEndsAt ?? endsAt;
}

// 経営分析の設定 (organization.settings JSON の "insights" キー)
export type InsightsSettings = {
  marketingCategoryIds: string[]; // CAC 計算に使う経費カテゴリ (空なら名前で自動判定)
  outsourcingCategoryIds: string[]; // 外注費アラート対象カテゴリ (空なら名前で自動判定)
  outsourcingLimit: number | null; // 外注費の月次上限 (基準通貨) — 超過でアラート
};

export function parseInsightsSettings(settingsJson: string): InsightsSettings {
  try {
    const parsed = JSON.parse(settingsJson);
    const s = parsed?.insights ?? {};
    return {
      marketingCategoryIds: Array.isArray(s.marketingCategoryIds) ? s.marketingCategoryIds : [],
      outsourcingCategoryIds: Array.isArray(s.outsourcingCategoryIds)
        ? s.outsourcingCategoryIds
        : [],
      outsourcingLimit:
        typeof s.outsourcingLimit === "number" && Number.isFinite(s.outsourcingLimit)
          ? s.outsourcingLimit
          : null,
    };
  } catch {
    return { marketingCategoryIds: [], outsourcingCategoryIds: [], outsourcingLimit: null };
  }
}
