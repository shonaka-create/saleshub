import { requireSession, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS } from "@/lib/constants";
import { formatMoney } from "@/lib/currency";
import { PageHeader, Card, Badge, btnPrimary, btnSecondary, inputCls } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import {
  createService,
  updateService,
  toggleServiceArchived,
  createPlan,
  updatePlan,
  deletePlan,
} from "@/app/actions/settings";

export const metadata = { title: "サービス・プラン管理" };

export default async function ServicesPage() {
  const session = await requireSession();
  const admin = isAdmin(session.role);
  const baseCurrency = session.org.baseCurrency;
  const services = await db.service.findMany({
    where: { orgId: session.org.id },
    include: { plans: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="サービス・プラン管理"
        description="提供サービスとプランのマスタです。ここで登録した内容が、案件・契約・売上管理の全画面で選択肢として参照されます。"
      />

      {!admin ? (
        <p className="text-sm text-slate-500">サービスマスタの管理には管理者権限が必要です。</p>
      ) : (
        <div className="max-w-4xl space-y-6">
          {services.length === 0 && (
            <Card className="p-6 text-sm text-slate-500">
              まだサービスが登録されていません。下の「新しいサービスを追加」から登録してください。
            </Card>
          )}

          {services.map((service) => (
            <Card key={service.id} className={`p-6 ${service.archived ? "opacity-60" : ""}`}>
              <form action={updateService} className="mb-4 flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={service.id} />
                <div className="min-w-48 flex-1">
                  <label className="mb-1 block text-xs font-medium text-slate-500">サービス名</label>
                  <input name="name" defaultValue={service.name} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">カテゴリ</label>
                  <select name="category" defaultValue={service.category} className={`${inputCls} w-40`}>
                    {/* 既存データが定義済みカテゴリ以外 (旧・自由入力) の場合はその値も選べるよう補う */}
                    {!(SERVICE_CATEGORIES as readonly string[]).includes(service.category) && (
                      <option value={service.category}>
                        {SERVICE_CATEGORY_LABELS[service.category] ?? service.category}
                      </option>
                    )}
                    {SERVICE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {SERVICE_CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">表示色</label>
                  <input
                    type="color" name="color" defaultValue={service.color}
                    className="h-9 w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                  />
                </div>
                <button type="submit" className={btnSecondary}>更新</button>
                <ConfirmButton
                  action={toggleServiceArchived.bind(null, service.id, !service.archived)}
                  message={
                    service.archived
                      ? `「${service.name}」を再表示しますか？`
                      : `「${service.name}」をアーカイブしますか？売上管理・新規案件の選択肢から非表示になります (既存データは保持)。`
                  }
                  className="text-xs text-slate-400 hover:text-amber-600"
                >
                  {service.archived ? "再表示" : "アーカイブ"}
                </ConfirmButton>
                {service.archived && <Badge className="bg-slate-100 text-slate-500">アーカイブ済</Badge>}
              </form>

              {/* プラン一覧 */}
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
                <h3 className="mb-3 text-xs font-semibold text-slate-500">プラン</h3>
                <div className="space-y-2">
                  {service.plans.map((plan) => (
                    <form key={plan.id} action={updatePlan} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={plan.id} />
                      <input name="name" defaultValue={plan.name} className={`${inputCls} min-w-40 flex-1`} />
                      <label className="flex items-center gap-1 text-xs text-slate-500">
                        初期
                        <input name="initialFee" type="number" step="any" defaultValue={plan.initialFee} className={`${inputCls} w-24`} />
                      </label>
                      <label className="flex items-center gap-1 text-xs text-slate-500">
                        月額
                        <input name="monthlyFee" type="number" step="any" defaultValue={plan.monthlyFee} className={`${inputCls} w-24`} />
                      </label>
                      <label className="flex items-center gap-1 text-xs text-slate-500">
                        <input type="checkbox" name="active" defaultChecked={plan.active} />
                        有効
                      </label>
                      <button type="submit" className="text-xs font-medium text-akane-600 hover:underline">保存</button>
                      <ConfirmButton
                        action={deletePlan.bind(null, plan.id)}
                        message={`プラン「${plan.name}」(${formatMoney(plan.monthlyFee, baseCurrency)}/月) を削除しますか？`}
                        className="text-xs text-slate-400 hover:text-rose-500"
                      >
                        削除
                      </ConfirmButton>
                    </form>
                  ))}
                </div>

                <form action={createPlan} className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
                  <input type="hidden" name="serviceId" value={service.id} />
                  <input name="name" placeholder="新しいプラン名" required className={`${inputCls} min-w-40 flex-1`} />
                  <label className="flex items-center gap-1 text-xs text-slate-500">
                    初期
                    <input name="initialFee" type="number" step="any" defaultValue={0} className={`${inputCls} w-24`} />
                  </label>
                  <label className="flex items-center gap-1 text-xs text-slate-500">
                    月額
                    <input name="monthlyFee" type="number" step="any" defaultValue={0} className={`${inputCls} w-24`} />
                  </label>
                  <button type="submit" className={btnSecondary}>＋ プラン追加</button>
                </form>
              </div>
            </Card>
          ))}

          <Card className="p-6">
            <h2 className="mb-3 text-base font-semibold">新しいサービスを追加</h2>
            <form action={createService} className="flex flex-wrap items-end gap-3">
              <div className="min-w-48 flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-500">サービス名</label>
                <input name="name" required placeholder="例: 新SaaSプロダクト" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">カテゴリ</label>
                <select name="category" defaultValue="SAAS" className={`${inputCls} w-40`}>
                  {SERVICE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {SERVICE_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">表示色</label>
                <input
                  type="color" name="color" defaultValue="#0ea5e9"
                  className="h-9 w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                />
              </div>
              <button type="submit" className={btnPrimary}>追加</button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
