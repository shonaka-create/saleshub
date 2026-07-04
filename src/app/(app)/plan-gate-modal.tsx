"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// 無料期間が終了して未課金の組織に出す、利用をブロックするポップアップ。
// (app) レイアウトが hasAccess=false のときに本コンポーネントのみを表示する
// (アプリ本体はレンダリングしない = データも描画されない)。
export function PlanExpiredModal({
  orgName,
  monthlyLabel,
  admin,
}: {
  orgName: string;
  monthlyLabel: string;
  admin: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xl">
        <p className="text-4xl">🔒</p>
        <h1 className="mt-3 text-lg font-bold text-slate-900">無料期間が終了しました</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          「{orgName}」の無料期間が終了しました。Saleshub のご利用を続けるには、基本プラン
          ({monthlyLabel}) への登録が必要です。
          <br />
          <span className="text-xs text-slate-400">データはそのまま保存されています。</span>
        </p>
        {admin ? (
          <Link
            href="/billing"
            className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-akane-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-akane-700"
          >
            プランを確認して登録する →
          </Link>
        ) : (
          <p className="mt-6 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            登録には管理者権限が必要です。組織のオーナーにご依頼ください。
          </p>
        )}
        <div className="mt-4 text-xs text-slate-400">
          <Link href="/billing" className="hover:underline">
            プランの詳細・ログアウトはこちら
          </Link>
        </div>
      </div>
    </div>
  );
}

// 無料期間の残りが少ないとき (既定7日以内) に1回だけ出す、課金を促すポップアップ。
// 閉じられる (sessionStorage で当該セッション中は再表示しない)。
export function FreePeriodEndingModal({
  daysLeft,
  monthlyLabel,
  admin,
}: {
  daysLeft: number;
  monthlyLabel: string;
  admin: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const key = "saleshub_free_ending_dismissed";
    if (typeof window !== "undefined" && !window.sessionStorage.getItem(key)) {
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  const dismiss = () => {
    try {
      window.sessionStorage.setItem("saleshub_free_ending_dismissed", "1");
    } catch {
      /* noop */
    }
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-7 shadow-2xl">
        <p className="text-3xl">⏳</p>
        <h2 className="mt-3 text-base font-bold text-slate-900">
          無料期間の残りが {daysLeft} 日です
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          期間終了後もそのままご利用いただくには、基本プラン ({monthlyLabel}) への登録が必要です。
          今登録しても、請求は無料期間の終了後 (Stripe の課金開始日) から始まります。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {admin && (
            <Link
              href="/billing"
              className="inline-flex items-center gap-1.5 rounded-lg bg-akane-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-akane-700"
              onClick={dismiss}
            >
              プランを確認する
            </Link>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            あとで
          </button>
        </div>
      </div>
    </div>
  );
}
