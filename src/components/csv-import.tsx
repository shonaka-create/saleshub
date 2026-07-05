"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { importOutsourcingWorks } from "@/app/actions/outsourcing";
import { btnSecondary, selectCls } from "@/components/ui";

// 委託先が記入した稼働報告CSVを取り込むフォーム。委託先を選び、ファイルを渡すと稼働ログに一括登録する。
export function CsvImport({ subs }: { subs: { id: string; name: string }[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [subId, setSubId] = useState(subs[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; error?: string } | null>(null);

  async function onFile(file: File) {
    if (!subId) {
      setResult({ created: 0, skipped: 0, error: "委託先を選択してください" });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.set("subcontractorId", subId);
      fd.set("csv", file);
      const res = await importOutsourcingWorks(fd);
      setResult(res);
      if (res.created > 0) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (subs.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select value={subId} onChange={(e) => setSubId(e.target.value)} className={selectCls}>
          {subs.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={btnSecondary}>
          {busy ? "取り込み中…" : "⬆ 記入済みCSVを取り込む"}
        </button>
      </div>
      {result && (
        <p className={`text-xs ${result.error ? "text-rose-500" : "text-emerald-600"}`}>
          {result.error
            ? result.error
            : `${result.created}件を登録しました${result.skipped > 0 ? ` (${result.skipped}行スキップ)` : ""}`}
        </p>
      )}
    </div>
  );
}
