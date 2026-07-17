"use client";

// タスク管理 / WBS のインライン編集 (Notion 風)。
// 変更のたびに bind 済みの Server Action を呼び、サーバー側の revalidate で再描画する。

import { useState, useTransition } from "react";

type Action = (value: string) => Promise<void>;

export function InlineSelect({
  value,
  options,
  action,
  emptyLabel,
  className = "",
}: {
  value: string;
  options: { value: string; label: string }[];
  action: Action;
  emptyLabel?: string; // 指定時は先頭に「未設定」用の空オプションを出す
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => startTransition(() => action(e.target.value))}
      className={`cursor-pointer rounded-md border border-transparent bg-transparent px-1.5 py-1 text-xs text-slate-700 transition hover:border-slate-200 hover:bg-slate-50 focus:border-akane-400 focus:outline-none disabled:opacity-50 ${className}`}
    >
      {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function InlineDate({
  value, // YYYY-MM-DD or ""
  action,
  className = "",
}: {
  value: string;
  action: Action;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <input
      type="date"
      defaultValue={value}
      disabled={pending}
      onChange={(e) => startTransition(() => action(e.target.value))}
      className={`cursor-pointer rounded-md border border-transparent bg-transparent px-1.5 py-1 text-xs text-slate-700 transition hover:border-slate-200 hover:bg-slate-50 focus:border-akane-400 focus:outline-none disabled:opacity-50 ${className}`}
    />
  );
}

// 進捗率など数値のインライン編集。確定 (blur / Enter) 時のみ保存する。
export function InlineNumber({
  value,
  action,
  min = 0,
  max = 100,
  suffix,
  className = "",
}: {
  value: number;
  action: Action;
  min?: number;
  max?: number;
  suffix?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const [pending, startTransition] = useTransition();
  const commit = () => {
    if (draft === String(value)) return;
    startTransition(() => action(draft));
  };
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      <input
        type="number"
        value={draft}
        min={min}
        max={max}
        disabled={pending}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="w-14 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-right text-xs text-slate-700 transition hover:border-slate-200 hover:bg-slate-50 focus:border-akane-400 focus:outline-none disabled:opacity-50"
      />
      {suffix && <span className="text-xs text-slate-400">{suffix}</span>}
    </span>
  );
}
