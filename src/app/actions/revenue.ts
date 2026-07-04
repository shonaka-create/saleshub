"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { MONTHLY_VALUE_TYPES } from "@/lib/constants";

// サービス行の手動上書き。amount が null なら上書き解除 (自動計算値に戻す)
export async function saveOverride(month: string, serviceId: string, amount: number | null) {
  const session = await requireSession();
  const orgId = session.org.id;
  const service = await db.service.findFirst({ where: { id: serviceId, orgId } });
  if (!service) return;

  const existing = await db.monthlyValue.findFirst({
    where: { orgId, month, type: MONTHLY_VALUE_TYPES.REVENUE_OVERRIDE, serviceId },
  });
  if (amount === null) {
    if (existing) await db.monthlyValue.delete({ where: { id: existing.id } });
  } else if (existing) {
    await db.monthlyValue.update({ where: { id: existing.id }, data: { amount } });
  } else {
    await db.monthlyValue.create({
      data: { orgId, month, type: MONTHLY_VALUE_TYPES.REVENUE_OVERRIDE, serviceId, amount },
    });
  }
  revalidatePath("/revenue");
  revalidatePath("/dashboard");
}

// 単発売上 (手入力行)。新規行は必ずいずれかのサービスに紐づける
// (serviceId が null になるのは、紐付けが無かった旧データを編集する場合のみ)。
export async function saveManual(
  month: string,
  serviceId: string | null,
  label: string,
  amount: number
) {
  const session = await requireSession();
  const orgId = session.org.id;
  if (serviceId) {
    const service = await db.service.findFirst({ where: { id: serviceId, orgId } });
    if (!service) return;
  }

  const lbl = label.trim();
  const existing = await db.monthlyValue.findFirst({
    where: { orgId, month, type: MONTHLY_VALUE_TYPES.REVENUE_MANUAL, serviceId, label: lbl || null },
  });
  if (existing) {
    await db.monthlyValue.update({ where: { id: existing.id }, data: { amount } });
  } else {
    await db.monthlyValue.create({
      data: { orgId, month, type: MONTHLY_VALUE_TYPES.REVENUE_MANUAL, serviceId, label: lbl || null, amount },
    });
  }
  revalidatePath("/revenue");
  revalidatePath("/dashboard");
}

export async function deleteManualRow(serviceId: string | null, label: string) {
  const session = await requireSession();
  await db.monthlyValue.deleteMany({
    where: {
      orgId: session.org.id,
      type: MONTHLY_VALUE_TYPES.REVENUE_MANUAL,
      serviceId,
      label: label || null,
    },
  });
  revalidatePath("/revenue");
  revalidatePath("/dashboard");
}

// 経費
export async function saveExpense(month: string, categoryId: string, amount: number) {
  const session = await requireSession();
  const orgId = session.org.id;
  const category = await db.expenseCategory.findFirst({ where: { id: categoryId, orgId } });
  if (!category) return;

  const existing = await db.monthlyValue.findFirst({
    where: { orgId, month, type: MONTHLY_VALUE_TYPES.EXPENSE, expenseCategoryId: categoryId },
  });
  if (existing) {
    if (amount === 0) {
      await db.monthlyValue.delete({ where: { id: existing.id } });
    } else {
      await db.monthlyValue.update({ where: { id: existing.id }, data: { amount } });
    }
  } else if (amount !== 0) {
    await db.monthlyValue.create({
      data: { orgId, month, type: MONTHLY_VALUE_TYPES.EXPENSE, expenseCategoryId: categoryId, amount },
    });
  }
  revalidatePath("/revenue");
  revalidatePath("/dashboard");
}
