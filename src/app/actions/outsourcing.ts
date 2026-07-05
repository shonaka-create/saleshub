"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const PATH = "/team/outsourcing-costs";

function optStr(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}
function toNum(formData: FormData, key: string): number {
  const v = Number(formData.get(key));
  return Number.isFinite(v) ? v : 0;
}
function optNum(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (raw === "") return null;
  const v = Number(raw);
  return Number.isFinite(v) ? v : null;
}

// ===== 委託先 =====

export async function createSubcontractor(formData: FormData) {
  const session = await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.subcontractor.create({
    data: {
      orgId: session.org.id,
      name,
      role: optStr(formData, "role"),
      contact: optStr(formData, "contact"),
    },
  });
  revalidatePath(PATH);
}

export async function deleteSubcontractor(id: string) {
  const session = await requireSession();
  await db.subcontractor.deleteMany({ where: { id, orgId: session.org.id } });
  revalidatePath(PATH);
}

// ===== 稼働ログ (だれが・いつ・何を・いくら) =====

export async function createWork(formData: FormData) {
  const session = await requireSession();
  const orgId = session.org.id;

  const subcontractorId = String(formData.get("subcontractorId") ?? "");
  const task = String(formData.get("task") ?? "").trim();
  const sub = await db.subcontractor.findFirst({ where: { id: subcontractorId, orgId } });
  if (!sub || !task) return;

  let contractId: string | null = null;
  const contractRaw = optStr(formData, "contractId");
  if (contractRaw) {
    const contract = await db.contract.findFirst({ where: { id: contractRaw, orgId } });
    if (contract) contractId = contract.id;
  }

  const workedRaw = optStr(formData, "workedOn");
  await db.outsourcingWork.create({
    data: {
      orgId,
      subcontractorId,
      workedOn: workedRaw ? new Date(workedRaw) : new Date(),
      performer: String(formData.get("performer") ?? "").trim(),
      task,
      hours: optNum(formData, "hours"),
      amount: toNum(formData, "amount"),
      contractId,
      memo: optStr(formData, "memo"),
    },
  });
  revalidatePath(PATH);
}

export async function deleteWork(id: string) {
  const session = await requireSession();
  await db.outsourcingWork.deleteMany({ where: { id, orgId: session.org.id } });
  revalidatePath(PATH);
}

// 稼働を「自社の費用として勘定した月 (YYYY-MM)」を記録/解除する。
// on のとき workedOn の月で計上済みにする。
export async function toggleWorkCounted(id: string, on: boolean) {
  const session = await requireSession();
  const work = await db.outsourcingWork.findFirst({ where: { id, orgId: session.org.id } });
  if (!work) return;
  const month = `${work.workedOn.getFullYear()}-${String(work.workedOn.getMonth() + 1).padStart(2, "0")}`;
  await db.outsourcingWork.update({
    where: { id },
    data: { countedMonth: on ? month : null },
  });
  revalidatePath(PATH);
}
