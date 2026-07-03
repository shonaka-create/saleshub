import { requireSession, isAdmin } from "@/lib/auth";
import { parseFxRates } from "@/lib/currency";
import { CURRENCIES } from "@/lib/constants";
import { Card, btnPrimary, inputCls, labelCls, selectCls } from "@/components/ui";
import { updateOrg } from "@/app/actions/settings";

export default async function OrgSettingsPage() {
  const session = await requireSession();
  const admin = isAdmin(session.role);
  const rates = parseFxRates(session.org.fxRates);

  return (
    <Card className="max-w-2xl p-6">
      <h2 className="mb-1 text-base font-semibold">組織・通貨設定</h2>
      <p className="mb-6 text-sm text-slate-500">
        基準通貨は売上管理・ダッシュボードの集計通貨です。外貨建て契約は下記レートで換算されます。
      </p>
      <form action={updateOrg} className="space-y-4">
        <div>
          <label className={labelCls}>組織名</label>
          <input name="name" defaultValue={session.org.name} disabled={!admin} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>基準通貨</label>
          <select name="baseCurrency" defaultValue={session.org.baseCurrency} disabled={!admin} className={selectCls}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>AUD → 基準通貨レート</label>
            <input name="audRate" type="number" step="0.01" defaultValue={rates.AUD ?? 95} disabled={!admin} className={inputCls} />
            <p className="mt-1 text-xs text-slate-400">例: 1 AUD = 95 JPY なら 95</p>
          </div>
          <div>
            <label className={labelCls}>USD → 基準通貨レート</label>
            <input name="usdRate" type="number" step="0.01" defaultValue={rates.USD ?? 150} disabled={!admin} className={inputCls} />
          </div>
        </div>
        {admin ? (
          <button type="submit" className={btnPrimary}>保存</button>
        ) : (
          <p className="text-sm text-slate-400">設定の変更には管理者権限が必要です</p>
        )}
      </form>
    </Card>
  );
}
