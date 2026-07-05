import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { currentUserHasTeamAccess } from "@/lib/plan";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/currency";
import { PageHeader, Card, Badge, btnSecondary } from "@/components/ui";
import { ActivityPanel } from "@/components/activity-panel";
import { DeleteContractButton } from "./delete-contract";
import { StepCheckbox } from "./step-checkbox";
import { getContractSteps } from "@/lib/contract-steps";

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("ja-JP") : "—";
}

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const orgId = session.org.id;
  const { id } = await params;

  const contract = await db.contract.findFirst({
    where: { id, orgId },
    include: { customer: true, deal: true, service: true, plan: true },
  });
  if (!contract) notFound();

  // 活動履歴は顧客単位で共有 (顧客・案件ページで記録した内容もここに表示される)
  const [activities, steps, hasTeam] = await Promise.all([
    db.activity.findMany({
      where: { customerId: contract.customerId, orgId },
      include: { user: { select: { name: true } }, deal: { select: { id: true, title: true } } },
      orderBy: { occurredAt: "desc" },
    }),
    getContractSteps(orgId, contract.id),
    currentUserHasTeamAccess(orgId),
  ]);
  const doneCount = steps.filter((s) => s.completedAt !== null).length;

  return (
    <>
      <PageHeader
        title={contract.name}
        description={`顧客: ${contract.customer.name}`}
        actions={
          <>
            <Link href={`/contracts/${contract.id}/edit`} className={btnSecondary}>
              編集
            </Link>
            <DeleteContractButton contractId={contract.id} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">手続きチェックリスト</h2>
              {steps.length > 0 && (
                <span className="text-xs font-medium text-slate-400">
                  {doneCount}/{steps.length} 完了
                </span>
              )}
            </div>
            {steps.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">
                手続きテンプレートがまだ設定されていません。
                <Link href="/contracts/steps" className="ml-1 text-akane-600 hover:underline">
                  設定する →
                </Link>
              </p>
            ) : (
              <>
                <div className="mt-3 mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.round((doneCount / steps.length) * 100)}%` }}
                  />
                </div>
                <div className="space-y-1.5">
                  {steps.map((s) => (
                    <StepCheckbox
                      key={s.stepDefId}
                      contractId={contract.id}
                      stepDefId={s.stepDefId}
                      label={s.label}
                      completedAt={s.completedAt}
                      feature={s.feature}
                      hasTeamAccess={hasTeam}
                    />
                  ))}
                </div>
                {doneCount === steps.length && (
                  <p className="mt-4 text-sm font-medium text-emerald-600">✅ すべての手続きが完了しました</p>
                )}
              </>
            )}
          </Card>

          <Card className="p-6">
            <div className="mb-4">
              {contract.status === "ACTIVE" ? (
                <Badge className="bg-emerald-100 text-emerald-800">稼働中</Badge>
              ) : (
                <Badge className="bg-slate-100 text-slate-600">終了</Badge>
              )}
            </div>

            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-slate-400">顧客</dt>
                <dd className="mt-0.5 text-sm">
                  <Link href={`/customers/${contract.customerId}`} className="font-medium text-akane-700 hover:underline">
                    {contract.customer.name}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-400">元案件</dt>
                <dd className="mt-0.5 text-sm">
                  {contract.deal ? (
                    <Link href={`/deals/${contract.deal.id}`} className="font-medium text-akane-700 hover:underline">
                      {contract.deal.title}
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-400">サービス / プラン</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-700">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: contract.service.color }}
                  />
                  {contract.service.name}
                  {contract.plan && <span className="text-slate-400">/ {contract.plan.name}</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-400">月額</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-800">
                  {formatMoney(contract.monthlyFee, session.org.baseCurrency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-400">初期費用</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-800">
                  {formatMoney(contract.initialFee, session.org.baseCurrency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-400">開始日〜終了日</dt>
                <dd className="mt-0.5 text-sm text-slate-700">
                  {fmtDate(contract.startDate)} 〜 {fmtDate(contract.endDate)}
                </dd>
              </div>
            </dl>

            {contract.memo && (
              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="mb-1 text-xs font-semibold text-slate-500">メモ</p>
                <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{contract.memo}</p>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-1 text-sm font-semibold text-slate-700">次のステップ</h2>
            <p className="mb-4 text-xs text-slate-400">
              契約後の書類・経費まわりは「チーム機能」でまとめて管理できます
              {!hasTeam && "（チームプランへのアップグレードが必要です）"}
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["/team/contract-docs", "📄 契約書管理"],
                  ["/team/invoices", "🧾 請求書管理"],
                  ["/team/outsourcing-costs", "💸 委託費管理"],
                ] as const
              ).map(([href, label]) =>
                hasTeam ? (
                  <Link key={href} href={href} className={btnSecondary}>
                    {label}
                  </Link>
                ) : (
                  <Link key={href} href="/billing" className={btnSecondary}>
                    🔒 {label}
                  </Link>
                )
              )}
            </div>
          </Card>
        </div>

        <div>
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-800">
              活動履歴
              <span className="ml-2 text-xs font-normal text-slate-400">
                顧客「{contract.customer.name}」の全記録
              </span>
            </h2>
            <ActivityPanel
              customerId={contract.customerId}
              dealId={contract.dealId}
              path={`/contracts/${contract.id}`}
              activities={activities}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
