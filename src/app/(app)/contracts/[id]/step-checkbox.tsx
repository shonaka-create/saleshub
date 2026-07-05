"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toggleContractStep } from "@/app/actions/contract-steps";
import { PROCEDURE_FEATURE_META, type ProcedureFeature } from "@/lib/constants";

export function StepCheckbox({
  contractId,
  stepDefId,
  label,
  completedAt,
  feature,
}: {
  contractId: string;
  stepDefId: string;
  label: string;
  completedAt: Date | null;
  feature: string | null;
}) {
  const [completed, setCompleted] = useState(completedAt !== null);
  const [, startTransition] = useTransition();
  const meta = feature ? PROCEDURE_FEATURE_META[feature as ProcedureFeature] : null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 hover:bg-slate-50">
      <label className="flex flex-1 cursor-pointer items-center gap-3">
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
        <span className={`flex items-center gap-1.5 text-sm ${completed ? "text-slate-400 line-through" : "text-slate-800"}`}>
          {meta && <span>{meta.icon}</span>}
          {label}
        </span>
      </label>
      {meta && (
        <Link href={meta.href} className="text-xs font-medium text-akane-600 hover:underline">
          開く →
        </Link>
      )}
      {completed && completedAt && (
        <span className="text-xs text-slate-400">
          {new Date(completedAt).toLocaleDateString("ja-JP")}
        </span>
      )}
    </div>
  );
}
