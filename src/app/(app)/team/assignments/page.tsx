import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { currentMonthKey, addMonths, formatMonthJa } from "@/lib/months";
import { PageHeader, Card, Badge, btnPrimary, btnSecondary, selectCls, inputCls, labelCls, EmptyState } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { TeamUpgradeNotice } from "@/components/team-upgrade-notice";
import { currentUserHasTeamAccess } from "@/lib/plan";
import { InlineNumber } from "@/components/inline-edit";
import { createAssignment, updateAssignmentHours, deleteAssignment } from "@/app/actions/assignments";
import { MemberHoursChart, MonthlyTrendChart } from "./charts";

export const metadata = { title: "アサイン管理" };

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await requireSession();
  const orgId = session.org.id;
  const sp = await searchParams;

  if (!(await currentUserHasTeamAccess(orgId))) {
    return (
      <div>
        <PageHeader title="🙋 アサイン管理" description="メンバーの担当・月間工数を案件横断で可視化" />
        <TeamUpgradeNotice
          title="アサイン管理はチーム機能です"
          description="チームプランにアップグレードすると、だれがどの顧客・案件にどのくらいの月間工数をかけているかを可視化できます。"
        />
      </div>
    );
  }

  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : currentMonthKey();
  const trendFrom = addMonths(month, -5);

  const [members, assignments, trendRows, customers, deals] = await Promise.all([
    db.membership.findMany({
      where: { orgId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    db.assignment.findMany({
      where: { orgId, month },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        deal: { select: { id: true, title: true } },
      },
    }),
    db.assignment.findMany({
      where: { orgId, month: { gte: trendFrom, lte: month } },
      select: { month: true, userId: true, hours: true, user: { select: { name: true } } },
    }),
    db.customer.findMany({ where: { orgId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.deal.findMany({ where: { orgId }, orderBy: { createdAt: "desc" }, select: { id: true, title: true } }),
  ]);

  // ===== 集計 (メンバー単位) =====
  const totalHours = assignments.reduce((s, a) => s + a.hours, 0);
  const byMember = new Map<string, { name: string; total: number; rows: typeof assignments }>();
  for (const m of members) {
    byMember.set(m.user.id, { name: m.user.name, total: 0, rows: [] });
  }
  for (const a of assignments) {
    const entry = byMember.get(a.userId) ?? { name: a.user.name, total: 0, rows: [] };
    entry.total += a.hours;
    entry.rows.push(a);
    byMember.set(a.userId, entry);
  }

  // 対象月チャート: メンバー × 顧客/案件の積み上げ
  const targetLabel = (a: (typeof assignments)[number]) =>
    a.deal?.title ?? a.customer?.name ?? "その他";
  const targets = [...new Set(assignments.map(targetLabel))];
  const memberChartData = [...byMember.values()].map((m) => {
    const row: Record<string, string | number> = { member: m.name };
    for (const t of targets) row[t] = 0;
    for (const a of m.rows) row[targetLabel(a)] = (Number(row[targetLabel(a)]) || 0) + a.hours;
    return row;
  });

  // 推移チャート: 月 × メンバーの積み上げ (直近6ヶ月)
  const trendMonths = Array.from({ length: 6 }, (_, i) => addMonths(trendFrom, i));
  const memberNames = members.map((m) => m.user.name);
  const trendData = trendMonths.map((mk) => {
    const row: Record<string, string | number> = { month: mk };
    for (const name of memberNames) row[name] = 0;
    for (const r of trendRows) {
      if (r.month === mk) row[r.user.name] = (Number(row[r.user.name]) || 0) + r.hours;
    }
    return row;
  });

  const prevMonth = addMonths(month, -1);
  const nextMonth = addMonths(month, 1);

  return (
    <div>
      <PageHeader
        title="🙋 アサイン管理"
        description="だれがどの顧客・案件にどのくらいの月間工数 (h) をかけているかを、チームメンバー単位で管理します"
        actions={
          <div className="flex items-center gap-1">
            <Link href={`/team/assignments?month=${prevMonth}`} className={btnSecondary}>←</Link>
            <span className="px-2 text-sm font-semibold text-slate-800">{formatMonthJa(month)}</span>
            <Link href={`/team/assignments?month=${nextMonth}`} className={btnSecondary}>→</Link>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500">メンバー</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{members.length} 名</p>
          <p className="mt-0.5 text-[11px] text-slate-400">このチームの登録メンバー</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">合計工数</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{totalHours} h</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{formatMonthJa(month)} のアサイン合計</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">アサイン</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{assignments.length} 件</p>
          <p className="mt-0.5 text-[11px] text-slate-400">顧客・案件への割り当て</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">1人あたり平均</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {members.length > 0 ? Math.round((totalHours / members.length) * 10) / 10 : 0} h
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">合計 ÷ メンバー数</p>
        </Card>
      </div>

      {/* 稼働状況グラフ */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">
            {formatMonthJa(month)} のメンバー別稼働 (顧客・案件の内訳)
          </h2>
          {assignments.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-400">この月のアサインはまだありません</p>
          ) : (
            <MemberHoursChart data={memberChartData} series={targets} />
          )}
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">直近6ヶ月の稼働推移 (メンバー別)</h2>
          {trendRows.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-400">データが登録されるとここに推移が表示されます</p>
          ) : (
            <MonthlyTrendChart data={trendData} series={memberNames} />
          )}
        </Card>
      </div>

      {/* アサイン登録 */}
      <Card className="mb-6 p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">アサインを追加 ({formatMonthJa(month)})</h2>
        <form action={createAssignment} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input type="hidden" name="month" value={month} />
          <div>
            <label className={labelCls}>メンバー *</label>
            <select name="userId" required className={`${selectCls} w-full`}>
              {members.map((m) => (
                <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>顧客 (任意)</label>
            <select name="customerId" defaultValue="" className={`${selectCls} w-full`}>
              <option value="">— 選択しない —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>案件 (任意)</label>
            <select name="dealId" defaultValue="" className={`${selectCls} w-full`}>
              <option value="">— 選択しない —</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>月間工数 (h) *</label>
            <input name="hours" type="number" min="0.5" step="0.5" required placeholder="例: 20" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>メモ (任意)</label>
            <input name="memo" placeholder="担当領域など" className={inputCls} />
          </div>
          <div className="sm:col-span-2 lg:col-span-5">
            <button type="submit" className={btnPrimary}>＋ アサインを追加</button>
          </div>
        </form>
      </Card>

      {/* メンバー別一覧 */}
      {members.length === 0 ? (
        <EmptyState title="メンバーがいません" description="設定 → メンバーから招待すると、ここでアサインを管理できます。" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {[...byMember.entries()].map(([userId, m]) => (
            <Card key={userId} className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">{m.name}</h3>
                <Badge className={m.total > 0 ? "bg-akane-50 text-akane-700" : "bg-slate-100 text-slate-400"}>
                  月間 {m.total} h
                </Badge>
              </div>
              {m.rows.length === 0 ? (
                <p className="text-xs text-slate-400">{formatMonthJa(month)} のアサインはありません</p>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {m.rows.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-slate-700">
                          {a.deal?.title ?? a.customer?.name ?? "その他"}
                          {a.deal && a.customer && (
                            <span className="text-[11px] text-slate-400"> ({a.customer.name})</span>
                          )}
                        </p>
                        {a.memo && <p className="truncate text-[11px] text-slate-400">{a.memo}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <InlineNumber
                          value={a.hours}
                          min={0}
                          max={744}
                          suffix="h"
                          action={updateAssignmentHours.bind(null, a.id)}
                        />
                        <ConfirmButton
                          action={deleteAssignment.bind(null, a.id)}
                          message="このアサインを削除しますか？"
                          className="text-[11px] text-slate-300 hover:text-rose-500"
                        >
                          削除
                        </ConfirmButton>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
