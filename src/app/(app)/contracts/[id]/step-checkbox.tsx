"use client";

import { useState, useTransition } from "react";
import { toggleContractStep } from "@/app/actions/contract-steps";

export function StepCheckbox({
  contractId,
  stepDefId,
  label,
  completedAt,
}: {
  contractId: string;
  stepDefId: string;
  label: string;
  completedAt: Date | null;
}) {
  const [completed, setCompleted] = useState(completedAt !== null);
  const [, startTransition] = useTransition();

  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 hover:bg-slate-50">
      <input
        type="checkbox"
        checked={completed}
        onChange={(e) => {
          const next = e.target.checked;
          setCompleted(next);
          startTransition(() => {
            toggleContractStep(contractId, stepDefId, next);
          });
        }}
        className="h-4 w-4 rounded border-slate-300 accent-akane-600"
      />
      <span className={`text-sm ${completed ? "text-slate-400 line-through" : "text-slate-800"}`}>
        {label}
      </span>
      {completed && completedAt && (
        <span className="ml-auto text-xs text-slate-400">
          {new Date(completedAt).toLocaleDateString("ja-JP")}
        </span>
      )}
    </label>
  );
}
