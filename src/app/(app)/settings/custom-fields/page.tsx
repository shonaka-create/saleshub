import { requireSession, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { CUSTOM_FIELD_TYPES, CUSTOM_FIELD_TYPE_LABELS } from "@/lib/constants";
import { Card, Badge, btnPrimary, inputCls, selectCls } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { createCustomField, deleteCustomField } from "@/app/actions/settings";

const ENTITY_LABELS: Record<string, string> = { customer: "顧客", deal: "案件" };

export default async function CustomFieldsPage() {
  const session = await requireSession();
  const admin = isAdmin(session.role);
  const fields = await db.customFieldDef.findMany({
    where: { orgId: session.org.id },
    orderBy: [{ entity: "asc" }, { sortOrder: "asc" }],
  });

  if (!admin) {
    return <p className="text-sm text-slate-500">カスタム項目の管理には管理者権限が必要です。</p>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Card className="p-6">
        <h2 className="mb-1 text-base font-semibold">カスタム項目</h2>
        <p className="mb-5 text-sm text-slate-500">
          顧客・案件の入力フォームに独自の項目を追加できます (例: 紹介元、契約書URL、店舗数)。
        </p>

        {fields.length === 0 ? (
          <p className="text-sm text-slate-400">まだカスタム項目がありません。</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {fields.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <Badge className="bg-slate-100 text-slate-600">{ENTITY_LABELS[f.entity] ?? f.entity}</Badge>
                  <span className="text-sm font-medium text-slate-800">{f.label}</span>
                  <span className="text-xs text-slate-400">
                    {CUSTOM_FIELD_TYPE_LABELS[f.type] ?? f.type}
                    {f.type === "select" && ` (${JSON.parse(f.options).join(" / ")})`}
                  </span>
                </div>
                <ConfirmButton
                  action={deleteCustomField.bind(null, f.id)}
                  message={`「${f.label}」を削除しますか？既存データの値は残りますが表示されなくなります。`}
                  className="text-xs text-slate-400 hover:text-rose-500"
                >
                  削除
                </ConfirmButton>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-base font-semibold">項目を追加</h2>
        <form action={createCustomField} className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">対象</label>
              <select name="entity" className={selectCls}>
                <option value="customer">顧客</option>
                <option value="deal">案件</option>
              </select>
            </div>
            <div className="min-w-48 flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-500">項目名</label>
              <input name="label" required placeholder="例: 紹介元" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">タイプ</label>
              <select name="type" className={selectCls}>
                {CUSTOM_FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>{CUSTOM_FIELD_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              選択肢 (選択式の場合のみ・カンマ区切り)
            </label>
            <input name="options" placeholder="例: Instagram, 紹介, Web検索" className={inputCls} />
          </div>
          <button type="submit" className={btnPrimary}>＋ 追加</button>
        </form>
      </Card>
    </div>
  );
}
