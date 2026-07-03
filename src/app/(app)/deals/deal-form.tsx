"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  DEAL_STAGES,
  DEAL_STAGE_LABELS,
  CURRENCIES,
  CURRENCY_SYMBOLS,
} from "@/lib/constants";
import { btnPrimary, btnSecondary, inputCls, labelCls, selectCls } from "@/components/ui";
import type { DealFormState } from "@/app/actions/deals";

export type CustomerOpt = { id: string; name: string };
export type ServiceOpt = { id: string; name: string };
export type PlanOpt = {
  id: string;
  serviceId: string;
  name: string;
  currency: string;
  initialFee: number;
  monthlyFee: number;
};
export type CustomFieldDefOpt = {
  key: string;
  label: string;
  type: string;
  options: string[];
};

export type DealFormValues = {
  id?: string;
  customerId: string;
  title: string;
  stage: string;
  serviceId: string;
  planId: string;
  currency: string;
  initialFee: number;
  monthlyFee: number;
  probability: number;
  expectedCloseDate: string; // yyyy-MM-dd
  memo: string;
  customData: Record<string, string>;
};

export function DealForm({
  action,
  initial,
  customers,
  services,
  plans,
  customFields,
  submitLabel,
  cancelHref,
}: {
  action: (prev: DealFormState, formData: FormData) => Promise<DealFormState>;
  initial: DealFormValues;
  customers: CustomerOpt[];
  services: ServiceOpt[];
  plans: PlanOpt[];
  customFields: CustomFieldDefOpt[];
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState<DealFormState, FormData>(action, {});

  const [serviceId, setServiceId] = useState(initial.serviceId);
  const [planId, setPlanId] = useState(initial.planId);
  const [currency, setCurrency] = useState(initial.currency);
  const [initialFee, setInitialFee] = useState(String(initial.initialFee));
  const [monthlyFee, setMonthlyFee] = useState(String(initial.monthlyFee));

  const servicePlans = plans.filter((p) => p.serviceId === serviceId);

  function onServiceChange(id: string) {
    setServiceId(id);
    setPlanId(""); // サービス変更でプラン選択をリセット
  }

  function onPlanChange(id: string) {
    setPlanId(id);
    const plan = plans.find((p) => p.id === id);
    if (plan) {
      // プラン選択で通貨・料金を自動入力
      setCurrency(plan.currency);
      setInitialFee(String(plan.initialFee));
      setMonthlyFee(String(plan.monthlyFee));
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {state.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelCls}>
            顧客 <span className="text-rose-500">*</span>
          </label>
          <select name="customerId" defaultValue={initial.customerId} required className={`${selectCls} w-full`}>
            <option value="">選択してください</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>ステージ</label>
          <select name="stage" defaultValue={initial.stage} className={`${selectCls} w-full`}>
            {DEAL_STAGES.map((s) => (
              <option key={s} value={s}>
                {DEAL_STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>
          案件タイトル <span className="text-rose-500">*</span>
        </label>
        <input name="title" defaultValue={initial.title} required className={inputCls} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelCls}>サービス</label>
          <select
            name="serviceId"
            value={serviceId}
            onChange={(e) => onServiceChange(e.target.value)}
            className={`${selectCls} w-full`}
          >
            <option value="">未設定</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>プラン</label>
          <select
            name="planId"
            value={planId}
            onChange={(e) => onPlanChange(e.target.value)}
            disabled={!serviceId}
            className={`${selectCls} w-full disabled:bg-slate-50`}
          >
            <option value="">未設定</option>
            {servicePlans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className={labelCls}>通貨</label>
          <select
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={`${selectCls} w-full`}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c} ({CURRENCY_SYMBOLS[c]})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>初期費用</label>
          <input
            name="initialFee"
            type="number"
            min="0"
            step="1"
            value={initialFee}
            onChange={(e) => setInitialFee(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>月額</label>
          <input
            name="monthlyFee"
            type="number"
            min="0"
            step="1"
            value={monthlyFee}
            onChange={(e) => setMonthlyFee(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelCls}>受注確度 (%)</label>
          <input
            name="probability"
            type="number"
            min="0"
            max="100"
            step="5"
            defaultValue={initial.probability}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>受注予定日</label>
          <input
            name="expectedCloseDate"
            type="date"
            defaultValue={initial.expectedCloseDate}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>メモ</label>
        <textarea name="memo" defaultValue={initial.memo} rows={3} className={inputCls} />
      </div>

      {customFields.length > 0 && (
        <div className="space-y-5 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <p className="text-sm font-semibold text-slate-700">カスタム項目</p>
          <div className="grid gap-5 sm:grid-cols-2">
            {customFields.map((f) => (
              <div key={f.key}>
                <label className={labelCls}>{f.label}</label>
                {f.type === "select" ? (
                  <select name={`cf_${f.key}`} defaultValue={initial.customData[f.key] ?? ""} className={`${selectCls} w-full`}>
                    <option value="">選択してください</option>
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={`cf_${f.key}`}
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    defaultValue={initial.customData[f.key] ?? ""}
                    className={inputCls}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "保存中..." : submitLabel}
        </button>
        <Link href={cancelHref} className={btnSecondary}>
          キャンセル
        </Link>
      </div>
    </form>
  );
}
