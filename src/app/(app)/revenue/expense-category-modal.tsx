"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createExpenseCategory,
  renameExpenseCategory,
  deleteExpenseCategory,
} from "@/app/actions/settings";

// 月次表の経費セクションから開く、経費カテゴリの編集ポップアップ。
// 追加・改名・削除に対応し、サーバーアクションが /revenue を再検証するので一覧に即反映される。
export function ExpenseCategoryModal({ categories }: { categories: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

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
        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
      >
        カテゴリを編集
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="my-8 w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">経費カテゴリの編集</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="閉じる"
                className="-mr-1 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 px-5 py-4">
              {categories.length === 0 && (
                <p className="text-sm text-slate-400">カテゴリがありません。下から追加してください。</p>
              )}
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2">
                  <form action={renameExpenseCategory} className="flex flex-1 items-center gap-2">
                    <input type="hidden" name="id" value={cat.id} />
                    <input
                      name="name"
                      defaultValue={cat.name}
                      className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-akane-500 focus:outline-none focus:ring-2 focus:ring-akane-100"
                    />
                    <button type="submit" className="text-xs font-medium text-akane-600 hover:underline">
                      保存
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm(`「${cat.name}」を削除しますか？入力済みの経費データも削除されます。`)) return;
                      startTransition(() => deleteExpenseCategory(cat.id));
                    }}
                    className="text-xs text-slate-400 hover:text-rose-500"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>

            <form
              action={createExpenseCategory}
              className="flex items-center gap-2 border-t border-slate-100 px-5 py-4"
            >
              <input
                name="name"
                required
                placeholder="新しいカテゴリ名"
                className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-akane-500 focus:outline-none focus:ring-2 focus:ring-akane-100"
              />
              <button
                type="submit"
                className="rounded-lg bg-akane-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-akane-700"
              >
                ＋ 追加
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
