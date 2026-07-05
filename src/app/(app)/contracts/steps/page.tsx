import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, Card, Badge, btnPrimary, inputCls } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import {
  createContractStepDef,
  deleteContractStepDef,
  addProcedureFeatureStep,
} from "@/app/actions/contract-steps";
import { PROCEDURE_FEATURES, PROCEDURE_FEATURE_META, type ProcedureFeature } from "@/lib/constants";
import { ContractsTabs } from "../tabs";

export default async function ContractStepsPage() {
  const session = await requireSession();
  const stepDefs = await db.contractStepDef.findMany({
    where: { orgId: session.org.id },
    orderBy: { sortOrder: "asc" },
  });
  const usedFeatures = new Set(stepDefs.map((d) => d.feature).filter(Boolean));

  return (
    <div>
      <PageHeader title="契約管理" description="契約は月次売上の自動計算元になります" />
      <ContractsTabs />

      <div className="max-w-2xl space-y-6">
        <Card className="p-6">
          <h2 className="mb-1 text-base font-semibold">手続きテンプレート</h2>
          <p className="mb-5 text-sm text-slate-500">
            ここで設定した手順は、すべての契約の「手続きチェックリスト」に表示されます (例: 契約書送付、署名回収、初期費用請求、入金確認、キックオフMTG)。チームの誰でも自由に追加・削除できます。
          </p>

          {stepDefs.length === 0 ? (
            <p className="text-sm text-slate-400">まだ手順が設定されていません。</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {stepDefs.map((d, i) => {
                const meta = d.feature ? PROCEDURE_FEATURE_META[d.feature as ProcedureFeature] : null;
                return (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                    <span className="flex items-center gap-2 text-sm text-slate-800">
                      <span className="text-xs text-slate-400">{i + 1}.</span>
                      {meta && <span>{meta.icon}</span>}
                      {d.label}
                      {meta && <Badge className="bg-sky-50 text-sky-600">定型プロセス</Badge>}
                    </span>
                    <ConfirmButton
                      action={deleteContractStepDef.bind(null, d.id)}
                      message={`「${d.label}」を削除しますか？すべての契約からこの手順が消えます。`}
                      className="text-xs text-slate-400 hover:text-rose-500"
                    >
                      削除
                    </ConfirmButton>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-1 text-base font-semibold">定型プロセスから追加</h2>
          <p className="mb-4 text-sm text-slate-500">
            チーム機能と連動する定型プロセスを手順として追加できます (機能自体は近日公開)。
          </p>
          <div className="flex flex-wrap gap-2">
            {PROCEDURE_FEATURES.map((feature) => {
              const meta = PROCEDURE_FEATURE_META[feature];
              const used = usedFeatures.has(feature);
              return (
                <form key={feature} action={addProcedureFeatureStep.bind(null, feature)}>
                  <button
                    type="submit"
                    disabled={used}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium transition ${
                      used
                        ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                        : "border-slate-300 bg-white text-slate-700 hover:border-akane-300 hover:bg-akane-50"
                    }`}
                  >
                    <span>{meta.icon}</span>
                    {meta.label}
                    {used ? (
                      <Badge className="bg-slate-100 text-slate-400">追加済</Badge>
                    ) : (
                      <span className="text-slate-400">＋</span>
                    )}
                  </button>
                </form>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-1 text-base font-semibold">自由入力で追加</h2>
          <p className="mb-4 text-sm text-slate-500">その他の手順は自由にカスタマイズできます。</p>
          <form action={createContractStepDef} className="flex flex-wrap items-center gap-2">
            <input name="label" required placeholder="例: キックオフMTG" className={`${inputCls} min-w-48 flex-1`} />
            <button type="submit" className={btnPrimary}>＋ 追加</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
