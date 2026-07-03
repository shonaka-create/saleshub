"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

// 活動履歴は顧客単位で一元管理する (案件で記録しても customerId が必ず付く)。
// そのため顧客・案件・契約のどのページからでも同じ履歴が参照できる。

function revalidateActivityPages(customerId: string, dealId: string | null, path: string) {
  revalidatePath(`/customers/${customerId}`);
  if (dealId) revalidatePath(`/deals/${dealId}`);
  if (path) revalidatePath(path);
}

export async function addActivity(formData: FormData) {
  const session = await requireSession();
  const orgId = session.org.id;
  const customerId = String(formData.get("customerId") ?? "");
  const dealId = String(formData.get("dealId") ?? "") || null;
  const type = String(formData.get("type") ?? "NOTE");
  const content = String(formData.get("content") ?? "").trim();
  const path = String(formData.get("path") ?? "");
  if (!customerId || !content) return;

  const customer = await db.customer.findFirst({
    where: { id: customerId, orgId },
    select: { id: true },
  });
  if (!customer) return;

  if (dealId) {
    const deal = await db.deal.findFirst({ where: { id: dealId, orgId }, select: { id: true } });
    if (!deal) return;
  }

  await db.activity.create({
    data: {
      orgId,
      customerId,
      dealId,
      userId: session.user.id,
      type,
      content,
    },
  });
  revalidateActivityPages(customerId, dealId, path);
}

export async function deleteActivity(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  const customerId = String(formData.get("customerId") ?? "");
  const dealId = String(formData.get("dealId") ?? "") || null;
  const path = String(formData.get("path") ?? "");
  if (id) {
    await db.activity.deleteMany({ where: { id, orgId: session.org.id } });
  }
  if (customerId) revalidateActivityPages(customerId, dealId, path);
}
