"use client";

import { useRef, useTransition } from "react";
import { ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS } from "@/lib/constants";
import { btnPrimary, inputCls, selectCls } from "@/components/ui";
import { addDealActivity, deleteDealActivity } from "@/app/actions/deals";

export function ActivityForm({ dealId }: { dealId: string }) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await addDealActivity(dealId, formData);
          formRef.current?.reset();
        });
      }}
      className="space-y-3"
    >
      <select name="type" defaultValue="NOTE" className={`${selectCls} w-full`}>
        {ACTIVITY_TYPES.map((t) => (
          <option key={t} value={t}>
            {ACTIVITY_TYPE_LABELS[t]}
          </option>
        ))}
      </select>
      <textarea
        name="content"
        rows={2}
        required
        placeholder="活動内容を記録..."
        className={inputCls}
      />
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "追加中..." : "記録する"}
      </button>
    </form>
  );
}

export function DeleteActivityButton({ id, dealId }: { id: string; dealId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("この活動記録を削除しますか?")) {
          startTransition(() => {
            deleteDealActivity(id, dealId);
          });
        }
      }}
      className="text-xs text-slate-400 hover:text-rose-600 disabled:opacity-50"
    >
      削除
    </button>
  );
}
