"use client";

import { CURRENCIES, CURRENCY_LABELS } from "@/lib/constants";
import { btnPrimary, inputCls, labelCls, selectCls } from "@/components/ui";
import { updateOrg } from "@/app/actions/settings";

export function OrgSettingsForm(props: {
  admin: boolean;
  orgName: string;
  baseCurrency: string;
}) {
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
          defaultValue={props.baseCurrency}
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
          案件・契約・売上管理・ダッシュボードのすべての金額をこの通貨として表示します
        </p>
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
