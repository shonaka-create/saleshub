"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";

// チェックポイント (送付済・締結済・必要項目OK 等) を1クリックでオン・オフする共通チェックボックス。
// 各ページから対象フィールドに .bind した Server Action を渡して使う。
export function ToggleCheck({
  initial,
  action,
  label,
}: {
  initial: boolean;
  action: (on: boolean) => Promise<void> | void;
  label: ReactNode;
}) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();

  return (
    <label
      className={`flex cursor-pointer items-center gap-2 text-sm ${pending ? "opacity-60" : ""}`}
    >
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => {
          const next = e.target.checked;
          setOn(next);
          start(() => {
            action(next);
          });
        }}
        className="h-4 w-4 rounded border-slate-300 accent-akane-600"
      />
      <span className={on ? "font-medium text-slate-800" : "text-slate-500"}>{label}</span>
    </label>
  );
}
