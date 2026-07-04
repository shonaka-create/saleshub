import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/currency";
import { DEAL_STAGE_LABELS, DEAL_STAGE_COLORS } from "@/lib/constants";
import { PageHeader, Card, btnSecondary, btnPrimary } from "@/components/ui";
import { ActivityPanel } from "@/components/activity-panel";
import { DeleteDealButton } from "./delete-deal";
import { startContractFromDeal } from "@/app/actions/deals";

function parseCustomData(json: string): Record<string, string> {
  try {
    const v = JSON.parse(json);
    if (v && typeof v === "object") {
      const out: Record<string, string> = {};
      for (const [k, val] of Object.entries(v)) out[k] = String(val);
      return out;
    }
  } catch {
    /* noop */
  }
  return {};
}

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("ja-JP") : "—";
}

export default async function DealDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ contractError?: string }>;
}) {
  const session = await requireSession();
  const orgId = session.org.id;
  const { id } = await params;
  const sp = await searchParams;

  const deal = await db.deal.findFirst({
    where: { id, orgId },
    include: {
      customer: true,
      service: true,
      plan: true,
      contracts: { select: { id: true, name: true, status: true } },
    },
  });
  if (!deal) notFound();

  // 活動履歴は顧客単位で共有 (顧客・他案件・契約ページで記録した内容もここに表示される)
  const activities = await db.activity.findMany({
    where: { customerId: deal.customerId, orgId },
    include: { user: { select: { name: true } }, deal: { select: { id: true, title: true } } },
    orderBy: { occurredAt: "desc" },
  });

  const [defs] = await Promise.all([
    db.customFieldDef.findMany({ where: { orgId, entity: "deal" }, orderBy: { sortOrder: "asc" } }),
  ]);
  const customData = parseCustomData(deal.customData);
  const stageColor = DEAL_STAGE_COLORS[deal.stage] ?? "#94a3b8";
  const canConvert = deal.stage === "WON" && deal.contracts.length === 0;

  return (
    <>
      <PageHeader
        title={deal.title}
        description={`顧客: ${deal.customer.name}`}
        actions={
          <>
            {canConvert && (
              <form action={startContractFromDeal.bind(null, deal.id)}>
                <button type="submit" className={btnPrimary}>
                  📝 契約手続きを開始
                </button>
              </form>
            )}
            <Link href={`/deals/${deal.id}/edit`} className={btnSecondary}>
              編集
            </Link>
            <DeleteDealButton dealId={deal.id} />
          </>
        }
      />

      {sp.contractError === "service_required" && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          契約手続きを開始するには、先にこの案件の「サービス」を設定してください。
        </div>
      )}

      {canConvert && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm text-emerald-800">
            🎉 この案件は受注済みです。契約手続きを開始すると月次売上に自動計上されます。
          </p>
          <form action={startContractFromDeal.bind(null, deal.id)}>
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              契約手続きを開始
            </button>
          </form>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <span
                className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: stageColor }}
              >
                {DEAL_STAGE_LABELS[deal.stage]}
              </span>
              {deal.closedAt && (
                <span className="text-xs text-slate-400">クローズ日: {fmtDate(deal.closedAt)}</span>
              )}
            </div>

            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-slate-400">顧客</dt>
                <dd className="mt-0.5 text-sm">
                  <Link href={`/customers/${deal.customerId}`} className="font-medium text-akane-700 hover:underline">
                    {deal.customer.name}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-400">サービス / プラン</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-700">
                  {deal.service ? (
                    <>
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: deal.service.color }}
                      />
                      {deal.service.name}
                      {deal.plan && <span className="text-slate-400">/ {deal.plan.name}</span>}
                    </>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-400">月額</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-800">
                  {formatMoney(deal.monthlyFee, session.org.baseCurrency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-400">初期費用</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-800">
                  {formatMoney(deal.initialFee, session.org.baseCurrency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-400">受注予定日</dt>
                <dd className="mt-0.5 text-sm text-slate-700">{fmtDate(deal.expectedCloseDate)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-400">受注確度</dt>
                <dd className="mt-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-akane-500"
                        style={{ width: `${deal.probability}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{deal.probability}%</span>
                  </div>
                </dd>
              </div>
              {deal.stage === "LOST" && deal.lostReason && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-slate-400">失注理由</dt>
                  <dd className="mt-0.5 text-sm text-rose-700">{deal.lostReason}</dd>
                </div>
              )}
            </dl>

            {defs.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="mb-3 text-xs font-semibold text-slate-500">カスタム項目</p>
                <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  {defs.map((def) => (
                    <div key={def.key}>
                      <dt className="text-xs font-medium text-slate-400">{def.label}</dt>
                      <dd className="mt-0.5 text-sm text-slate-700">
                        {customData[def.key]
                          ? def.type === "date"
                            ? new Date(customData[def.key]).toLocaleDateString("ja-JP")
                            : customData[def.key]
                          : "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {deal.memo && (
              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="mb-1 text-xs font-semibold text-slate-500">メモ</p>
                <p className="whitespace-pre-wrap text-sm text-slate-700">{deal.memo}</p>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {deal.contracts.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">契約</h2>
              <ul className="space-y-2">
                {deal.contracts.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/contracts/${c.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50"
                    >
                      <span className="text-sm font-medium text-slate-800">{c.name}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.status === "ACTIVE" ? "稼働中" : "終了"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-800">
              活動履歴
              <span className="ml-2 text-xs font-normal text-slate-400">
                顧客「{deal.customer.name}」の全記録
              </span>
            </h2>
            <ActivityPanel
              customerId={deal.customerId}
              dealId={deal.id}
              currentDealId={deal.id}
              path={`/deals/${deal.id}`}
              activities={activities}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
