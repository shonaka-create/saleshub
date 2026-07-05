"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 基本プラン無料期間の案内バナー。全ページ共通レイアウトから描画するが、
// Pro トライアルの独自バナーを持つ経営数値分析ページ (/dashboard) では
// 二重表示になり紛らわしいため非表示にする。
export function FreePeriodBanner({
  earlyBird,
  freeUntilLabel,
  freeDaysLeft,
  monthlyLabel,
}: {
  earlyBird: boolean;
  freeUntilLabel: string;
  freeDaysLeft: number;
  monthlyLabel: string;
}) {
  const pathname = usePathname();
  // Pro トライアルバナーと重複するページでは出さない。
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-akane-200 bg-akane-50 px-4 py-2.5">
      <p className="text-sm text-akane-800">
        {earlyBird ? "🎉 早期登録特典 (3ヶ月無料) " : "初月無料 "}
        — {freeUntilLabel}まで無料 (残り {freeDaysLeft}日)。以降は{monthlyLabel} です。
      </p>
      <Link href="/billing" className="text-sm font-semibold text-akane-700 hover:underline">
        プランの確認・登録 →
      </Link>
    </div>
  );
}
