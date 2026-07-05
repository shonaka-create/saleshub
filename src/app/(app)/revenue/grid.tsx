"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { RevenueReport } from "@/lib/revenue";
import { formatMonthShort } from "@/lib/months";
import { saveOverride, saveManual, saveExpense, deleteManualRow } from "@/app/actions/revenue";
import { ExpenseCategoryModal } from "./expense-category-modal";

type CellTarget =
  | { kind: "service"; serviceId: string; month: string }
  | { kind: "manual"; serviceId: string | null; label: string; month: string }
  | { kind: "expense"; categoryId: string; month: string };

function cellKey(t: CellTarget): string {
  if (t.kind === "service") return `s:${t.serviceId}:${t.month}`;
  if (t.kind === "manual") return `m:${t.serviceId ?? ""}:${t.label}:${t.month}`;
  return `e:${t.categoryId}:${t.month}`;
}

function fmt(n: number): string {
  return n === 0 ? "–" : Math.round(n).toLocaleString("ja-JP");
}

export function RevenueGrid({ report }: { report: RevenueReport }) {
  const [state, setState] = useState(report);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [addingRow, setAddingRow] = useState(false);
  const [newServiceId, setNewServiceId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [, startTransition] = useTransition();

  // 経費カテゴリの編集 (追加・改名・削除) はポップアップからサーバーアクションで行われ、
  // /revenue の再検証で新しい report が渡ってくる。カテゴリ構成が変わったときだけ経費行を取り込む
  // (値のみの編集では発火しないので、入力中の他行やセルの状態を壊さない)。
  const categorySig = report.expenseRows.map((r) => `${r.categoryId}:${r.name}`).join("|");
  useEffect(() => {
    setState((prev) => ({ ...prev, expenseRows: report.expenseRows }));
    // report は categorySig 経由で参照しているため依存に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySig]);

  const { months } = state;
  // ポップアップには常に最新 (サーバー) のカテゴリ一覧を渡す。
  const expenseCategories = report.expenseRows.map((r) => ({ id: r.categoryId, name: r.name }));

  // --- 集計 (ローカル状態から再計算して編集を即時反映) ---
  const revenueTotal: Record<string, number> = {};
  const expenseTotal: Record<string, number> = {};
  const profit: Record<string, number> = {};
  const cumulative: Record<string, number> = {};
  let cum = 0;
  for (const m of months) {
    revenueTotal[m] =
      state.serviceRows.reduce((s, r) => s + r.cells[m].effective, 0) +
      state.manualRows.reduce((s, r) => s + (r.cells[m] ?? 0), 0);
    expenseTotal[m] = state.expenseRows.reduce((s, r) => s + (r.cells[m] ?? 0), 0);
    profit[m] = revenueTotal[m] - expenseTotal[m];
    cum += profit[m];
    cumulative[m] = cum;
  }

  function beginEdit(t: CellTarget, current: number | null) {
    setEditing(cellKey(t));
    setDraft(current === null || current === 0 ? "" : String(Math.round(current)));
  }

  function commit(t: CellTarget) {
    const raw = draft.trim().replace(/,/g, "");
    const num = raw === "" ? null : Number(raw);
    if (num !== null && !Number.isFinite(num)) {
      setEditing(null);
      return;
    }
    setState((prev) => {
      const next = structuredClone(prev);
      if (t.kind === "service") {
        const row = next.serviceRows.find((r) => r.serviceId === t.serviceId);
        if (row) {
          const cell = row.cells[t.month];
          cell.override = num;
          cell.effective = num ?? cell.auto;
          row.total = months.reduce((s, m) => s + row.cells[m].effective, 0);
        }
      } else if (t.kind === "manual") {
        const row = next.manualRows.find((r) => r.serviceId === t.serviceId && r.label === t.label);
        if (row) {
          row.cells[t.month] = num ?? 0;
          row.total = months.reduce((s, m) => s + (row.cells[m] ?? 0), 0);
        }
      } else {
        const row = next.expenseRows.find((r) => r.categoryId === t.categoryId);
        if (row) {
          row.cells[t.month] = num ?? 0;
          row.total = months.reduce((s, m) => s + (row.cells[m] ?? 0), 0);
        }
      }
      return next;
    });
    setEditing(null);
    startTransition(async () => {
      if (t.kind === "service") await saveOverride(t.month, t.serviceId, num);
      else if (t.kind === "manual") await saveManual(t.month, t.serviceId, t.label, num ?? 0);
      else await saveExpense(t.month, t.categoryId, num ?? 0);
    });
  }

  function beginAddRow() {
    setNewServiceId(state.serviceRows[0]?.serviceId ?? "");
    setNewLabel("");
    setAddingRow(true);
  }

  function confirmAddRow() {
    const service = state.serviceRows.find((r) => r.serviceId === newServiceId);
    if (!service) return;
    const label = newLabel.trim();
    if (state.manualRows.some((r) => r.serviceId === service.serviceId && r.label === label)) {
      setAddingRow(false);
      return;
    }
    setState((prev) => ({
      ...prev,
      manualRows: [
        ...prev.manualRows,
        {
          serviceId: service.serviceId,
          serviceName: service.name,
          serviceColor: service.color,
          label,
          cells: Object.fromEntries(months.map((m) => [m, 0])),
          total: 0,
        },
      ],
    }));
    setAddingRow(false);
  }

  function removeManualRow(row: RevenueReport["manualRows"][number]) {
    const name = row.label ? `${row.serviceName ?? "未分類"} - ${row.label}` : row.serviceName ?? "未分類";
    if (!window.confirm(`「${name}」行を削除しますか？入力済みの値も削除されます。`)) return;
    setState((prev) => ({
      ...prev,
      manualRows: prev.manualRows.filter((r) => !(r.serviceId === row.serviceId && r.label === row.label)),
    }));
    startTransition(async () => {
      await deleteManualRow(row.serviceId, row.label);
    });
  }

  function editableCell(t: CellTarget, value: number, opts?: { override?: boolean; auto?: number }) {
    const key = cellKey(t);
    if (editing === key) {
      return (
        <input
          autoFocus
          type="text"
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(t)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(t);
            if (e.key === "Escape") setEditing(null);
          }}
          className="w-full rounded border border-akane-400 bg-white px-1 py-0.5 text-right text-sm tabular focus:outline-none"
        />
      );
    }
    return (
      <button
        type="button"
        onClick={() => beginEdit(t, opts?.override !== undefined && opts.override ? value : t.kind === "service" ? (opts?.override ? value : null) : value)}
        title={opts?.override ? `自動計算値: ${fmt(opts.auto ?? 0)} (空にして保存で戻せます)` : "クリックして編集"}
        className="block w-full cursor-text rounded px-1 py-0.5 text-right text-sm tabular hover:bg-akane-50"
      >
        {opts?.override && <span className="mr-1 align-middle text-[8px] text-amber-500">●</span>}
        {fmt(value)}
      </button>
    );
  }

  const th = "sticky left-0 z-10 bg-inherit px-3 py-2 text-left text-sm font-medium whitespace-nowrap";
  const td = "px-2 py-1 text-right text-sm tabular whitespace-nowrap";
  const sectionRow = "bg-slate-100 text-slate-600";

  return (
    <>
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-white">
            <th className={`${th} font-semibold`}>項目</th>
            {months.map((m) => (
              <th key={m} className="px-2 py-2 text-right text-xs font-semibold text-slate-500">
                {formatMonthShort(m)}
              </th>
            ))}
            <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">合計</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {/* ===== 売上高 ===== */}
          <tr className={sectionRow}>
            <td className={th} colSpan={months.length + 3}>
              【売上高】
            </td>
          </tr>
          {state.serviceRows.map((row) => (
            <tr key={row.serviceId} className="border-b border-slate-100 bg-white hover:bg-slate-50">
              <td className={th}>
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: row.color }} />
                {row.name}
              </td>
              {months.map((m) => {
                const cell = row.cells[m];
                return (
                  <td key={m} className={td}>
                    {editableCell(
                      { kind: "service", serviceId: row.serviceId, month: m },
                      cell.effective,
                      { override: cell.override !== null, auto: cell.auto }
                    )}
                  </td>
                );
              })}
              <td className={`${td} font-medium`}>{fmt(row.total)}</td>
              <td></td>
            </tr>
          ))}
          {state.manualRows.map((row) => (
            <tr key={`${row.serviceId ?? ""}:${row.label}`} className="border-b border-slate-100 bg-white hover:bg-slate-50">
              <td className={th}>
                <span
                  className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                  style={{ backgroundColor: row.serviceColor ?? "#cbd5e1" }}
                />
                {row.serviceName ?? "未分類"}
                {row.label && <span className="ml-1.5 text-xs text-slate-400">・{row.label}</span>}
              </td>
              {months.map((m) => (
                <td key={m} className={td}>
                  {editableCell(
                    { kind: "manual", serviceId: row.serviceId, label: row.label, month: m },
                    row.cells[m] ?? 0
                  )}
                </td>
              ))}
              <td className={`${td} font-medium`}>{fmt(row.total)}</td>
              <td className="px-1">
                <button
                  type="button"
                  onClick={() => removeManualRow(row)}
                  className="text-xs text-slate-300 hover:text-rose-500"
                  title="行を削除"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
          <tr className="border-b border-slate-200 bg-white">
            <td className={`${th} text-slate-500`} colSpan={months.length + 3}>
              {state.serviceRows.length > 0 ? (
                <button type="button" onClick={beginAddRow} className="text-sm font-medium text-akane-600 hover:underline">
                  ＋ 売上行を追加 (サービスに紐づく単発売上)
                </button>
              ) : (
                <span className="text-sm text-slate-400">
                  単発売上を追加するには、先に左メニューの
                  <Link href="/services" className="text-akane-600 hover:underline">
                    「サービス・プラン」
                  </Link>
                  でサービスを登録してください
                </span>
              )}
            </td>
          </tr>
          <tr className="border-b-2 border-slate-300 bg-akane-50/50 font-semibold">
            <td className={th}>売上高合計</td>
            {months.map((m) => (
              <td key={m} className={td}>
                {fmt(revenueTotal[m])}
              </td>
            ))}
            <td className={`${td} font-bold`}>{fmt(months.reduce((s, m) => s + revenueTotal[m], 0))}</td>
            <td></td>
          </tr>

          {/* ===== 経費 ===== */}
          <tr className={sectionRow}>
            <td className={th} colSpan={months.length + 3}>
              <div className="flex items-center justify-between gap-2">
                <span>【経費】</span>
                <ExpenseCategoryModal categories={expenseCategories} />
              </div>
            </td>
          </tr>
          {state.expenseRows.map((row) => (
            <tr key={row.categoryId} className="border-b border-slate-100 bg-white hover:bg-slate-50">
              <td className={th}>{row.name}</td>
              {months.map((m) => (
                <td key={m} className={td}>
                  {editableCell({ kind: "expense", categoryId: row.categoryId, month: m }, row.cells[m] ?? 0)}
                </td>
              ))}
              <td className={`${td} font-medium`}>{fmt(row.total)}</td>
              <td></td>
            </tr>
          ))}
          <tr className="border-b-2 border-slate-300 bg-slate-50 font-semibold">
            <td className={th}>経費合計</td>
            {months.map((m) => (
              <td key={m} className={td}>
                {fmt(expenseTotal[m])}
              </td>
            ))}
            <td className={`${td} font-bold`}>{fmt(months.reduce((s, m) => s + expenseTotal[m], 0))}</td>
            <td></td>
          </tr>

          {/* ===== 利益 ===== */}
          <tr className={sectionRow}>
            <td className={th} colSpan={months.length + 3}>
              【利益】
            </td>
          </tr>
          <tr className="border-b border-slate-100 bg-white font-medium">
            <td className={th}>営業利益</td>
            {months.map((m) => (
              <td key={m} className={`${td} ${profit[m] < 0 ? "text-rose-600" : ""}`}>
                {fmt(profit[m])}
              </td>
            ))}
            <td className={`${td} font-bold`}>{fmt(months.reduce((s, m) => s + profit[m], 0))}</td>
            <td></td>
          </tr>
          <tr className="border-b border-slate-100 bg-white text-slate-500">
            <td className={th}>営業利益率</td>
            {months.map((m) => (
              <td key={m} className={td}>
                {revenueTotal[m] === 0 ? "–" : `${Math.round((profit[m] / revenueTotal[m]) * 100)}%`}
              </td>
            ))}
            <td></td>
            <td></td>
          </tr>
          <tr className="bg-white font-medium">
            <td className={th}>累計利益</td>
            {months.map((m) => (
              <td key={m} className={`${td} ${cumulative[m] < 0 ? "text-rose-600" : ""}`}>
                {fmt(cumulative[m])}
              </td>
            ))}
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    {/* 売上行を追加するポップアップ (サービスに紐づく単発売上) */}
    {addingRow && (
      <div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center"
        onMouseDown={(e) => e.target === e.currentTarget && setAddingRow(false)}
      >
        <div className="my-8 w-full max-w-md rounded-2xl bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-900">売上行を追加</h3>
            <button
              type="button"
              onClick={() => setAddingRow(false)}
              aria-label="閉じる"
              className="-mr-1 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
          <div className="space-y-3 px-5 py-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">サービス</label>
              <select
                value={newServiceId}
                onChange={(e) => setNewServiceId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm"
              >
                {state.serviceRows.map((s) => (
                  <option key={s.serviceId} value={s.serviceId}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">内容 (任意)</label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="例: スポット案件"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm"
              />
            </div>
            <p className="text-xs text-slate-400">
              追加後、月ごとのセルをクリックして金額を入力できます。サービス自体を増やす場合は{" "}
              <Link href="/services" className="text-akane-600 hover:underline">
                サービス・プラン
              </Link>
              から。
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
            <button
              type="button"
              onClick={() => setAddingRow(false)}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={confirmAddRow}
              className="rounded-lg bg-akane-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-akane-700"
            >
              追加する
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
