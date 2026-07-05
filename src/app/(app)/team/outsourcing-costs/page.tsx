import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/currency";
import { PageHeader, Card, Badge, btnPrimary, btnSecondary, inputCls, selectCls, labelCls, EmptyState } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { ToggleCheck } from "@/components/toggle-check";
import { CsvImport } from "@/components/csv-import";
import { TeamUpgradeNotice } from "@/components/team-upgrade-notice";
import { currentUserHasTeamAccess } from "@/lib/plan";
import {
  createSubcontractor,
  deleteSubcontractor,
  createWork,
  deleteWork,
  toggleWorkCounted,
} from "@/app/actions/outsourcing";

export const metadata = { title: "委託費管理" };

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("ja-JP") : "";
}

export default async function OutsourcingCostsPage() {
  const session = await requireSession();
  const orgId = session.org.id;
  const currency = session.org.baseCurrency;

  if (!(await currentUserHasTeamAccess(orgId))) {
    return (
      <div>
        <PageHeader title="💸 委託費管理" description="委託先の稼働を記録し、費用計上まで管理" />
        <TeamUpgradeNotice
          title="委託費管理はチーム機能です"
          description="チームプランにアップグレードすると、委託先の稼働をだれが・いつ・何を・いくらで記録し費用計上まで管理できます。"
        />
      </div>
    );
  }

  const [subs, works, contracts] = await Promise.all([
    db.subcontractor.findMany({ where: { orgId }, orderBy: { createdAt: "asc" } }),
    db.outsourcingWork.findMany({
      where: { orgId },
      orderBy: { workedOn: "desc" },
      include: {
        subcontractor: { select: { id: true, name: true } },
        contract: { select: { id: true, name: true } },
      },
    }),
    db.contract.findMany({ where: { orgId }, orderBy: { createdAt: "desc" }, select: { id: true, name: true } }),
  ]);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonthCost = works
    .filter((w) => `${w.workedOn.getFullYear()}-${String(w.workedOn.getMonth() + 1).padStart(2, "0")}` === thisMonth)
    .reduce((s, w) => s + w.amount, 0);
  const uncounted = works.filter((w) => !w.countedMonth);
  const uncountedCost = uncounted.reduce((s, w) => s + w.amount, 0);

  // 委託先ごとの稼働集計 (可視化)
  const bySub = new Map<string, { count: number; hours: number; amount: number }>();
  for (const w of works) {
    const cur = bySub.get(w.subcontractorId) ?? { count: 0, hours: 0, amount: 0 };
    cur.count += 1;
    cur.hours += w.hours ?? 0;
    cur.amount += w.amount;
    bySub.set(w.subcontractorId, cur);
  }

  const tiles = [
    { label: "委託先", value: `${subs.length} 社`, sub: "登録済みの委託先" },
    { label: "今月の委託費", value: formatMoney(thisMonthCost, currency), sub: thisMonth },
    { label: "稼働ログ", value: `${works.length} 件`, sub: "だれが・いつ・何を" },
    { label: "費用 未計上", value: formatMoney(uncountedCost, currency), sub: `${uncounted.length} 件が未勘定`, warn: uncounted.length > 0 },
  ];

  return (
    <div>
      <PageHeader
        title="💸 委託費管理"
        description="委託先の稼働を「だれが・いつ・何を・いくら」で記録し、自社の費用として勘定できているかを管理します"
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <p className="text-xs text-slate-500">{t.label}</p>
            <p className={`mt-1 text-xl font-bold ${t.warn ? "text-amber-600" : "text-slate-900"}`}>{t.value}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{t.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 委託先マスタ + 稼働可視化 */}
        <div className="lg:col-span-1">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">委託先</h2>
            {subs.length === 0 ? (
              <p className="text-xs text-slate-400">まだ委託先が登録されていません。</p>
            ) : (
              <ul className="space-y-2">
                {subs.map((s) => {
                  const agg = bySub.get(s.id);
                  return (
                    <li key={s.id} className="rounded-lg border border-slate-100 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">{s.name}</p>
                          {s.role && <p className="text-[11px] text-slate-400">{s.role}</p>}
                        </div>
                        <ConfirmButton
                          action={deleteSubcontractor.bind(null, s.id)}
                          message={`「${s.name}」を削除しますか？稼働ログも全て削除されます。`}
                          className="text-[11px] text-slate-300 hover:text-rose-500"
                        >
                          削除
                        </ConfirmButton>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        稼働 {agg?.count ?? 0} 件
                        {agg && agg.hours > 0 && <> ・ {agg.hours}h</>}
                        {" ・ "}<span className="font-medium text-slate-700">{formatMoney(agg?.amount ?? 0, currency)}</span>
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}

            <form action={createSubcontractor} className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              <input name="name" required placeholder="委託先名 *" className={inputCls} />
              <input name="role" placeholder="役割・職種 (任意)" className={inputCls} />
              <input name="contact" placeholder="連絡先 (任意)" className={inputCls} />
              <button type="submit" className={`${btnPrimary} w-full justify-center`}>＋ 委託先を追加</button>
            </form>
          </Card>
        </div>

        {/* 稼働ログ */}
        <div className="lg:col-span-2">
          {/* CSV運用: テンプレートを委託先へ渡し、記入済みを取り込む */}
          <Card className="mb-4 border-sky-100 bg-sky-50/40 p-5">
            <h2 className="mb-1 text-sm font-semibold text-slate-800">CSVで一括登録</h2>
            <p className="mb-3 text-xs text-slate-500">
              手入力せずに、委託先へ専用CSVを渡して記入してもらい、そのまま取り込めます。
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <a href="/api/outsourcing/csv-template" download className={btnSecondary}>
                ⬇ 記入用CSVテンプレートを配布
              </a>
            </div>
            {subs.length > 0 ? (
              <div className="mt-3 border-t border-sky-100 pt-3">
                <p className="mb-2 text-xs text-slate-500">記入済みCSVの取り込み先の委託先を選んでアップロード:</p>
                <CsvImport subs={subs.map((s) => ({ id: s.id, name: s.name }))} />
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-400">取り込みには先に委託先の登録が必要です。</p>
            )}
          </Card>

          <Card className="mb-4 p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">稼働を記録（手入力）</h2>
            {subs.length === 0 ? (
              <p className="text-xs text-slate-400">先に委託先を追加してください。</p>
            ) : (
              <form action={createWork} className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>委託先 *</label>
                  <select name="subcontractorId" required className={`${selectCls} w-full`}>
                    {subs.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>実施日</label>
                  <input name="workedOn" type="date" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>担当者 (だれが・任意)</label>
                  <input name="performer" placeholder="委託先内の担当者名" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>関連契約 (任意)</label>
                  <select name="contractId" defaultValue="" className={`${selectCls} w-full`}>
                    <option value="">— 選択しない —</option>
                    {contracts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>実施内容 (何を) *</label>
                  <input name="task" required placeholder="例: LP制作 / Instagram 3投稿分の画像制作" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>稼働時間 (任意)</label>
                  <input name="hours" type="number" min="0" step="0.5" placeholder="h" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>委託費</label>
                  <input name="amount" type="number" min="0" step="1" defaultValue="0" className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <button type="submit" className={btnPrimary}>＋ 稼働を記録</button>
                </div>
              </form>
            )}
          </Card>

          {works.length === 0 ? (
            <EmptyState title="まだ稼働ログがありません" description="委託先の稼働を記録すると、費用として勘定できているかを追跡できます。" />
          ) : (
            <div className="space-y-2">
              {works.map((w) => (
                <Card key={w.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800">
                        <span className="font-medium">{w.subcontractor.name}</span>
                        {w.performer && <span className="text-slate-500"> ／ {w.performer}</span>}
                      </p>
                      <p className="mt-0.5 break-words text-sm text-slate-700">{w.task}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {fmtDate(w.workedOn)}
                        {w.hours != null && <> ・ {w.hours}h</>}
                        {" ・ "}<span className="font-medium text-slate-700">{formatMoney(w.amount, currency)}</span>
                        {w.contract && (
                          <> ・ <Link href={`/contracts/${w.contract.id}`} className="text-akane-600 hover:underline">{w.contract.name}</Link></>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <ConfirmButton
                        action={deleteWork.bind(null, w.id)}
                        message="この稼働ログを削除しますか？"
                        className="text-[11px] text-slate-300 hover:text-rose-500"
                      >
                        削除
                      </ConfirmButton>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
                    <ToggleCheck
                      initial={w.countedMonth !== null}
                      action={toggleWorkCounted.bind(null, w.id)}
                      label="費用として計上済み"
                    />
                    {w.countedMonth ? (
                      <Badge className="bg-emerald-100 text-emerald-800">{w.countedMonth} 計上</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-800">未計上</Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
