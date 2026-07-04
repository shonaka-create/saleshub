import { requireSession, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, Card, btnPrimary, inputCls } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { createContractStepDef, deleteContractStepDef } from "@/app/actions/contract-steps";
import { ContractsTabs } from "../tabs";

export default async function ContractStepsPage() {
  const session = await requireSession();
  const admin = isAdmin(session.role);
  const stepDefs = await db.contractStepDef.findMany({
    where: { orgId: session.org.id },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div>
      <PageHeader title="契約管理" description="契約は月次売上の自動計算元になります" />
      <ContractsTabs />

      {!admin ? (
        <p className="text-sm text-slate-500">手続きテンプレートの管理には管理者権限が必要です。</p>
      ) : (
        <div className="max-w-2xl space-y-6">
          <Card className="p-6">
            <h2 className="mb-1 text-base font-semibold">手続きテンプレート</h2>
            <p className="mb-5 text-sm text-slate-500">
              ここで設定した手順は、すべての契約の「手続きチェックリスト」に表示されます (例: 契約書送付、署名回収、初期費用請求、入金確認、キックオフMTG)。
            </p>

            {stepDefs.length === 0 ? (
              <p className="text-sm text-slate-400">まだ手順が設定されていません。</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {stepDefs.map((d, i) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                    <span className="text-sm text-slate-800">
                      <span className="mr-2 text-xs text-slate-400">{i + 1}.</span>
                      {d.label}
                    </span>
                    <ConfirmButton
                      action={deleteContractStepDef.bind(null, d.id)}
                      message={`「${d.label}」を削除しますか？すべての契約からこの手順が消えます。`}
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
            <h2 className="mb-4 text-base font-semibold">手順を追加</h2>
            <form action={createContractStepDef} className="flex flex-wrap items-center gap-2">
              <input name="label" required placeholder="例: キックオフMTG" className={`${inputCls} min-w-48 flex-1`} />
              <button type="submit" className={btnPrimary}>＋ 追加</button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
