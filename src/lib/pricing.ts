// ===== サービス料金設計 (基本プラン) =====
// - 基本プラン: 初月無料、以降 月額500円 (★1メンバーあたり = 席課金)
// - 早期登録特典: 2026-07-31 (JST) までに登録した組織は3ヶ月無料 (= 早期登録なら実質¥0)
// - Pro プラン (経営分析): 別途 月額490円 / 人 (lib/plan.ts)
// - 課金額は「単価 × 組織のメンバー数」。メンバーを増やすとオーナーへの請求が加算される。
// クライアント/サーバー両方から import できるよう純粋関数のみ置く。

export const BASE_PRICE_JPY = 500; // 1メンバーあたりの月額 (席課金)

// 席数 (課金対象メンバー数)。最低1席。
export function seatCount(members: number): number {
  return Math.max(1, members);
}

// 単価 × 席数 の月額合計を返す (基本プラン / Pro 共通で使える)。
export function seatTotal(unitPrice: number, members: number): number {
  return unitPrice * seatCount(members);
}

export const EARLY_BIRD_DEADLINE = new Date("2026-07-31T23:59:59+09:00");
export const EARLY_BIRD_FREE_MONTHS = 3;
export const NORMAL_FREE_MONTHS = 1;

export function isEarlyBird(at: Date = new Date()): boolean {
  return at.getTime() <= EARLY_BIRD_DEADLINE.getTime();
}

// 登録日時から無料期間の終了日時を確定する (登録時に一度だけ計算して保存)
export function computeFreeUntil(registeredAt: Date): { freeUntil: Date; earlyBird: boolean } {
  const earlyBird = isEarlyBird(registeredAt);
  const months = earlyBird ? EARLY_BIRD_FREE_MONTHS : NORMAL_FREE_MONTHS;
  const freeUntil = new Date(registeredAt);
  freeUntil.setUTCMonth(freeUntil.getUTCMonth() + months);
  return { freeUntil, earlyBird };
}

export type BaseStatus = {
  subscribed: boolean; // 基本プラン課金中
  canceled: boolean; // 一度課金して解約した
  inFreePeriod: boolean;
  freeUntil: Date | null;
  freeDaysLeft: number; // 無料期間の残り日数 (期間外は 0)
  earlyBird: boolean; // 早期登録特典 (3ヶ月無料) 対象
  hasAccess: boolean; // システムを利用してよいか
};

export function baseStatus(
  org: { basePlanStatus: string; freeUntil: Date | null; earlyBird?: boolean },
  now: number = Date.now()
): BaseStatus {
  const subscribed = org.basePlanStatus === "ACTIVE";
  const canceled = org.basePlanStatus === "CANCELED";
  const earlyBird = org.earlyBird ?? false;
  // freeUntil 未設定は移行前の既存組織。ロックアウトを避けるため無期限扱いにする
  // (scripts/backfill-base-plan.ts で登録日から再計算して埋める)。
  if (org.freeUntil == null) {
    return {
      subscribed,
      canceled,
      inFreePeriod: !subscribed,
      freeUntil: null,
      freeDaysLeft: 0,
      earlyBird,
      hasAccess: true,
    };
  }
  const inFreePeriod = org.freeUntil.getTime() > now;
  const freeDaysLeft = inFreePeriod
    ? Math.max(1, Math.ceil((org.freeUntil.getTime() - now) / 86400000))
    : 0;
  return {
    subscribed,
    canceled,
    inFreePeriod,
    freeUntil: org.freeUntil,
    freeDaysLeft,
    earlyBird,
    hasAccess: subscribed || inFreePeriod,
  };
}
