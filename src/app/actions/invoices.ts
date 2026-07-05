"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { INVOICE_DIRECTIONS, type InvoiceDirection } from "@/lib/constants";

const PATH = "/team/invoices";

function optStr(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}
function toNum(formData: FormData, key: string): number {
  const v = Number(formData.get(key));
  return Number.isFinite(v) ? v : 0;
}

export async function createInvoice(formData: FormData) {
  const session = await requireSession();
  const orgId = session.org.id;

  const dirRaw = String(formData.get("direction") ?? "ISSUED");
  const direction: InvoiceDirection = INVOICE_DIRECTIONS.includes(dirRaw as InvoiceDirection)
    ? (dirRaw as InvoiceDirection)
    : "ISSUED";

  let counterparty = String(formData.get("counterparty") ?? "").trim();
  let customerId: string | null = null;
  const customerRaw = optStr(formData, "customerId");
  if (direction === "ISSUED" && customerRaw) {
    const customer = await db.customer.findFirst({ where: { id: customerRaw, orgId } });
    if (customer) {
      customerId = customer.id;
      if (!counterparty) counterparty = customer.name;
    }
  }
  if (!counterparty) return; // 取引先は必須

  const issue = optStr(formData, "issueDate");
  const due = optStr(formData, "dueDate");

  await db.invoice.create({
    data: {
      orgId,
      direction,
      customerId,
      counterparty,
      invoiceNo: optStr(formData, "invoiceNo"),
      amount: toNum(formData, "amount"),
      taxRate: Number.isFinite(Number(formData.get("taxRate"))) ? Number(formData.get("taxRate")) : 10,
      registrationNo: optStr(formData, "registrationNo"),
      issueDate: issue ? new Date(issue) : null,
      dueDate: due ? new Date(due) : null,
      memo: optStr(formData, "memo"),
    },
  });
  revalidatePath(PATH);
}

// 必要項目 / 締切日同意 の真偽フラグをオン・オフする。
type InvoiceBool = "itemsComplete" | "dueDateAgreed";
export async function toggleInvoiceFlag(id: string, field: InvoiceBool, on: boolean) {
  const session = await requireSession();
  const inv = await db.invoice.findFirst({ where: { id, orgId: session.org.id } });
  if (!inv) return;
  await db.invoice.update({ where: { id }, data: { [field]: on } });
  revalidatePath(PATH);
}

// 送付/受領 (deliveredAt) と 入金/支払 (settledAt) の各日付をオン・オフする。
type InvoiceDate = "deliveredAt" | "settledAt";
export async function toggleInvoiceDate(id: string, field: InvoiceDate, on: boolean) {
  const session = await requireSession();
  const inv = await db.invoice.findFirst({ where: { id, orgId: session.org.id } });
  if (!inv) return;
  await db.invoice.update({ where: { id }, data: { [field]: on ? new Date() : null } });
  revalidatePath(PATH);
}

export async function deleteInvoice(id: string) {
  const session = await requireSession();
  await db.invoice.deleteMany({ where: { id, orgId: session.org.id } });
  revalidatePath(PATH);
}
