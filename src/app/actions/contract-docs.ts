"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const PATH = "/team/contract-docs";

function optStr(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

export async function createContractDoc(formData: FormData) {
  const session = await requireSession();
  const orgId = session.org.id;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  // 顧客を選んだ場合は相手方名を自動補完 (未入力時)
  let customerId: string | null = null;
  let counterparty = String(formData.get("counterparty") ?? "").trim();
  const customerRaw = optStr(formData, "customerId");
  if (customerRaw) {
    const customer = await db.customer.findFirst({ where: { id: customerRaw, orgId } });
    if (customer) {
      customerId = customer.id;
      if (!counterparty) counterparty = customer.name;
    }
  }

  let contractId: string | null = null;
  const contractRaw = optStr(formData, "contractId");
  if (contractRaw) {
    const contract = await db.contract.findFirst({ where: { id: contractRaw, orgId } });
    if (contract) contractId = contract.id;
  }

  await db.contractDoc.create({
    data: {
      orgId,
      customerId,
      contractId,
      title,
      counterparty,
      fileUrl: optStr(formData, "fileUrl"),
      memo: optStr(formData, "memo"),
    },
  });
  revalidatePath(PATH);
}

// 送付 / 締結 / 保管 の各チェックポイントを日付でオン・オフする。
type DocStage = "sent" | "agreed" | "stored";
const STAGE_FIELD: Record<DocStage, "sentAt" | "agreedAt" | "storedAt"> = {
  sent: "sentAt",
  agreed: "agreedAt",
  stored: "storedAt",
};

export async function toggleContractDocStage(id: string, stage: DocStage, on: boolean) {
  const session = await requireSession();
  const doc = await db.contractDoc.findFirst({ where: { id, orgId: session.org.id } });
  if (!doc) return;
  await db.contractDoc.update({
    where: { id },
    data: { [STAGE_FIELD[stage]]: on ? new Date() : null },
  });
  revalidatePath(PATH);
}

export async function deleteContractDoc(id: string) {
  const session = await requireSession();
  await db.contractDoc.deleteMany({ where: { id, orgId: session.org.id } });
  revalidatePath(PATH);
}
