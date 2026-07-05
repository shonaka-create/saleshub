import "server-only";
import { db } from "./db";

export type ContractStepView = {
  stepDefId: string;
  label: string;
  sortOrder: number;
  completedAt: Date | null;
  feature: string | null; // 定型プロセス種別 (constants.ts PROCEDURE_FEATURES)。null は自由入力ステップ。
};

// 組織共通の手続きテンプレートと、当該契約の完了状況をマージして返す。
// テンプレートに後から手順が追加された場合は、まだ ContractStep の無い
// stepDef 分を遅延補完してから返すことで、既存の契約にも新しい手順が反映される。
export async function getContractSteps(orgId: string, contractId: string): Promise<ContractStepView[]> {
  const stepDefs = await db.contractStepDef.findMany({
    where: { orgId },
    orderBy: { sortOrder: "asc" },
  });
  if (stepDefs.length === 0) return [];

  const existing = await db.contractStep.findMany({ where: { contractId } });
  const existingDefIds = new Set(existing.map((s) => s.stepDefId));
  const missing = stepDefs.filter((d) => !existingDefIds.has(d.id));

  if (missing.length > 0) {
    await db.contractStep.createMany({
      data: missing.map((d) => ({ contractId, stepDefId: d.id })),
      skipDuplicates: true,
    });
  }

  const steps = missing.length > 0 ? await db.contractStep.findMany({ where: { contractId } }) : existing;
  const byDefId = new Map(steps.map((s) => [s.stepDefId, s]));

  return stepDefs.map((d) => ({
    stepDefId: d.id,
    label: d.label,
    sortOrder: d.sortOrder,
    completedAt: byDefId.get(d.id)?.completedAt ?? null,
    feature: d.feature,
  }));
}
