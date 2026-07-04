"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export type ContractFormState = { error?: string };

function toNum(formData: FormData, key: string): number {
  const v = Number(formData.get(key));
  return Number.isFinite(v) ? v : 0;
}

function optStr(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

async function resolvePlan(serviceId: string, planId: string | null): Promise<string | null> {
  if (!planId) return null;
  const p = await db.plan.findFirst({ where: { id: planId, serviceId } });
  return p ? p.id : null;
}

export async function createContract(
  _prev: ContractFormState,
  formData: FormData
): Promise<ContractFormState> {
  const session = await requireSession();
  const orgId = session.org.id;

  const name = String(formData.get("name") ?? "").trim();
  const customerId = String(formData.get("customerId") ?? "");
  const serviceId = String(formData.get("serviceId") ?? "");
  if (!name || !customerId || !serviceId) {
    return { error: "契約名・顧客・サービスは必須です" };
  }

  const [customer, service] = await Promise.all([
    db.customer.findFirst({ where: { id: customerId, orgId } }),
    db.service.findFirst({ where: { id: serviceId, orgId } }),
  ]);
  if (!customer || !service) return { error: "顧客またはサービスが不正です" };

  const planId = await resolvePlan(serviceId, optStr(formData, "planId"));
  const startRaw = optStr(formData, "startDate");
  let dealId: string | null = null;
  const dealRaw = optStr(formData, "dealId");
  if (dealRaw) {
    const deal = await db.deal.findFirst({ where: { id: dealRaw, orgId } });
    if (deal) dealId = deal.id;
  }

  const created = await db.contract.create({
    data: {
      orgId,
      customerId,
      serviceId,
      planId,
      dealId,
      name,
      initialFee: toNum(formData, "initialFee"),
      monthlyFee: toNum(formData, "monthlyFee"),
      startDate: startRaw ? new Date(startRaw) : new Date(),
      memo: optStr(formData, "memo"),
    },
  });

  revalidatePath("/contracts");
  revalidatePath("/revenue");
  redirect(`/contracts/${created.id}`);
}

export async function updateContract(
  _prev: ContractFormState,
  formData: FormData
): Promise<ContractFormState> {
  const session = await requireSession();
  const orgId = session.org.id;

  const id = String(formData.get("id") ?? "");
  const existing = await db.contract.findFirst({ where: { id, orgId } });
  if (!existing) return { error: "契約が見つかりません" };

  const name = String(formData.get("name") ?? "").trim();
  const customerId = String(formData.get("customerId") ?? "");
  const serviceId = String(formData.get("serviceId") ?? "");
  if (!name || !customerId || !serviceId) {
    return { error: "契約名・顧客・サービスは必須です" };
  }

  const [customer, service] = await Promise.all([
    db.customer.findFirst({ where: { id: customerId, orgId } }),
    db.service.findFirst({ where: { id: serviceId, orgId } }),
  ]);
  if (!customer || !service) return { error: "顧客またはサービスが不正です" };

  const planId = await resolvePlan(serviceId, optStr(formData, "planId"));
  const startRaw = optStr(formData, "startDate");
  const endRaw = optStr(formData, "endDate");
  const status = String(formData.get("status") ?? "ACTIVE") === "ENDED" ? "ENDED" : "ACTIVE";

  let endDate = endRaw ? new Date(endRaw) : null;
  // 解約 (ENDED) で終了日未指定なら当日を終了日とする
  if (status === "ENDED" && !endDate) endDate = new Date();

  // 終了日が開始日より前だと売上計上が一切されず「データが消えた」ように見えるため弾く
  const effectiveStart = startRaw ? new Date(startRaw) : existing.startDate;
  if (endDate && endDate < effectiveStart) {
    return { error: "終了日は開始日以降の日付を指定してください" };
  }

  await db.contract.update({
    where: { id },
    data: {
      customerId,
      serviceId,
      planId,
      name,
      initialFee: toNum(formData, "initialFee"),
      monthlyFee: toNum(formData, "monthlyFee"),
      startDate: startRaw ? new Date(startRaw) : existing.startDate,
      endDate,
      status,
      memo: optStr(formData, "memo"),
    },
  });

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${id}`);
  revalidatePath("/revenue");
  redirect(`/contracts/${id}`);
}

export async function deleteContract(id: string) {
  const session = await requireSession();
  const orgId = session.org.id;
  const contract = await db.contract.findFirst({ where: { id, orgId } });
  if (!contract) return;

  await db.contract.delete({ where: { id } });
  revalidatePath("/contracts");
  revalidatePath("/revenue");
  redirect("/contracts");
}
