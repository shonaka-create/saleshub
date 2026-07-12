"use client";

import { Children, useState, type ReactNode } from "react";

// 件数が多いリストを最初は数件だけ表示し、ボタンで残りを展開するラッパー。
// 子要素は li を想定 (サーバーコンポーネントから渡してよい)。
export function ShowMoreList({
  children,
  initialCount = 5,
}: {
  children: ReactNode;
  initialCount?: number;
}) {
  const items = Children.toArray(children);
  const [showAll, setShowAll] = useState(false);
  const hiddenCount = items.length - initialCount;

  return (
    <>
      <ul className="space-y-4">{showAll ? items : items.slice(0, initialCount)}</ul>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-4 w-full rounded-lg border border-slate-200 bg-white py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
        >
          {showAll ? "表示を減らす ▲" : `残りの${hiddenCount}件を表示 ▼`}
        </button>
      )}
    </>
  );
}
