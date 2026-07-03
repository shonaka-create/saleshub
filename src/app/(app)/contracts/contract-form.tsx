"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CURRENCIES, CURRENCY_SYMBOLS } from "@/lib/constants";
import { btnPrimary, btnSecondary, inputCls, labelCls, selectCls } from "@/components/ui";
import type { ContractFormState } from "@/app/actions/contracts";

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

export type ContractFormValues = {
  id?: string;
  dealId?: string;
  name: string;
  customerId: string;
  serviceId: string;
  planId: string;
  currency: string;
  initialFee: number;
  monthlyFee: number;
  startDate: string; // yyyy-MM-dd
  endDate?: string; // yyyy-MM-dd
  status?: string;
  memo: string;
};

export function ContractForm({
  action,
  initial,
  customers,
  services,
  plans,
  submitLabel,
  cancelHref,
  showStatus = false,
}: {
  action: (prev: ContractFormState, formData: FormData) => Promise<ContractFormState>;
  initial: ContractFormValues;
  customers: CustomerOpt[];
  services: ServiceOpt[];
  plans: PlanOpt[];
  submitLabel: string;
  cancelHref: string;
  showStatus?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ContractFormState, FormData>(action, {});

  const [serviceId, setServiceId] = useState(initial.serviceId);
  const [planId, setPlanId] = useState(initial.planId);
  const [currency, setCurrency] = useState(initial.currency);
  const [initialFee, setInitialFee] = useState(String(initial.initialFee));
  const [monthlyFee, setMonthlyFee] = useState(String(initial.monthlyFee));

  const servicePlans = plans.filter((p) => p.serviceId === serviceId);

  function onServiceChange(id: string) {
    setServiceId(id);
    setPlanId("");
  }

  function onPlanChange(id: string) {
    setPlanId(id);
    const plan = plans.find((p) => p.id === id);
    if (plan) {
      setCurrency(plan.currency);
      setInitialFee(String(plan.initialFee));
      setMonthlyFee(String(plan.monthlyFee));
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {initial.dealId && <input type="hidden" name="dealId" value={initial.dealId} />}
      {state.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      )}

      <div>
        <label className={labelCls}>
          契約名 <span className="text-rose-500">*</span>
        </label>
        <input name="name" defaultValue={initial.name} required className={inputCls} />
      </div>

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
          <label className={labelCls}>
            サービス <span className="text-rose-500">*</span>
          </label>
          <select
            name="serviceId"
            value={serviceId}
            onChange={(e) => onServiceChange(e.target.value)}
            required
            className={`${selectCls} w-full`}
          >
            <option value="">選択してください</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
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
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelCls}>初期費用 (開始月に計上)</label>
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
          <label className={labelCls}>月額 (毎月計上)</label>
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
          <label className={labelCls}>
            開始日 <span className="text-rose-500">*</span>
          </label>
          <input name="startDate" type="date" defaultValue={initial.startDate} required className={inputCls} />
        </div>
        {showStatus && (
          <div>
            <label className={labelCls}>終了日 (解約日)</label>
            <input name="endDate" type="date" defaultValue={initial.endDate ?? ""} className={inputCls} />
            <p className="mt-1 text-xs text-slate-400">
              終了日を設定すると解約月まで売上計上されます
            </p>
          </div>
        )}
      </div>

      {showStatus && (
        <div>
          <label className={labelCls}>ステータス</label>
          <select name="status" defaultValue={initial.status ?? "ACTIVE"} className={`${selectCls} w-full`}>
            <option value="ACTIVE">稼働中</option>
            <option value="ENDED">終了 (解約)</option>
          </select>
        </div>
      )}

      <div>
        <label className={labelCls}>メモ</label>
        <textarea name="memo" defaultValue={initial.memo} rows={3} className={inputCls} />
      </div>

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
