"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { TASK_STATUSES } from "@/lib/constants";

// タスクは /team/tasks と /team/wbs の両方に表示されるため、両パスを再検証する
const PATHS = ["/team/tasks", "/team/wbs"];
function revalidate() {
  for (const p of PATHS) revalidatePath(p);
}

function optStr(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}
function optDate(formData: FormData, key: string): Date | null {
  const v = optStr(formData, key);
  return v ? new Date(v) : null;
}

// 紐付け先 (顧客/案件/メンバー) が自組織のものであることを検証して id を返す
async function validCustomerId(orgId: string, id: string | null): Promise<string | null> {
  if (!id) return null;
  const c = await db.customer.findFirst({ where: { id, orgId }, select: { id: true } });
  return c?.id ?? null;
}
async function validDealId(orgId: string, id: string | null): Promise<string | null> {
  if (!id) return null;
  const d = await db.deal.findFirst({ where: { id, orgId }, select: { id: true } });
  return d?.id ?? null;
}
async function validAssigneeId(orgId: string, id: string | null): Promise<string | null> {
  if (!id) return null;
  const m = await db.membership.findFirst({ where: { userId: id, orgId }, select: { userId: true } });
  return m?.userId ?? null;
}
async function validCategoryId(orgId: string, id: string | null): Promise<string | null> {
  if (!id) return null;
  const c = await db.taskCategory.findFirst({ where: { id, orgId }, select: { id: true } });
  return c?.id ?? null;
}

function clampProgress(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

// ===== タスク =====

export async function createTask(formData: FormData) {
  const session = await requireSession();
  const orgId = session.org.id;
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  await db.task.create({
    data: {
      orgId,
      title,
      description: optStr(formData, "description"),
      status: "TODO",
      categoryId: await validCategoryId(orgId, optStr(formData, "categoryId")),
      customerId: await validCustomerId(orgId, optStr(formData, "customerId")),
      dealId: await validDealId(orgId, optStr(formData, "dealId")),
      assigneeId: await validAssigneeId(orgId, optStr(formData, "assigneeId")),
      startDate: optDate(formData, "startDate"),
      dueDate: optDate(formData, "dueDate"),
      progress: clampProgress(Number(formData.get("progress") ?? 0)),
    },
  });
  revalidate();
}

// インライン編集 (Notion 風)。field をホワイトリストで検証して 1 項目だけ更新する。
export async function updateTaskField(id: string, field: string, value: string) {
  const session = await requireSession();
  const orgId = session.org.id;
  const task = await db.task.findFirst({ where: { id, orgId }, select: { id: true } });
  if (!task) return;

  const v = value.trim();
  let data: Record<string, unknown>;
  switch (field) {
    case "title":
      if (!v) return;
      data = { title: v };
      break;
    case "status":
      if (!(TASK_STATUSES as readonly string[]).includes(v)) return;
      // 完了にしたら進捗率も 100% に揃える
      data = v === "DONE" ? { status: v, progress: 100 } : { status: v };
      break;
    case "progress": {
      const progress = clampProgress(Number(v));
      // 進捗率 100% なら完了へ自動反映
      data = progress >= 100 ? { progress, status: "DONE" } : { progress };
      break;
    }
    case "categoryId":
      data = { categoryId: await validCategoryId(orgId, v || null) };
      break;
    case "customerId":
      data = { customerId: await validCustomerId(orgId, v || null) };
      break;
    case "dealId":
      data = { dealId: await validDealId(orgId, v || null) };
      break;
    case "assigneeId":
      data = { assigneeId: await validAssigneeId(orgId, v || null) };
      break;
    case "startDate":
      data = { startDate: v ? new Date(v) : null };
      break;
    case "dueDate":
      data = { dueDate: v ? new Date(v) : null };
      break;
    default:
      return;
  }
  await db.task.update({ where: { id }, data });
  revalidate();
}

export async function deleteTask(id: string) {
  const session = await requireSession();
  await db.task.deleteMany({ where: { id, orgId: session.org.id } });
  revalidate();
}

// ===== WBS カテゴリ =====

export async function createTaskCategory(formData: FormData) {
  const session = await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const max = await db.taskCategory.aggregate({
    where: { orgId: session.org.id },
    _max: { sortOrder: true },
  });
  await db.taskCategory.create({
    data: {
      orgId: session.org.id,
      name: name.slice(0, 30),
      sortOrder: (max._max.sortOrder ?? 0) + 1,
    },
  });
  revalidate();
}

// カテゴリ削除。所属タスクは未分類 (categoryId=null) に戻る。
export async function deleteTaskCategory(id: string) {
  const session = await requireSession();
  await db.taskCategory.deleteMany({ where: { id, orgId: session.org.id } });
  revalidate();
}
