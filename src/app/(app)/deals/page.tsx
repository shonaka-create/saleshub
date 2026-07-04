import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/currency";
import {
  DEAL_STAGES,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_COLORS,
} from "@/lib/constants";
import { PageHeader, Card, EmptyState, PrimaryLink, btnSecondary, btnPrimary, selectCls } from "@/components/ui";
import { StageSelect } from "./stage-select";
import { startContractFromDeal } from "@/app/actions/deals";

type DealWithRels = Awaited<ReturnType<typeof loadDeals>>[number];

async function loadDeals(orgId: string) {
  return db.deal.findMany({
    where: { orgId },
    include: { customer: true, service: true, contracts: { select: { id: true } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("ja-JP") : "";
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; stage?: string; serviceId?: string }>;
}) {
  const session = await requireSession();
  const orgId = session.org.id;
  const sp = await searchParams;

  const [deals, services] = await Promise.all([
    loadDeals(orgId),
    db.service.findMany({ where: { orgId, archived: false }, orderBy: { sortOrder: "asc" } }),
  ]);

  const isTable = sp.view === "table";
  const baseCurrency = session.org.baseCurrency;

  const actions = (
    <>
      <Link href={isTable ? "/deals" : "/deals?view=table"} className={btnSecondary}>
        {isTable ? "ボード表示" : "テーブル表示"}
      </Link>
      <PrimaryLink href="/deals/new">＋ 新規案件</PrimaryLink>
    </>
  );

  return (
    <>
      <PageHeader title="案件管理" description="営業パイプラインの進捗を管理します" actions={actions} />
      {deals.length === 0 ? (
        <EmptyState title="案件がありません" description="「新規案件」から最初の案件を登録しましょう。" />
      ) : isTable ? (
        <TableView deals={deals} services={services} filter={sp} baseCurrency={baseCurrency} />
      ) : (
        <BoardView deals={deals} baseCurrency={baseCurrency} />
      )}
    </>
  );
}

function BoardView({ deals, baseCurrency }: { deals: DealWithRels[]; baseCurrency: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {DEAL_STAGES.map((stage) => {
        const stageDeals = deals.filter((d) => d.stage === stage);
        const color = DEAL_STAGE_COLORS[stage];
        return (
          <div key={stage} className="flex flex-col">
            <div
              className="mb-3 rounded-t-lg border-t-4 bg-white px-3 py-2 shadow-sm"
              style={{ borderTopColor: color }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm font-semibold text-slate-800">
                  {DEAL_STAGE_LABELS[stage]}
                </span>
                <span className="ml-auto text-xs font-medium text-slate-400">
                  {stageDeals.length}件
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {stageDeals.map((d) => (
                <DealCard key={d.id} deal={d} baseCurrency={baseCurrency} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DealCard({ deal, baseCurrency }: { deal: DealWithRels; baseCurrency: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-akane-300 hover:shadow">
      <Link href={`/deals/${deal.id}`} className="block">
        <p className="text-sm font-semibold text-slate-800">{deal.title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{deal.customer.name}</p>
        {deal.service && (
          <p className="mt-1 text-xs text-slate-500">{deal.service.name}</p>
        )}
        <div className="mt-2 space-y-0.5 text-xs text-slate-600">
          <p>月額 {formatMoney(deal.monthlyFee, baseCurrency)}</p>
          {deal.initialFee > 0 && <p>初期 {formatMoney(deal.initialFee, baseCurrency)}</p>}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <span>確度 {deal.probability}%</span>
          {deal.expectedCloseDate && <span>{fmtDate(deal.expectedCloseDate)}</span>}
        </div>
      </Link>
      <div className="mt-2 space-y-1.5">
        <StageSelect dealId={deal.id} stage={deal.stage} />
        {deal.stage === "WON" && (
          deal.contracts.length > 0 ? (
            <Link
              href={`/contracts/${deal.contracts[0].id}`}
              className="block rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-center text-xs font-medium text-emerald-700 hover:bg-emerald-100"
            >
              → 契約手続きを見る
            </Link>
          ) : (
            <form action={startContractFromDeal.bind(null, deal.id)}>
              <button type="submit" className={`${btnPrimary} w-full justify-center py-1 text-xs`}>
                契約手続きを開始
              </button>
            </form>
          )
        )}
      </div>
    </div>
  );
}

function TableView({
  deals,
  services,
  filter,
  baseCurrency,
}: {
  deals: DealWithRels[];
  services: { id: string; name: string }[];
  filter: { stage?: string; serviceId?: string };
  baseCurrency: string;
}) {
  const filtered = deals.filter((d) => {
    if (filter.stage && d.stage !== filter.stage) return false;
    if (filter.serviceId && d.serviceId !== filter.serviceId) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <form method="get" className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="view" value="table" />
        <select name="stage" defaultValue={filter.stage ?? ""} className={selectCls}>
          <option value="">全ステージ</option>
          {DEAL_STAGES.map((s) => (
            <option key={s} value={s}>
              {DEAL_STAGE_LABELS[s]}
            </option>
          ))}
        </select>
        <select name="serviceId" defaultValue={filter.serviceId ?? ""} className={selectCls}>
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

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="px-4 py-3 font-medium">案件</th>
              <th className="px-4 py-3 font-medium">顧客</th>
              <th className="px-4 py-3 font-medium">ステージ</th>
              <th className="px-4 py-3 font-medium">サービス</th>
              <th className="px-4 py-3 text-right font-medium">月額</th>
              <th className="px-4 py-3 text-right font-medium">確度</th>
              <th className="px-4 py-3 font-medium">受注予定</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/deals/${d.id}`} className="font-medium text-akane-700 hover:underline">
                    {d.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{d.customer.name}</td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: DEAL_STAGE_COLORS[d.stage] }}
                  >
                    {DEAL_STAGE_LABELS[d.stage]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{d.service?.name ?? "—"}</td>
                <td className="px-4 py-3 text-right text-slate-700">
                  {formatMoney(d.monthlyFee, baseCurrency)}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">{d.probability}%</td>
                <td className="px-4 py-3 text-slate-600">{fmtDate(d.expectedCloseDate) || "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                  該当する案件がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
