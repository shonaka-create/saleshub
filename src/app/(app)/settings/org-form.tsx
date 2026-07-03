"use client";

import { useState } from "react";
import { CURRENCIES } from "@/lib/constants";
import { btnPrimary, inputCls, labelCls, selectCls } from "@/components/ui";
import { updateOrg } from "@/app/actions/settings";

// 基準通貨ごとの換算レート初期値 (1 通貨 = X 基準通貨)
const RATE_DEFAULTS: Record<string, Record<string, number>> = {
  JPY: { AUD: 95, USD: 150 },
  AUD: { JPY: 0.0105, USD: 1.5 },
  USD: { JPY: 0.0067, AUD: 0.66 },
};

const CURRENCY_LABELS: Record<string, string> = {
  JPY: "JPY (日本円)",
  AUD: "AUD (豪ドル)",
  USD: "USD (米ドル)",
};

export function OrgSettingsForm(props: {
  admin: boolean;
  orgName: string;
  baseCurrency: string;
  rates: Record<string, number>;
}) {
  const [base, setBase] = useState(props.baseCurrency);
  const others = CURRENCIES.filter((c) => c !== base);

  const defaultRate = (c: string) =>
    base === props.baseCurrency
      ? props.rates[c] ?? RATE_DEFAULTS[base]?.[c] ?? 1
      : RATE_DEFAULTS[base]?.[c] ?? 1;

  return (
    <form action={updateOrg} className="space-y-4">
      <div>
        <label className={labelCls}>組織名</label>
        <input name="name" defaultValue={props.orgName} disabled={!props.admin} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>基準通貨</label>
        <select
          name="baseCurrency"
          value={base}
          onChange={(e) => setBase(e.target.value)}
          disabled={!props.admin}
          className={selectCls}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {CURRENCY_LABELS[c] ?? c}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-400">
          売上管理・ダッシュボードの集計をこの通貨で表示します
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {others.map((c) => (
          // key に base を含め、基準通貨の切替時に初期値を再適用する
          <div key={`${base}-${c}`}>
            <label className={labelCls}>
              {c} → {base} レート
            </label>
            <input
              name={`rate_${c}`}
              type="number"
              step="any"
              min="0"
              defaultValue={defaultRate(c)}
              disabled={!props.admin}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-slate-400">
              例: 1 {c} = {RATE_DEFAULTS[base]?.[c] ?? 1} {base} なら {RATE_DEFAULTS[base]?.[c] ?? 1}
            </p>
          </div>
        ))}
      </div>
      {props.admin ? (
        <button type="submit" className={btnPrimary}>
          保存
        </button>
      ) : (
        <p className="text-sm text-slate-400">設定の変更には管理者権限が必要です</p>
      )}
    </form>
  );
}
