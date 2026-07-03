"use client";

import { useTransition } from "react";
import { DEAL_STAGES, DEAL_STAGE_LABELS } from "@/lib/constants";
import { updateDealStage } from "@/app/actions/deals";

// カンバンカード上でドラッグ&ドロップなしにステージを移動するセレクト
export function StageSelect({ dealId, stage }: { dealId: string; stage: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      value={stage}
      disabled={pending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => {
          updateDealStage(dealId, next);
        });
      }}
      className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 focus:border-akane-500 focus:outline-none disabled:opacity-50"
    >
      {DEAL_STAGES.map((s) => (
        <option key={s} value={s}>
          {s === stage ? DEAL_STAGE_LABELS[s] : `${DEAL_STAGE_LABELS[s]}へ移動`}
        </option>
      ))}
    </select>
  );
}
