import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/currency";
import {
  DEAL_STAGE_LABELS,
  DEAL_STAGE_COLORS,
  ACTIVITY_TYPE_LABELS,
} from "@/lib/constants";
import { PageHeader, Card, Badge, btnSecondary, btnPrimary } from "@/components/ui";
import { ActivityForm, DeleteActivityButton } from "./activity-form";
import { DeleteDealButton } from "./delete-deal";

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

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const orgId = session.org.id;
  const { id } = await params;

  const deal = await db.deal.findFirst({
    where: { id, orgId },
    include: {
      customer: true,
      service: true,
      plan: true,
      contracts: { select: { id: true } },
      activities: {
        include: { user: { select: { name: true } } },
        orderBy: { occurredAt: "desc" },
      },
    },
  });
  if (!deal) notFound();

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
              <Link href={`/contracts/new?dealId=${deal.id}`} className={btnPrimary}>
                📝 この案件を契約に変換
              </Link>
            )}
            <Link href={`/deals/${deal.id}/edit`} className={btnSecondary}>
              編集
            </Link>
            <DeleteDealButton dealId={deal.id} />
          </>
        }
      />

      {canConvert && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm text-emerald-800">
            🎉 この案件は受注済みです。契約を作成すると月次売上に自動計上されます。
          </p>
          <Link
            href={`/contracts/new?dealId=${deal.id}`}
            className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            契約に変換
          </Link>
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
                  {formatMoney(deal.monthlyFee, deal.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-400">初期費用</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-800">
                  {formatMoney(deal.initialFee, deal.currency)}
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

        <div>
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-800">活動履歴</h2>
            <ActivityForm dealId={deal.id} />
            <div className="mt-5 space-y-4">
              {deal.activities.length === 0 && (
                <p className="text-sm text-slate-400">まだ活動記録がありません</p>
              )}
              {deal.activities.map((a) => (
                <div key={a.id} className="border-l-2 border-akane-100 pl-3">
                  <div className="flex items-center gap-2">
                    <Badge>{ACTIVITY_TYPE_LABELS[a.type] ?? a.type}</Badge>
                    <span className="text-xs text-slate-400">
                      {new Date(a.occurredAt).toLocaleDateString("ja-JP")}
                    </span>
                    <span className="ml-auto">
                      <DeleteActivityButton id={a.id} dealId={deal.id} />
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{a.content}</p>
                  {a.user && <p className="mt-0.5 text-xs text-slate-400">{a.user.name}</p>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
