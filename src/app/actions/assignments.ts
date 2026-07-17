"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const PATH = "/team/assignments";

function optStr(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

export async function createAssignment(formData: FormData) {
  const session = await requireSession();
  const orgId = session.org.id;

  const userId = String(formData.get("userId") ?? "");
  const month = String(formData.get("month") ?? "");
  const hours = Number(formData.get("hours"));
  if (!/^\d{4}-\d{2}$/.test(month) || !Number.isFinite(hours) || hours <= 0) return;

  // メンバーが自組織に所属しているか検証
  const member = await db.membership.findFirst({ where: { userId, orgId }, select: { userId: true } });
  if (!member) return;

  let customerId: string | null = null;
  const customerRaw = optStr(formData, "customerId");
  if (customerRaw) {
    const c = await db.customer.findFirst({ where: { id: customerRaw, orgId }, select: { id: true } });
    customerId = c?.id ?? null;
  }
  let dealId: string | null = null;
  const dealRaw = optStr(formData, "dealId");
  if (dealRaw) {
    const d = await db.deal.findFirst({ where: { id: dealRaw, orgId }, select: { id: true } });
    dealId = d?.id ?? null;
  }

  await db.assignment.create({
    data: {
      orgId,
      userId,
      month,
      customerId,
      dealId,
      hours,
      memo: optStr(formData, "memo"),
    },
  });
  revalidatePath(PATH);
}

export async function updateAssignmentHours(id: string, value: string) {
  const session = await requireSession();
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours < 0) return;
  await db.assignment.updateMany({ where: { id, orgId: session.org.id }, data: { hours } });
  revalidatePath(PATH);
}

export async function deleteAssignment(id: string) {
  const session = await requireSession();
  await db.assignment.deleteMany({ where: { id, orgId: session.org.id } });
  revalidatePath(PATH);
}
