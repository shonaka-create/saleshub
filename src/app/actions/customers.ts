"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export type CustomerFormState = { error?: string };

function strOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

function normalizeTags(raw: string): string {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t !== "")
    .join(",");
}

// カスタム項目 (entity=customer) の入力値を customData JSON 文字列に整形する
async function buildCustomData(formData: FormData, orgId: string): Promise<string> {
  const defs = await db.customFieldDef.findMany({
    where: { orgId, entity: "customer" },
  });
  const data: Record<string, string | number> = {};
  for (const def of defs) {
    const raw = formData.get(`cf_${def.key}`);
    if (raw == null) continue;
    const s = String(raw).trim();
    if (s === "") continue;
    data[def.key] = def.type === "number" ? Number(s) : s;
  }
  return JSON.stringify(data);
}

function customerFieldsFromForm(formData: FormData) {
  // status は顧客フォームから廃止 (案件管理のステージと二重入力になるため)。
  // 新規は Prisma の既定値 (LEAD)、更新時は既存値を維持し、ここでは書き込まない。
  return {
    country: String(formData.get("country") ?? "JP"),
    industry: strOrNull(formData.get("industry")),
    email: strOrNull(formData.get("email")),
    phone: strOrNull(formData.get("phone")),
    instagram: strOrNull(formData.get("instagram")),
    website: strOrNull(formData.get("website")),
    address: strOrNull(formData.get("address")),
    tags: normalizeTags(String(formData.get("tags") ?? "")),
    memo: strOrNull(formData.get("memo")),
  };
}

export async function createCustomer(
  _prev: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const session = await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "顧客名は必須です" };

  const customData = await buildCustomData(formData, session.org.id);
  const customer = await db.customer.create({
    data: {
      orgId: session.org.id,
      name,
      ...customerFieldsFromForm(formData),
      customData,
    },
  });

  revalidatePath("/customers");
  redirect(`/customers?created=${customer.id}`);
}

export async function updateCustomer(
  _prev: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id) return { error: "顧客IDが不正です" };
  if (!name) return { error: "顧客名は必須です" };

  const customData = await buildCustomData(formData, session.org.id);
  const res = await db.customer.updateMany({
    where: { id, orgId: session.org.id },
    data: {
      name,
      ...customerFieldsFromForm(formData),
      customData,
    },
  });
  if (res.count === 0) return { error: "顧客が見つかりません" };

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export async function deleteCustomer(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await db.customer.deleteMany({ where: { id, orgId: session.org.id } });
  }
  revalidatePath("/customers");
  redirect("/customers");
}

// ===== 担当者 (Contact) =====

export async function addContact(formData: FormData) {
  const session = await requireSession();
  const customerId = String(formData.get("customerId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!customerId || !name) return;

  const customer = await db.customer.findFirst({
    where: { id: customerId, orgId: session.org.id },
    select: { id: true },
  });
  if (!customer) return;

  await db.contact.create({
    data: {
      customerId,
      name,
      role: strOrNull(formData.get("role")),
      email: strOrNull(formData.get("email")),
      phone: strOrNull(formData.get("phone")),
    },
  });
  revalidatePath(`/customers/${customerId}`);
}

export async function deleteContact(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  const customerId = String(formData.get("customerId") ?? "");
  if (id) {
    // 親顧客が自組織に属することを確認してから削除
    const contact = await db.contact.findFirst({
      where: { id, customer: { orgId: session.org.id } },
      select: { id: true },
    });
    if (contact) await db.contact.delete({ where: { id } });
  }
  if (customerId) revalidatePath(`/customers/${customerId}`);
}
