"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession, isAdmin } from "@/lib/auth";
import { CURRENCIES } from "@/lib/constants";

async function requireAdmin() {
  const session = await requireSession();
  if (!isAdmin(session.role)) throw new Error("管理者権限が必要です");
  return session;
}

// ===== 組織・通貨 =====

export async function updateOrg(formData: FormData) {
  const session = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const baseCurrency = String(formData.get("baseCurrency") ?? "JPY");
  if (!CURRENCIES.includes(baseCurrency as (typeof CURRENCIES)[number])) return;

  await db.organization.update({
    where: { id: session.org.id },
    data: {
      ...(name ? { name } : {}),
      baseCurrency,
    },
  });
  revalidatePath("/", "layout");
}

// ===== メンバー・招待 =====

export async function createInvitation(formData: FormData) {
  const session = await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "MEMBER");
  if (!email || !["ADMIN", "MEMBER"].includes(role)) return;

  await db.invitation.create({
    data: {
      orgId: session.org.id,
      email,
      role,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14), // 14日間有効
    },
  });
  revalidatePath("/settings/members");
}

export async function deleteInvitation(id: string) {
  const session = await requireAdmin();
  await db.invitation.deleteMany({ where: { id, orgId: session.org.id } });
  revalidatePath("/settings/members");
}

export async function changeMemberRole(membershipId: string, role: string) {
  const session = await requireAdmin();
  if (!["ADMIN", "MEMBER"].includes(role)) return;
  const target = await db.membership.findFirst({
    where: { id: membershipId, orgId: session.org.id },
  });
  if (!target || target.role === "OWNER") return; // オーナーは変更不可
  await db.membership.update({ where: { id: target.id }, data: { role } });
  revalidatePath("/settings/members");
}

export async function removeMember(membershipId: string) {
  const session = await requireAdmin();
  const target = await db.membership.findFirst({
    where: { id: membershipId, orgId: session.org.id },
  });
  if (!target || target.role === "OWNER" || target.userId === session.user.id) return;
  await db.membership.delete({ where: { id: target.id } });
  revalidatePath("/settings/members");
}

// ===== サービス・プランマスタ =====

export async function createService(formData: FormData) {
  const session = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const count = await db.service.count({ where: { orgId: session.org.id } });
  await db.service.create({
    data: {
      orgId: session.org.id,
      name,
      category: String(formData.get("category") ?? "OTHER"),
      color: String(formData.get("color") ?? "#6366f1"),
      sortOrder: count,
    },
  });
  revalidatePath("/services");
  revalidatePath("/revenue");
}

export async function updateService(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;
  await db.service.updateMany({
    where: { id, orgId: session.org.id },
    data: {
      name,
      category: String(formData.get("category") ?? "OTHER"),
      color: String(formData.get("color") ?? "#6366f1"),
    },
  });
  revalidatePath("/services");
  revalidatePath("/revenue");
}

export async function toggleServiceArchived(id: string, archived: boolean) {
  const session = await requireAdmin();
  await db.service.updateMany({ where: { id, orgId: session.org.id }, data: { archived } });
  revalidatePath("/services");
  revalidatePath("/revenue");
}

export async function createPlan(formData: FormData) {
  const session = await requireAdmin();
  const serviceId = String(formData.get("serviceId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const service = await db.service.findFirst({ where: { id: serviceId, orgId: session.org.id } });
  if (!service || !name) return;
  const count = await db.plan.count({ where: { serviceId } });
  await db.plan.create({
    data: {
      serviceId,
      name,
      initialFee: Number(formData.get("initialFee") ?? 0) || 0,
      monthlyFee: Number(formData.get("monthlyFee") ?? 0) || 0,
      sortOrder: count,
    },
  });
  revalidatePath("/services");
}

export async function updatePlan(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const plan = await db.plan.findFirst({
    where: { id, service: { orgId: session.org.id } },
  });
  if (!plan) return;
  await db.plan.update({
    where: { id },
    data: {
      name: String(formData.get("name") ?? plan.name),
      initialFee: Number(formData.get("initialFee") ?? 0) || 0,
      monthlyFee: Number(formData.get("monthlyFee") ?? 0) || 0,
      active: formData.get("active") === "on",
    },
  });
  revalidatePath("/services");
}

export async function deletePlan(id: string) {
  const session = await requireAdmin();
  await db.plan.deleteMany({ where: { id, service: { orgId: session.org.id } } });
  revalidatePath("/services");
}

// ===== 経費カテゴリ =====

export async function createExpenseCategory(formData: FormData) {
  const session = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const count = await db.expenseCategory.count({ where: { orgId: session.org.id } });
  await db.expenseCategory.create({
    data: { orgId: session.org.id, name, sortOrder: count },
  });
  revalidatePath("/revenue/expense-categories");
  revalidatePath("/revenue");
}

export async function renameExpenseCategory(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;
  await db.expenseCategory.updateMany({ where: { id, orgId: session.org.id }, data: { name } });
  revalidatePath("/revenue/expense-categories");
  revalidatePath("/revenue");
}

export async function deleteExpenseCategory(id: string) {
  const session = await requireAdmin();
  await db.expenseCategory.deleteMany({ where: { id, orgId: session.org.id } });
  revalidatePath("/revenue/expense-categories");
  revalidatePath("/revenue");
}

// ===== カスタム項目 =====

export async function createCustomField(formData: FormData) {
  const session = await requireAdmin();
  const entity = String(formData.get("entity") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const type = String(formData.get("type") ?? "text");
  const optionsRaw = String(formData.get("options") ?? "");
  if (!["customer", "deal"].includes(entity) || !label) return;

  const key = `cf_${Date.now().toString(36)}`;
  const options =
    type === "select"
      ? JSON.stringify(optionsRaw.split(",").map((s) => s.trim()).filter(Boolean))
      : "[]";
  const count = await db.customFieldDef.count({ where: { orgId: session.org.id, entity } });
  await db.customFieldDef.create({
    data: { orgId: session.org.id, entity, key, label, type, options, sortOrder: count },
  });
  revalidatePath("/settings/custom-fields");
}

export async function deleteCustomField(id: string) {
  const session = await requireAdmin();
  await db.customFieldDef.deleteMany({ where: { id, orgId: session.org.id } });
  revalidatePath("/settings/custom-fields");
}
