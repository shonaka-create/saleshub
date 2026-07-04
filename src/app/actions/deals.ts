"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { DEAL_STAGES } from "@/lib/constants";

export type DealFormState = { error?: string };

function toNum(formData: FormData, key: string): number {
  const v = Number(formData.get(key));
  return Number.isFinite(v) ? v : 0;
}

function optStr(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

async function buildCustomData(orgId: string, formData: FormData): Promise<string> {
  const defs = await db.customFieldDef.findMany({ where: { orgId, entity: "deal" } });
  const data: Record<string, string> = {};
  for (const def of defs) {
    const raw = formData.get(`cf_${def.key}`);
    if (raw != null && String(raw).trim() !== "") data[def.key] = String(raw);
  }
  return JSON.stringify(data);
}

// 選択された service / plan が組織に属するか検証し、正当な値のみ返す
async function resolveServicePlan(
  orgId: string,
  serviceId: string | null,
  planId: string | null
): Promise<{ serviceId: string | null; planId: string | null }> {
  let validService: string | null = null;
  if (serviceId) {
    const s = await db.service.findFirst({ where: { id: serviceId, orgId } });
    if (s) validService = s.id;
  }
  let validPlan: string | null = null;
  if (validService && planId) {
    const p = await db.plan.findFirst({ where: { id: planId, serviceId: validService } });
    if (p) validPlan = p.id;
  }
  return { serviceId: validService, planId: validPlan };
}

export async function createDeal(_prev: DealFormState, formData: FormData): Promise<DealFormState> {
  const session = await requireSession();
  const orgId = session.org.id;

  const customerId = String(formData.get("customerId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!customerId || !title) return { error: "顧客とタイトルは必須です" };

  const customer = await db.customer.findFirst({ where: { id: customerId, orgId } });
  if (!customer) return { error: "顧客が見つかりません" };

  const stage = String(formData.get("stage") ?? "LEAD");
  const { serviceId, planId } = await resolveServicePlan(
    orgId,
    optStr(formData, "serviceId"),
    optStr(formData, "planId")
  );
  const expectedRaw = optStr(formData, "expectedCloseDate");
  const closing = stage === "WON" || stage === "LOST";

  const deal = await db.deal.create({
    data: {
      orgId,
      customerId,
      title,
      stage,
      serviceId,
      planId,
      initialFee: toNum(formData, "initialFee"),
      monthlyFee: toNum(formData, "monthlyFee"),
      probability: Math.max(0, Math.min(100, Math.round(toNum(formData, "probability")))),
      expectedCloseDate: expectedRaw ? new Date(expectedRaw) : null,
      closedAt: closing ? new Date() : null,
      lostReason: stage === "LOST" ? optStr(formData, "lostReason") : null,
      memo: optStr(formData, "memo"),
      customData: await buildCustomData(orgId, formData),
    },
  });

  revalidatePath("/deals");
  redirect(`/deals/${deal.id}`);
}

export async function updateDeal(_prev: DealFormState, formData: FormData): Promise<DealFormState> {
  const session = await requireSession();
  const orgId = session.org.id;

  const id = String(formData.get("id") ?? "");
  const existing = await db.deal.findFirst({ where: { id, orgId } });
  if (!existing) return { error: "案件が見つかりません" };

  const customerId = String(formData.get("customerId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!customerId || !title) return { error: "顧客とタイトルは必須です" };

  const customer = await db.customer.findFirst({ where: { id: customerId, orgId } });
  if (!customer) return { error: "顧客が見つかりません" };

  const stage = String(formData.get("stage") ?? "LEAD");
  const { serviceId, planId } = await resolveServicePlan(
    orgId,
    optStr(formData, "serviceId"),
    optStr(formData, "planId")
  );
  const expectedRaw = optStr(formData, "expectedCloseDate");
  const closing = stage === "WON" || stage === "LOST";

  await db.deal.update({
    where: { id },
    data: {
      customerId,
      title,
      stage,
      serviceId,
      planId,
      initialFee: toNum(formData, "initialFee"),
      monthlyFee: toNum(formData, "monthlyFee"),
      probability: Math.max(0, Math.min(100, Math.round(toNum(formData, "probability")))),
      expectedCloseDate: expectedRaw ? new Date(expectedRaw) : null,
      // 受注/失注へ変更した時のみ closedAt を設定、進行中に戻したらクリア
      closedAt: closing ? existing.closedAt ?? new Date() : null,
      lostReason: stage === "LOST" ? optStr(formData, "lostReason") : null,
      memo: optStr(formData, "memo"),
      customData: await buildCustomData(orgId, formData),
    },
  });

  revalidatePath("/deals");
  revalidatePath(`/deals/${id}`);
  redirect(`/deals/${id}`);
}

export async function updateDealStage(id: string, stage: string) {
  const session = await requireSession();
  const orgId = session.org.id;
  if (!(DEAL_STAGES as readonly string[]).includes(stage)) return;

  const deal = await db.deal.findFirst({ where: { id, orgId } });
  if (!deal) return;

  const closing = stage === "WON" || stage === "LOST";
  await db.deal.update({
    where: { id },
    data: { stage, closedAt: closing ? deal.closedAt ?? new Date() : null },
  });

  revalidatePath("/deals");
  revalidatePath(`/deals/${id}`);
}

// 受注案件から契約を1クリックで作成し、そのまま手続きチェックリスト画面に遷移する。
// 案件の顧客・サービス/プラン・金額をそのまま引き継ぐ (旧 /contracts/new のフルフォーム入力は経由しない)。
export async function startContractFromDeal(dealId: string) {
  const session = await requireSession();
  const orgId = session.org.id;

  const deal = await db.deal.findFirst({ where: { id: dealId, orgId } });
  if (!deal || deal.stage !== "WON") return;

  const existing = await db.contract.findFirst({ where: { dealId: deal.id, orgId } });
  if (existing) redirect(`/contracts/${existing.id}`);

  if (!deal.serviceId) {
    redirect(`/deals/${deal.id}?contractError=service_required`);
  }

  const contract = await db.contract.create({
    data: {
      orgId,
      customerId: deal.customerId,
      dealId: deal.id,
      serviceId: deal.serviceId,
      planId: deal.planId,
      name: deal.title,
      initialFee: deal.initialFee,
      monthlyFee: deal.monthlyFee,
      startDate: new Date(),
    },
  });

  revalidatePath("/deals");
  revalidatePath(`/deals/${deal.id}`);
  revalidatePath("/contracts");
  revalidatePath("/revenue");
  redirect(`/contracts/${contract.id}`);
}

export async function deleteDeal(id: string) {
  const session = await requireSession();
  const orgId = session.org.id;
  const deal = await db.deal.findFirst({ where: { id, orgId } });
  if (!deal) return;

  await db.deal.delete({ where: { id } });
  revalidatePath("/deals");
  redirect("/deals");
}
