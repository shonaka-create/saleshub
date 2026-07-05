import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/currency";
import { recurringMonthlyFee, oneTimeFeeAtStart, BILLING_CYCLE_LABELS } from "@/lib/constants";
import { monthKey, currentMonthKey, formatMonthJa } from "@/lib/months";
import { PageHeader, Card, Badge, EmptyState, PrimaryLink, btnSecondary, selectCls } from "@/components/ui";
import { ContractsTabs } from "./tabs";

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

  const [contracts, services, activeContracts, totalSteps] = await Promise.all([
    db.contract.findMany({
      where,
      include: {
        customer: true,
        service: true,
        plan: true,
        deal: { select: { id: true, title: true } },
        steps: { select: { completedAt: true } },
      },
      orderBy: { startDate: "desc" },
    }),
    db.service.findMany({ where: { orgId, archived: false }, orderBy: { sortOrder: "asc" } }),
    db.contract.findMany({ where: { orgId, status: "ACTIVE" } }),
    db.contractStepDef.count({ where: { orgId } }),
  ]);

  // 今月の売上: 頻度に応じた稼働契約の売上 + 今月開始した契約の初期費用/単月本体
  const thisMonth = currentMonthKey();
  const thisMonthSales = activeContracts.reduce((sum, c) => {
    let amount = recurringMonthlyFee(c.billingCycle, c.monthlyFee);
    if (monthKey(c.startDate) === thisMonth) {
      amount += oneTimeFeeAtStart(c.billingCycle, c.initialFee, c.monthlyFee);
    }
    return sum + amount;
  }, 0);

  return (
    <>
      <PageHeader
        title="契約管理"
        description="契約は月次売上の自動計算元になります"
        actions={<PrimaryLink href="/contracts/new">＋ 新規契約</PrimaryLink>}
      />
      <ContractsTabs />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-400">稼働契約数</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {activeContracts.length}
            <span className="ml-1 text-sm font-medium text-slate-400">件</span>
          </p>
        </Card>
        <Card className="p-5 sm:col-span-2">
          <p className="text-xs font-medium text-slate-400">
            今月の売上（{formatMonthJa(thisMonth)}）
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {activeContracts.length === 0 ? "—" : formatMoney(thisMonthSales, session.org.baseCurrency)}
          </p>
          <p className="mt-1 text-xs text-slate-400">稼働契約の月額 ＋ 今月開始した契約の初期費用</p>
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
                <th className="px-4 py-3 font-medium">頻度</th>
                <th className="px-4 py-3 text-right font-medium">金額</th>
                <th className="px-4 py-3 text-right font-medium">初期費用</th>
                <th className="px-4 py-3 font-medium">開始日</th>
                <th className="px-4 py-3 font-medium">終了日</th>
                <th className="px-4 py-3 font-medium">状態</th>
                <th className="px-4 py-3 font-medium">手続き進捗</th>
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
                  <td className="px-4 py-3 text-slate-600">
                    <Badge className="bg-slate-100 text-slate-600">
                      {BILLING_CYCLE_LABELS[c.billingCycle] ?? "毎月"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">
                    {formatMoney(c.monthlyFee, session.org.baseCurrency)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatMoney(c.initialFee, session.org.baseCurrency)}
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
                  <td className="px-4 py-3 text-slate-600">
                    {totalSteps === 0 ? (
                      "—"
                    ) : (
                      <span
                        className={
                          c.steps.filter((s) => s.completedAt !== null).length === totalSteps
                            ? "font-medium text-emerald-600"
                            : ""
                        }
                      >
                        {c.steps.filter((s) => s.completedAt !== null).length}/{totalSteps}
                      </span>
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
