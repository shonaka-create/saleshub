import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from "@/lib/constants";
import { currentWeeks, overlapsWeek, isOverdue, toInputDate } from "@/lib/weeks";
import { PageHeader, Card, Badge, btnPrimary, btnSecondary, selectCls, inputCls, labelCls, EmptyState } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { TeamUpgradeNotice } from "@/components/team-upgrade-notice";
import { currentUserHasTeamAccess } from "@/lib/plan";
import { InlineSelect, InlineDate, InlineNumber } from "@/components/inline-edit";
import { updateTaskField, createTaskCategory, deleteTaskCategory } from "@/app/actions/tasks";

export const metadata = { title: "WBS (作業分解構成図)" };

const WEEK_COUNT = 14; // 今週を先頭に表示する週数 (過去週は表示しない = 自動削除)
const DAY_MS = 24 * 60 * 60 * 1000;

export default async function WbsPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; dealId?: string }>;
}) {
  const session = await requireSession();
  const orgId = session.org.id;
  const sp = await searchParams;

  if (!(await currentUserHasTeamAccess(orgId))) {
    return (
      <div>
        <PageHeader title="🗂️ WBS (作業分解構成図)" description="タスクを工程単位に分解して進捗を可視化" />
        <TeamUpgradeNotice
          title="WBS はチーム機能です"
          description="チームプランにアップグレードすると、タスクをカテゴリ・週単位のガントで可視化できます。"
        />
      </div>
    );
  }

  const [tasks, categories, customers, deals, members] = await Promise.all([
    db.task.findMany({
      where: {
        orgId,
        ...(sp.customerId ? { customerId: sp.customerId } : {}),
        ...(sp.dealId ? { dealId: sp.dealId } : {}),
      },
      orderBy: [{ startDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      include: {
        customer: { select: { id: true, name: true } },
        deal: { select: { id: true, title: true } },
        assignee: { select: { id: true, name: true } },
      },
    }),
    db.taskCategory.findMany({ where: { orgId }, orderBy: { sortOrder: "asc" } }),
    db.customer.findMany({ where: { orgId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.deal.findMany({ where: { orgId }, orderBy: { createdAt: "desc" }, select: { id: true, title: true } }),
    db.membership.findMany({ where: { orgId }, include: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
  ]);

  const weeks = currentWeeks(WEEK_COUNT);
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));
  const memberOptions = members.map((m) => ({ value: m.user.id, label: m.user.name }));

  // カテゴリごとにグルーピング (未分類は最後)
  const groups: { id: string | null; name: string; tasks: typeof tasks }[] = [
    ...categories.map((c) => ({
      id: c.id as string | null,
      name: c.name,
      tasks: tasks.filter((t) => t.categoryId === c.id),
    })),
    { id: null, name: "未分類", tasks: tasks.filter((t) => t.categoryId === null) },
  ];

  return (
    <div>
      <PageHeader
        title="🗂️ WBS (作業分解構成図)"
        description="タスク管理で設定したタスクを工程 (カテゴリ) 単位に分解し、週次で進捗を可視化します。進捗率と開始日・期限日はその場で編集でき、色塗りは自動反映です"
        actions={<Link href="/team/tasks" className={btnSecondary}>✅ タスク管理へ</Link>}
      />

      {/* フィルター + カテゴリ管理 */}
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-2 text-xs font-semibold text-slate-500">フィルター</h2>
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
            <button type="submit" className={btnSecondary}>絞り込む</button>
            {(sp.customerId || sp.dealId) && (
              <Link href="/team/wbs" className="pb-2 text-xs text-slate-400 hover:text-slate-600">クリア</Link>
            )}
          </form>
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 text-xs font-semibold text-slate-500">カテゴリ (工程)</h2>
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                {c.name}
                <ConfirmButton
                  action={deleteTaskCategory.bind(null, c.id)}
                  message={`カテゴリ「${c.name}」を削除しますか？所属タスクは未分類に移動します。`}
                  className="text-slate-400 hover:text-rose-500"
                >
                  ×
                </ConfirmButton>
              </span>
            ))}
            {categories.length === 0 && (
              <span className="text-xs text-slate-400">例: 開発面 / 実行面 / ビジネスサイド</span>
            )}
          </div>
          <form action={createTaskCategory} className="mt-3 flex items-center gap-2">
            <input name="name" required placeholder="新しいカテゴリ名" className={`${inputCls} max-w-56`} />
            <button type="submit" className={btnPrimary}>＋ 追加</button>
          </form>
        </Card>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="表示できるタスクがありません"
          description="タスク管理でタスクを追加し、開始日・期限日を設定すると週次ガントに自動で色が塗られます。"
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                <th className="px-3 py-2 font-medium">タスク</th>
                <th className="px-2 py-2 font-medium">担当</th>
                <th className="px-2 py-2 font-medium">開始日</th>
                <th className="px-2 py-2 font-medium">期限日</th>
                <th className="px-2 py-2 text-right font-medium">期間(日)</th>
                <th className="px-2 py-2 text-right font-medium">進捗率</th>
                <th className="px-2 py-2 font-medium">進捗状況</th>
                {weeks.map((w, i) => (
                  <th
                    key={w.label}
                    className={`border-l border-slate-100 px-1 py-2 text-center font-medium ${i === 0 ? "text-akane-600" : ""}`}
                  >
                    {w.label}
                    {i === 0 && <span className="block text-[9px]">今週</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                if (group.id === null && group.tasks.length === 0) return null;
                return (
                  <FragmentGroup
                    key={group.id ?? "none"}
                    group={group}
                    weeks={weeks}
                    categoryOptions={categoryOptions}
                    memberOptions={memberOptions}
                  />
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <p className="mt-4 text-xs text-slate-400">
        週の色塗りは開始日〜期限日から自動反映されます。過去の週は自動的に表示から外れ、常に今週が先頭に表示されます。
      </p>
    </div>
  );
}

function FragmentGroup({
  group,
  weeks,
  categoryOptions,
  memberOptions,
}: {
  group: {
    id: string | null;
    name: string;
    tasks: Array<{
      id: string;
      title: string;
      status: string;
      progress: number;
      startDate: Date | null;
      dueDate: Date | null;
      categoryId: string | null;
      assigneeId: string | null;
      customer: { id: string; name: string } | null;
      deal: { id: string; title: string } | null;
      assignee: { id: string; name: string } | null;
    }>;
  };
  weeks: ReturnType<typeof currentWeeks>;
  categoryOptions: { value: string; label: string }[];
  memberOptions: { value: string; label: string }[];
}) {
  return (
    <>
      {/* カテゴリ見出し行 */}
      <tr className="border-y border-slate-200 bg-indigo-50/60">
        <td colSpan={7 + weeks.length} className="px-3 py-1.5 text-xs font-bold text-slate-700">
          {group.name}
          <span className="ml-2 font-normal text-slate-400">{group.tasks.length} 件</span>
        </td>
      </tr>
      {group.tasks.length === 0 && (
        <tr>
          <td colSpan={7 + weeks.length} className="px-3 py-2 text-[11px] text-slate-300">
            このカテゴリのタスクはありません (タスクの「カテゴリ」欄から移動できます)
          </td>
        </tr>
      )}
      {group.tasks.map((t) => {
        const overdueTask = isOverdue(t.dueDate, t.status);
        const done = t.status === "DONE";
        const duration =
          t.startDate && t.dueDate
            ? Math.round((t.dueDate.getTime() - t.startDate.getTime()) / DAY_MS) + 1
            : null;
        return (
          <tr key={t.id} className={`border-b border-slate-50 ${done ? "bg-slate-50/70" : ""}`}>
            <td className="max-w-[240px] px-3 py-1.5">
              <p className={`truncate text-[13px] font-medium ${done ? "text-slate-400" : "text-slate-800"}`}>
                {t.title}
              </p>
              <p className="flex flex-wrap items-center gap-1 text-[11px] text-slate-400">
                {t.customer && <span>{t.customer.name}</span>}
                {t.deal && <span>／{t.deal.title}</span>}
                <Badge className={`${TASK_STATUS_COLORS[t.status]} !text-[10px]`}>{TASK_STATUS_LABELS[t.status]}</Badge>
                {overdueTask && <Badge className="bg-rose-100 !text-[10px] text-rose-700">⚠ 期限切れ</Badge>}
              </p>
              <div className="mt-0.5">
                <InlineSelect
                  value={t.categoryId ?? ""}
                  options={categoryOptions}
                  emptyLabel="未分類"
                  action={updateTaskField.bind(null, t.id, "categoryId")}
                  className="!px-0 text-[11px] !text-slate-400"
                />
              </div>
            </td>
            <td className="px-2 py-1.5">
              <InlineSelect
                value={t.assigneeId ?? ""}
                options={memberOptions}
                emptyLabel="未定"
                action={updateTaskField.bind(null, t.id, "assigneeId")}
              />
            </td>
            <td className="px-2 py-1.5">
              <InlineDate value={toInputDate(t.startDate)} action={updateTaskField.bind(null, t.id, "startDate")} />
            </td>
            <td className={`px-2 py-1.5 ${overdueTask ? "text-rose-600" : ""}`}>
              <InlineDate value={toInputDate(t.dueDate)} action={updateTaskField.bind(null, t.id, "dueDate")} />
            </td>
            <td className="px-2 py-1.5 text-right text-xs text-slate-600">{duration ?? "—"}</td>
            <td className="px-2 py-1.5 text-right">
              <InlineNumber value={t.progress} suffix="%" action={updateTaskField.bind(null, t.id, "progress")} />
            </td>
            <td className="px-2 py-1.5">
              <div className="h-3.5 w-24 overflow-hidden rounded-sm bg-slate-100">
                <div
                  className={`h-full ${done ? "bg-slate-400" : "bg-slate-600"}`}
                  style={{ width: `${t.progress}%` }}
                />
              </div>
            </td>
            {weeks.map((w) => {
              const active = overlapsWeek(t.startDate, t.dueDate, w);
              return (
                <td key={w.label} className="border-l border-slate-100 p-0">
                  <div className={`h-7 w-full min-w-10 ${active ? (done ? "bg-slate-300" : "bg-orange-400/80") : ""}`} />
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}
