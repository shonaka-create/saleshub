"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession, isAdmin } from "@/lib/auth";

async function requireAdmin() {
  const session = await requireSession();
  if (!isAdmin(session.role)) throw new Error("管理者権限が必要です");
  return session;
}

// ===== 契約手続きテンプレート (組織共通) =====

export async function createContractStepDef(formData: FormData) {
  const session = await requireAdmin();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return;
  const count = await db.contractStepDef.count({ where: { orgId: session.org.id } });
  await db.contractStepDef.create({
    data: { orgId: session.org.id, label, sortOrder: count },
  });
  revalidatePath("/contracts/steps");
}

export async function deleteContractStepDef(id: string) {
  const session = await requireAdmin();
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
