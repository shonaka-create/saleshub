import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { TASK_STATUSES, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from "@/lib/constants";
import { isOverdue, todayJst, toInputDate } from "@/lib/weeks";
import { PageHeader, Card, Badge, btnPrimary, btnSecondary, inputCls, selectCls, labelCls, EmptyState } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { TeamUpgradeNotice } from "@/components/team-upgrade-notice";
import { currentUserHasTeamAccess } from "@/lib/plan";
import { InlineSelect, InlineDate, InlineNumber } from "@/components/inline-edit";
import { createTask, updateTaskField, deleteTask } from "@/app/actions/tasks";

export const metadata = { title: "タスク管理" };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; dealId?: string; assigneeId?: string; status?: string }>;
}) {
  const session = await requireSession();
  const orgId = session.org.id;
  const sp = await searchParams;

  if (!(await currentUserHasTeamAccess(orgId))) {
    return (
      <div>
        <PageHeader title="✅ タスク管理" description="顧客・案件に紐づくタスクをチームで管理" />
        <TeamUpgradeNotice
          title="タスク管理はチーム機能です"
          description="チームプランにアップグレードすると、顧客・案件に紐づくタスクをチームで割り当て・進捗共有できます。"
        />
      </div>
    );
  }

  const [tasks, customers, deals, categories, members] = await Promise.all([
    db.task.findMany({
      where: {
        orgId,
        ...(sp.customerId ? { customerId: sp.customerId } : {}),
        ...(sp.dealId ? { dealId: sp.dealId } : {}),
        ...(sp.assigneeId ? { assigneeId: sp.assigneeId } : {}),
      },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      include: {
        customer: { select: { id: true, name: true } },
        deal: { select: { id: true, title: true } },
        category: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    }),
    db.customer.findMany({ where: { orgId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.deal.findMany({ where: { orgId }, orderBy: { createdAt: "desc" }, select: { id: true, title: true } }),
    db.taskCategory.findMany({ where: { orgId }, orderBy: { sortOrder: "asc" } }),
    db.membership.findMany({ where: { orgId }, include: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
  ]);

  const today = todayJst();
  const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const overdue = tasks.filter((t) => isOverdue(t.dueDate, t.status));
  const dueThisWeek = tasks.filter(
    (t) => t.status !== "DONE" && t.dueDate && t.dueDate >= today && t.dueDate < weekEnd
  );
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS");

  const tiles = [
    { label: "タスク", value: `${tasks.length} 件`, sub: "表示中の全タスク" },
    { label: "進行中", value: `${inProgress.length} 件`, sub: TASK_STATUS_LABELS.IN_PROGRESS },
    { label: "期限切れ", value: `${overdue.length} 件`, sub: "期限超過・未完了", warn: overdue.length > 0 },
    { label: "今週期限", value: `${dueThisWeek.length} 件`, sub: "7日以内に期限" },
  ];

  const customerOptions = customers.map((c) => ({ value: c.id, label: c.name }));
  const dealOptions = deals.map((d) => ({ value: d.id, label: d.title }));
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));
  const memberOptions = members.map((m) => ({ value: m.user.id, label: m.user.name }));

  const statusGroups = TASK_STATUSES.map((status) => ({
    status,
    tasks: tasks.filter((t) => t.status === status),
  })).filter((g) => !sp.status || g.status === sp.status);

  return (
    <div>
      <PageHeader
        title="✅ タスク管理"
        description="顧客・案件に紐づけてタスクを管理します。各項目はその場で編集でき、WBS にも自動反映されます"
        actions={<Link href="/team/wbs" className={btnSecondary}>🗂️ WBS で見る</Link>}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <p className="text-xs text-slate-500">{t.label}</p>
            <p className={`mt-1 text-xl font-bold ${t.warn ? "text-rose-600" : "text-slate-900"}`}>{t.value}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{t.sub}</p>
          </Card>
        ))}
      </div>

      {/* 新規タスク */}
      <Card className="mb-4 p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">タスクを追加</h2>
        <form action={createTask} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>タイトル *</label>
            <input name="title" required placeholder="例: トップページのデザイン修正" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>顧客 (任意)</label>
            <select name="customerId" defaultValue={sp.customerId ?? ""} className={`${selectCls} w-full`}>
              <option value="">— 選択しない —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>案件 (任意)</label>
            <select name="dealId" defaultValue={sp.dealId ?? ""} className={`${selectCls} w-full`}>
              <option value="">— 選択しない —</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>担当メンバー</label>
            <select name="assigneeId" defaultValue="" className={`${selectCls} w-full`}>
              <option value="">— 未定 —</option>
              {members.map((m) => (
                <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>カテゴリ (WBS)</label>
            <select name="categoryId" defaultValue="" className={`${selectCls} w-full`}>
              <option value="">— 未分類 —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>開始日</label>
            <input name="startDate" type="date" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>期限日</label>
            <input name="dueDate" type="date" className={inputCls} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className={labelCls}>詳細メモ (任意)</label>
            <input name="description" placeholder="タスクの補足・依頼内容など" className={inputCls} />
          </div>
          <div>
            <button type="submit" className={btnPrimary}>＋ タスクを追加</button>
          </div>
        </form>
      </Card>

      {/* フィルター */}
      <Card className="mb-4 p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div>
            <label className={labelCls}>顧客</label>
            <select name="customerId" defaultValue={sp.customerId ?? ""} className={selectCls}>
              <option value="">すべて</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>案件</label>
            <select name="dealId" defaultValue={sp.dealId ?? ""} className={selectCls}>
              <option value="">すべて</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>担当</label>
            <select name="assigneeId" defaultValue={sp.assigneeId ?? ""} className={selectCls}>
              <option value="">すべて</option>
              {members.map((m) => (
                <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>ステータス</label>
            <select name="status" defaultValue={sp.status ?? ""} className={selectCls}>
              <option value="">すべて</option>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <button type="submit" className={btnSecondary}>絞り込む</button>
          {(sp.customerId || sp.dealId || sp.assigneeId || sp.status) && (
            <Link href="/team/tasks" className="pb-2 text-xs text-slate-400 hover:text-slate-600">クリア</Link>
          )}
        </form>
      </Card>

      {tasks.length === 0 ? (
        <EmptyState
          title="タスクがありません"
          description="上のフォームからタスクを追加すると、ここと WBS に表示されます。"
        />
      ) : (
        <div className="space-y-6">
          {statusGroups.map((group) => (
            <div key={group.status}>
              <div className="mb-2 flex items-center gap-2">
                <Badge className={TASK_STATUS_COLORS[group.status]}>{TASK_STATUS_LABELS[group.status]}</Badge>
                <span className="text-xs text-slate-400">{group.tasks.length} 件</span>
              </div>
              <Card className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] text-slate-400">
                      <th className="px-4 py-2 font-medium">タスク</th>
                      <th className="px-2 py-2 font-medium">顧客</th>
                      <th className="px-2 py-2 font-medium">案件</th>
                      <th className="px-2 py-2 font-medium">担当</th>
                      <th className="px-2 py-2 font-medium">カテゴリ</th>
                      <th className="px-2 py-2 font-medium">ステータス</th>
                      <th className="px-2 py-2 font-medium">開始日</th>
                      <th className="px-2 py-2 font-medium">期限日</th>
                      <th className="px-2 py-2 font-medium">進捗</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {group.tasks.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-4 py-4 text-xs text-slate-300">
                          このステータスのタスクはありません
                        </td>
                      </tr>
                    )}
                    {group.tasks.map((t) => {
                      const overdueTask = isOverdue(t.dueDate, t.status);
                      return (
                        <tr key={t.id} className={overdueTask ? "bg-rose-50/50" : undefined}>
                          <td className="max-w-[260px] px-4 py-2">
                            <p className="truncate font-medium text-slate-800">{t.title}</p>
                            {t.description && <p className="truncate text-[11px] text-slate-400">{t.description}</p>}
                            {overdueTask && <Badge className="mt-1 bg-rose-100 text-rose-700">⚠ 期限切れ</Badge>}
                          </td>
                          <td className="px-2 py-2">
                            <InlineSelect
                              value={t.customerId ?? ""}
                              options={customerOptions}
                              emptyLabel="—"
                              action={updateTaskField.bind(null, t.id, "customerId")}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <InlineSelect
                              value={t.dealId ?? ""}
                              options={dealOptions}
                              emptyLabel="—"
                              action={updateTaskField.bind(null, t.id, "dealId")}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <InlineSelect
                              value={t.assigneeId ?? ""}
                              options={memberOptions}
                              emptyLabel="未定"
                              action={updateTaskField.bind(null, t.id, "assigneeId")}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <InlineSelect
                              value={t.categoryId ?? ""}
                              options={categoryOptions}
                              emptyLabel="未分類"
                              action={updateTaskField.bind(null, t.id, "categoryId")}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <InlineSelect
                              value={t.status}
                              options={TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABELS[s] }))}
                              action={updateTaskField.bind(null, t.id, "status")}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <InlineDate
                              value={toInputDate(t.startDate)}
                              action={updateTaskField.bind(null, t.id, "startDate")}
                            />
                          </td>
                          <td className={`px-2 py-2 ${overdueTask ? "text-rose-600" : ""}`}>
                            <InlineDate
                              value={toInputDate(t.dueDate)}
                              action={updateTaskField.bind(null, t.id, "dueDate")}
                              className={overdueTask ? "text-rose-600" : ""}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-1.5">
                              <InlineNumber
                                value={t.progress}
                                suffix="%"
                                action={updateTaskField.bind(null, t.id, "progress")}
                              />
                              <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-akane-500"
                                  style={{ width: `${t.progress}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <ConfirmButton
                              action={deleteTask.bind(null, t.id)}
                              message={`「${t.title}」を削除しますか？`}
                              className="text-[11px] text-slate-300 hover:text-rose-500"
                            >
                              削除
                            </ConfirmButton>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
