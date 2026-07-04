import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/currency";
import { PageHeader, Card, Badge, EmptyState, PrimaryLink, btnSecondary, selectCls } from "@/components/ui";

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("ja-JP") : "—";
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; serviceId?: string }>;
}) {
  const session = await requireSession();
  const orgId = session.org.id;
  const sp = await searchParams;

  const where: { orgId: string; status?: string; serviceId?: string } = { orgId };
  if (sp.status === "ACTIVE" || sp.status === "ENDED") where.status = sp.status;
  if (sp.serviceId) where.serviceId = sp.serviceId;

  const [contracts, services, activeContracts] = await Promise.all([
    db.contract.findMany({
      where,
      include: { customer: true, service: true, plan: true, deal: { select: { id: true, title: true } } },
      orderBy: { startDate: "desc" },
    }),
    db.service.findMany({ where: { orgId, archived: false }, orderBy: { sortOrder: "asc" } }),
    db.contract.findMany({ where: { orgId, status: "ACTIVE" } }),
  ]);

  // 稼働契約の月額を通貨別に集計 (月次経常収益)
  const mrrByCurrency: Record<string, number> = {};
  for (const c of activeContracts) {
    mrrByCurrency[c.currency] = (mrrByCurrency[c.currency] ?? 0) + c.monthlyFee;
  }

  return (
    <>
      <PageHeader
        title="契約管理"
        description="契約は月次売上の自動計算元になります"
        actions={<PrimaryLink href="/contracts/new">＋ 新規契約</PrimaryLink>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-400">稼働契約数</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {activeContracts.length}
            <span className="ml-1 text-sm font-medium text-slate-400">件</span>
          </p>
        </Card>
        <Card className="p-5 sm:col-span-2">
          <p className="text-xs font-medium text-slate-400">月次経常収益 (稼働契約の月額合計)</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-5 gap-y-1">
            {Object.keys(mrrByCurrency).length === 0 ? (
              <p className="text-2xl font-bold text-slate-300">—</p>
            ) : (
              Object.entries(mrrByCurrency).map(([cur, amt]) => (
                <p key={cur} className="text-2xl font-bold text-slate-900">
                  {formatMoney(amt, cur)}
                  <span className="ml-1 text-xs font-medium text-slate-400">/{cur}</span>
                </p>
              ))
            )}
          </div>
        </Card>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <select name="status" defaultValue={sp.status ?? ""} className={selectCls}>
          <option value="">全ステータス</option>
          <option value="ACTIVE">稼働中</option>
          <option value="ENDED">終了</option>
        </select>
        <select name="serviceId" defaultValue={sp.serviceId ?? ""} className={selectCls}>
          <option value="">全サービス</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button type="submit" className={btnSecondary}>
          絞り込み
        </button>
      </form>

      {contracts.length === 0 ? (
        <EmptyState
          title="契約がありません"
          description="受注した案件を契約に変換するか、「新規契約」から登録しましょう。"
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">契約名</th>
                <th className="px-4 py-3 font-medium">顧客</th>
                <th className="px-4 py-3 font-medium">元案件</th>
                <th className="px-4 py-3 font-medium">サービス</th>
                <th className="px-4 py-3 font-medium">プラン</th>
                <th className="px-4 py-3 text-right font-medium">月額</th>
                <th className="px-4 py-3 text-right font-medium">初期費用</th>
                <th className="px-4 py-3 font-medium">開始日</th>
                <th className="px-4 py-3 font-medium">終了日</th>
                <th className="px-4 py-3 font-medium">状態</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/contracts/${c.id}`}
                      className="font-medium text-akane-700 hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.customer.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.deal ? (
                      <Link href={`/deals/${c.deal.id}`} className="hover:underline">
                        {c.deal.title}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: c.service.color }}
                      />
                      {c.service.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.plan?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">
                    {formatMoney(c.monthlyFee, c.currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatMoney(c.initialFee, c.currency)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{fmtDate(c.startDate)}</td>
                  <td className="px-4 py-3 text-slate-600">{fmtDate(c.endDate)}</td>
                  <td className="px-4 py-3">
                    {c.status === "ACTIVE" ? (
                      <Badge className="bg-emerald-100 text-emerald-800">稼働中</Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-600">終了</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
