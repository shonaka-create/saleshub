"use client";

import { useEffect, useState } from "react";
import { cancelBasePlan } from "@/app/actions/base-billing";

// 解約アンケートをポップアップ (モーダル) で表示する。
// タブ本体には要約と「解約する」ボタンだけを置き、押すとこのダイアログが開く。
// 送信先はサーバーアクション cancelBasePlan (構造化保存 + Stripe キャンセル)。
// 必須項目 (理由・確認チェック) はブラウザのネイティブ検証で担保する。

export function CancelDialog({
  reasons,
  improvements,
}: {
  reasons: string[];
  improvements: string[];
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // モーダル表示中は背面スクロールを止め、Esc で閉じられるようにする
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3.5 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
      >
        解約する
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="my-8 w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">解約の前に教えてください</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  入力内容は今後のサービス改善のためだけに利用します
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="閉じる"
                className="-mr-1 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form
              action={cancelBasePlan}
              onSubmit={() => setSubmitting(true)}
              className="space-y-6 px-6 py-5"
            >
              {/* 解約理由 (単一選択・必須) */}
              <fieldset>
                <legend className="text-sm font-medium text-slate-700">
                  解約の主な理由を教えてください
                </legend>
                <div className="mt-2 space-y-1.5">
                  {reasons.map((r) => (
                    <label key={r} className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="radio" name="reason" value={r} required className="accent-akane-600" />
                      {r}
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* 改善してほしい点 (複数選択) */}
              <fieldset>
                <legend className="text-sm font-medium text-slate-700">
                  どこが改善されれば、また使ってみたいですか？ (複数選択可)
                </legend>
                <div className="mt-2 space-y-1.5">
                  {improvements.map((r) => (
                    <label key={r} className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" name="improvement" value={r} className="accent-akane-600" />
                      {r}
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* 自由記述 */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  具体的にどんな点を改善すべきか、ぜひ教えてください (任意)
                </label>
                <textarea
                  name="detail"
                  rows={4}
                  placeholder="例: 〇〇の入力が手間だった / 〇〇と連携したい / 料金は月◯円なら続けたい など"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-akane-500 focus:outline-none focus:ring-2 focus:ring-akane-100"
                />
              </div>

              {/* 確認 (必須) */}
              <label className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-800">
                <input type="checkbox" name="confirm" value="on" required className="mt-0.5 h-4 w-4 accent-rose-600" />
                <span>
                  解約すると以降の課金は停止し、無料期間の残りに関わらずシステムのご利用ができなくなることを理解しました
                  (データは保存され、再登録で復帰できます)。
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                  className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  やめる
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3.5 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  {submitting ? "送信中…" : "アンケートを送信して解約する"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
