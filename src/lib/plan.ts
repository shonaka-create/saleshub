import "server-only";
import { db } from "./db";
import { isCurrentUserSystemAdmin } from "./auth";

// Pro プラン (経営数値分析・テンプレート) のアクセス制御。
// - PRO: Stripe サブスクリプション契約中 (trialing 含む — webhook が plan/trialEndsAt を同期)
// - トライアルは Stripe Checkout でカード登録 + 継続課金への同意を得てから開始する
//   (trial_period_days=14)。トライアル中に解約すれば Stripe 側で一切課金されない。
// - trialEndsAt != null はトライアル消費済みの印としても使う (1組織1回のみ)

export const TRIAL_DAYS = 14;
export const PRO_PRICE_JPY = 490; // 1メンバーあたりの月額 (席課金)
// MAX Pro: 壁打ちCOO (専属COOチャット + 週1回の管理者カスタマイズ)。現在は Coming Soon で課金導線なし。
export const MAX_PRO_PRICE_JPY = 3000;
// TEAM プラン (¥3,000/mo): 契約後の書類・経費ワークフロー一式 (請求書管理・契約書管理・委託費管理) +
// 将来のチーム版壁打ちCOO (共同利用)。/team 配下にまとめて配置。現状は MAX と同じく Coming Soon で課金導線なし。
// 課金を実装する際は Organization.plan/stripeSubscriptionId (Pro) と同型の
// teamPlanStatus/stripeTeamSubscriptionId を追加する想定。
export const TEAM_PRICE_JPY = 3000;

export type PlanStatus = {
  isPro: boolean;
  inTrial: boolean; // Stripe トライアル中 or 旧アプリ内トライアル中
  stripeTrialing: boolean; // Stripe トライアル中 (カード登録済み、終了後は自動課金)
  legacyTrial: boolean; // 旧アプリ内トライアル (カード未登録) — 移行前の組織の救済
  trialEndsAt: Date | null;
  trialDaysLeft: number; // トライアル中のみ >0
  hasAccess: boolean; // Pro 機能を表示してよいか
  trialAvailable: boolean; // まだトライアルを開始していない
};

export function planStatus(org: { plan: string; trialEndsAt: Date | null }): PlanStatus {
  const isPro = org.plan === "PRO";
  const now = Date.now();
  const trialEndsAt = org.trialEndsAt;
  const trialActive = trialEndsAt != null && trialEndsAt.getTime() > now;
  const stripeTrialing = isPro && trialActive;
  const legacyTrial = !isPro && trialActive;
  const inTrial = stripeTrialing || legacyTrial;
  const trialDaysLeft = inTrial
    ? Math.max(1, Math.ceil((trialEndsAt!.getTime() - now) / (24 * 60 * 60 * 1000)))
    : 0;
  return {
    isPro,
    inTrial,
    stripeTrialing,
    legacyTrial,
    trialEndsAt,
    trialDaysLeft,
    hasAccess: isPro || legacyTrial,
    trialAvailable: !isPro && trialEndsAt == null,
  };
}

// Pro 機能のサーバー側ガード (テンプレートのアップロード/ダウンロード等から呼ぶ)。
// UI のゲートだけでなく、Server Action / Route Handler 直叩きでも Pro 以外を拒否する。
export async function requireProAccess(orgId: string): Promise<void> {
  // サービス運営者 (isSystemAdmin) は課金状態に関わらず全機能を解放する
  if (await isCurrentUserSystemAdmin()) return;
  const org = await db.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: { plan: true, trialEndsAt: true },
  });
  if (!planStatus(org).hasAccess) {
    throw new Error("この機能は Pro プラン (または無料トライアル) でご利用いただけます");
  }
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
