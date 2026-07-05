"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { PROCEDURE_FEATURES, PROCEDURE_FEATURE_META, type ProcedureFeature } from "@/lib/constants";

// ===== 契約手続きテンプレート (組織共通・メンバーなら誰でもカスタマイズ可) =====

// 自由入力の手続きステップを追加する。
export async function createContractStepDef(formData: FormData) {
  const session = await requireSession();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return;
  const count = await db.contractStepDef.count({ where: { orgId: session.org.id } });
  await db.contractStepDef.create({
    data: { orgId: session.org.id, label, sortOrder: count },
  });
  revalidatePath("/contracts/steps");
}

// 定型プロセス (請求書/契約書/委託費管理) を手続きステップとして追加する。
// 同じ定型プロセスは重複して追加できない。
export async function addProcedureFeatureStep(feature: ProcedureFeature) {
  const session = await requireSession();
  if (!PROCEDURE_FEATURES.includes(feature)) return;
  const orgId = session.org.id;

  const already = await db.contractStepDef.findFirst({ where: { orgId, feature } });
  if (already) return;

  const count = await db.contractStepDef.count({ where: { orgId } });
  await db.contractStepDef.create({
    data: { orgId, label: PROCEDURE_FEATURE_META[feature].label, sortOrder: count, feature },
  });
  revalidatePath("/contracts/steps");
}

export async function deleteContractStepDef(id: string) {
  const session = await requireSession();
  await db.contractStepDef.deleteMany({ where: { id, orgId: session.org.id } });
  revalidatePath("/contracts/steps");
}

// ===== 契約ごとの手続きチェック (メンバーなら誰でも操作可) =====

export async function toggleContractStep(contractId: string, stepDefId: string, completed: boolean) {
  const session = await requireSession();
  const orgId = session.org.id;

  const [contract, stepDef] = await Promise.all([
    db.contract.findFirst({ where: { id: contractId, orgId } }),
    db.contractStepDef.findFirst({ where: { id: stepDefId, orgId } }),
  ]);
  if (!contract || !stepDef) return;

  await db.contractStep.upsert({
    where: { contractId_stepDefId: { contractId, stepDefId } },
    create: { contractId, stepDefId, completedAt: completed ? new Date() : null },
    update: { completedAt: completed ? new Date() : null },
  });
  revalidatePath(`/contracts/${contractId}`);
  revalidatePath("/contracts");
}
