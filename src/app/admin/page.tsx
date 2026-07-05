import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";
import { baseStatus, BASE_PRICE_JPY, seatTotal } from "@/lib/pricing";
import { planStatus, PRO_PRICE_JPY, TEAM_PRICE_JPY } from "@/lib/plan";
import { Card, Badge } from "@/components/ui";

export const metadata = { title: "システム管理 | Saleshub" };

// サービス運営者専用: 全テナントの登録・課金・解約状況を横断的に閲覧する。
// User.isSystemAdmin が true のユーザーのみアクセス可。テナント横断のため dbAdmin を使う。

const EVENT_LABELS: Record<string, { label: string; cls: string }> = {
  REGISTER: { label: "新規登録", cls: "bg-emerald-100 text-emerald-800" },
  BASE_CONSENT: { label: "課金同意", cls: "bg-slate-100 text-slate-700" },
  BASE_SUBSCRIBED: { label: "基本プラン課金開始", cls: "bg-sky-100 text-sky-800" },
  BASE_CANCELED: { label: "基本プラン解約", cls: "bg-rose-100 text-rose-700" },
  PRO_SUBSCRIBED: { label: "Pro課金開始", cls: "bg-indigo-100 text-indigo-800" },
  PRO_CANCELED: { label: "Pro解約", cls: "bg-rose-100 text-rose-700" },
  PRO_TRIAL_CONSENT: { label: "Proトライアル同意", cls: "bg-slate-100 text-slate-700" },
  PRO_TRIAL_STARTED: { label: "Proトライアル開始", cls: "bg-amber-100 text-amber-800" },
  PRO_TRIAL_CONVERTED: { label: "Pro課金へ移行", cls: "bg-indigo-100 text-indigo-800" },
  PRO_TRIAL_CANCELED: { label: "Proトライアル解約", cls: "bg-slate-200 text-slate-600" },
  CANCEL_SURVEY: { label: "解約アンケート", cls: "bg-purple-100 text-purple-700" },
};

function fmtDateTime(d: Date): string {
  return d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "short" });
}
function fmtDate(d: Date): string {
  return d.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "medium" });
}
const yen = (n: number) => `¥${n.toLocaleString()}`;

export default async function AdminPage() {
  const session = await requireSession();
  const me = await dbAdmin.user.findUnique({
    where: { id: session.user.id },
    select: { isSystemAdmin: true },
  });
  if (!me?.isSystemAdmin) redirect("/dashboard");

  const [orgs, userCount, events, billingHistory, surveys] = await Promise.all([
    dbAdmin.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        memberships: { include: { user: true } },
        _count: { select: { customers: true, contracts: true } },
      },
    }),
    dbAdmin.user.count(),
    dbAdmin.billingEvent.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    // 課金開始日・終了日・同意状況の導出用 (スキーマを増やさず利用ログから復元する)
    dbAdmin.billingEvent.findMany({
      where: { type: { in: ["BASE_SUBSCRIBED", "BASE_CANCELED", "BASE_CONSENT"] } },
      orderBy: { createdAt: "asc" },
      select: { orgId: true, type: true, createdAt: true },
    }),
    // 契約管理 (解約サマリ) の集計元: 構造化された解約アンケート
    dbAdmin.cancellationSurvey.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  // 解約理由の内訳・改善希望の集計 (件数の多い順)
  const reasonTally = new Map<string, number>();
  const improvementTally = new Map<string, number>();
  for (const s of surveys) {
    reasonTally.set(s.reason || "未選択", (reasonTally.get(s.reason || "未選択") ?? 0) + 1);
    for (const imp of s.improvements.split("・").map((x) => x.trim()).filter(Boolean)) {
      improvementTally.set(imp, (improvementTally.get(imp) ?? 0) + 1);
    }
  }
  const sortedReasons = [...reasonTally.entries()].sort((a, b) => b[1] - a[1]);
  const sortedImprovements = [...improvementTally.entries()].sort((a, b) => b[1] - a[1]);
  const lostMrr = surveys.reduce((sum, s) => sum + (s.wasSubscribed ? s.monthlyJpy : 0), 0);
  const surveyMax = Math.max(1, ...sortedReasons.map(([, n]) => n));

  // 利用ログから組織ごとの課金開始日/解約日/課金同意有無を復元する
  const startByOrg = new Map<string, Date>();
  const endByOrg = new Map<string, Date>();
  const consentByOrg = new Set<string>();
  for (const e of billingHistory) {
    if (!e.orgId) continue;
    if (e.type === "BASE_SUBSCRIBED") startByOrg.set(e.orgId, e.createdAt);
    else if (e.type === "BASE_CANCELED") endByOrg.set(e.orgId, e.createdAt);
    else if (e.type === "BASE_CONSENT") consentByOrg.add(e.orgId);
  }

  const now = Date.now();

  // 「実際に課金されている」= 実 Stripe サブスクリプションを持つこと。
  // 運営組織のように basePlanStatus=ACTIVE を手動セットしただけ (stripe*SubscriptionId=null) の
  // 無償組織は、課金中カウント・MRR から除外する。
  type Org = (typeof orgs)[number];
  const realBase = (o: Org) => o.basePlanStatus === "ACTIVE" && o.stripeBaseSubscriptionId != null;
  const realPro = (o: Org) =>
    o.plan === "PRO" && o.stripeSubscriptionId != null && !planStatus(o).stripeTrialing;
  const realTeam = (o: Org) => o.teamPlan === "TEAM" && o.stripeTeamSubscriptionId != null;
  const compedBase = (o: Org) => o.basePlanStatus === "ACTIVE" && o.stripeBaseSubscriptionId == null;

  // 席課金の月額 (実 Stripe サブスクのある組織のみを実請求として計上)
  const orgMonthly = (o: Org) => {
    const seats = Math.max(1, o.memberships.length);
    return (
      (realBase(o) ? seatTotal(BASE_PRICE_JPY, seats) : 0) +
      (realPro(o) ? seatTotal(PRO_PRICE_JPY, seats) : 0) +
      (realTeam(o) ? seatTotal(TEAM_PRICE_JPY, seats) : 0)
    );
  };

  const withStatus = orgs.map((o) => ({
    org: o,
    status: baseStatus(o, now),
    pro: planStatus(o),
    seats: Math.max(1, o.memberships.length),
  }));

  // ===== プラン別の集計 (基本 / Pro / TEAM) — 実課金のみを課金中/MRRに計上 =====
  const basePaying = withStatus.filter((x) => realBase(x.org));
  const baseComped = withStatus.filter((x) => compedBase(x.org)); // 運営/無償で有効な組織
  const baseFree = withStatus.filter((x) => !x.status.subscribed && x.status.inFreePeriod);
  const baseCanceled = withStatus.filter((x) => x.status.canceled);
  const baseExpired = withStatus.filter((x) => !x.status.hasAccess && !x.status.canceled);
  const baseMrr = basePaying.reduce((s, x) => s + seatTotal(BASE_PRICE_JPY, x.seats), 0);

  const proPaying = withStatus.filter((x) => realPro(x.org));
  const proTrial = withStatus.filter((x) => x.pro.inTrial);
  const proMrr = proPaying.reduce((s, x) => s + seatTotal(PRO_PRICE_JPY, x.seats), 0);

  const teamPaying = withStatus.filter((x) => realTeam(x.org));
  const teamMrr = teamPaying.reduce((s, x) => s + seatTotal(TEAM_PRICE_JPY, x.seats), 0);

  const totalMrr = baseMrr + proMrr + teamMrr;
  const churnDenom = basePaying.length + baseCanceled.length;
  const churnRate = churnDenom > 0 ? (baseCanceled.length / churnDenom) * 100 : null;

  // 全体サマリー (3枠) と、プラン別内訳カード (3枠)
  const headline = [
    { label: "登録組織数", value: `${orgs.length}`, sub: `ユーザー ${userCount}名` },
    { label: "月次売上 (MRR 合計)", value: yen(totalMrr), sub: "基本 + Pro + TEAM の実課金" },
    {
      label: "解約率 (基本プラン)",
      value: churnRate == null ? "—" : `${churnRate.toFixed(0)}%`,
      sub: `解約 ${baseCanceled.length} / 期限切れ ${baseExpired.length}`,
    },
  ];

  const planCards = [
    {
      name: "基本プラン",
      note: "システム利用料 (席課金)",
      price: `¥${BASE_PRICE_JPY}/人`,
      accent: "bg-sky-500",
      ring: "ring-sky-100",
      countLabel: "課金中 (実Stripe)",
      count: basePaying.length,
      mrr: baseMrr,
      breakdown: [
        { label: "無料期間中", value: baseFree.length, cls: "bg-emerald-100 text-emerald-800" },
        { label: "運営/無償", value: baseComped.length, cls: "bg-slate-100 text-slate-500" },
        { label: "解約", value: baseCanceled.length, cls: "bg-rose-100 text-rose-700" },
        { label: "期限切れ", value: baseExpired.length, cls: "bg-slate-200 text-slate-600" },
      ],
    },
    {
      name: "Pro",
      note: "経営数値分析・テンプレート",
      price: `¥${PRO_PRICE_JPY}/人`,
      accent: "bg-indigo-500",
      ring: "ring-indigo-100",
      countLabel: "課金中",
      count: proPaying.length,
      mrr: proMrr,
      breakdown: [
        { label: "トライアル中", value: proTrial.length, cls: "bg-amber-100 text-amber-800" },
      ],
    },
    {
      name: "TEAM",
      note: "契約書・請求書・委託費管理",
      price: `¥${TEAM_PRICE_JPY.toLocaleString()}/人`,
      accent: "bg-violet-500",
      ring: "ring-violet-100",
      countLabel: "加入中 (実Stripe)",
      count: teamPaying.length,
      mrr: teamMrr,
      breakdown: [] as { label: string; value: number; cls: string }[],
    },
  ];

  const baseBadge = (s: ReturnType<typeof baseStatus>, comped: boolean) =>
    s.subscribed ? (
      comped ? (
        <Badge className="bg-slate-100 text-slate-500">有効 (運営/無償)</Badge>
      ) : (
        <Badge className="bg-sky-100 text-sky-800">課金中</Badge>
      )
    ) : s.inFreePeriod ? (
      <Badge className="bg-emerald-100 text-emerald-800">無料期間</Badge>
    ) : s.canceled ? (
      <Badge className="bg-rose-100 text-rose-700">解約済</Badge>
    ) : (
      <Badge className="bg-slate-200 text-slate-600">期限切れ</Badge>
    );

  const th = "px-3 py-2 text-left text-xs font-semibold text-slate-500 whitespace-nowrap";
  const td = "px-3 py-2 text-sm text-slate-700 whitespace-nowrap";

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">🛠 システム管理</h1>
            <p className="mt-1 text-sm text-slate-500">
              Saleshub 全体の登録・課金・解約・同意状況 (運営者専用)
            </p>
          </div>
          <Link href="/dashboard" className="text-sm font-medium text-akane-600 hover:underline">
            ← アプリへ戻る
          </Link>
        </div>

        {/* 全体サマリー (3枠) */}
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {headline.map((t) => (
            <Card key={t.label} className="p-4">
              <p className="text-xs font-medium text-slate-500">{t.label}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{t.value}</p>
              <p className="mt-1 text-xs text-slate-400">{t.sub}</p>
            </Card>
          ))}
        </div>

        {/* プラン別内訳 (基本 / Pro / TEAM) */}
        <div className="mb-2 text-xs font-semibold text-slate-500">プラン別の加入・課金状況</div>
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {planCards.map((p) => (
            <Card key={p.name} className={`overflow-hidden p-0 ring-1 ${p.ring}`}>
              <div className={`h-1.5 w-full ${p.accent}`} />
              <div className="p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{p.name}</p>
                    <p className="text-[11px] text-slate-400">{p.note}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    席課金 {p.price}
                  </span>
                </div>

                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-[11px] text-slate-400">{p.countLabel}</p>
                    <p className="text-3xl font-bold tracking-tight text-slate-900">
                      {p.count}
                      <span className="ml-1 text-sm font-medium text-slate-400">組織</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-slate-400">月次売上 (MRR)</p>
                    <p className="text-xl font-bold text-slate-900">{yen(p.mrr)}</p>
                  </div>
                </div>

                {p.breakdown.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                    {p.breakdown.map((b) => (
                      <Badge key={b.label} className={b.cls}>
                        {b.label} {b.value}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* 組織一覧 */}
        <Card className="mb-6 overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">登録組織 ({orgs.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-max border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className={th}>組織名</th>
                  <th className={th}>オーナー</th>
                  <th className={th}>登録日</th>
                  <th className={th}>基本プラン</th>
                  <th className={th}>課金開始日</th>
                  <th className={th}>課金終了日</th>
                  <th className={th}>月額 (席課金)</th>
                  <th className={th}>無料期間終了</th>
                  <th className={th}>特典</th>
                  <th className={th}>Pro / TEAM</th>
                  <th className={th}>同意状況</th>
                  <th className={th}>メンバー</th>
                  <th className={th}>顧客 / 契約</th>
                </tr>
              </thead>
              <tbody>
                {withStatus.map(({ org, status, pro }) => {
                  const owner = org.memberships.find((m) => m.role === "OWNER")?.user;
                  const start = startByOrg.get(org.id);
                  const end = endByOrg.get(org.id);
                  const monthly = orgMonthly(org);
                  const termsOk = owner?.termsAcceptedAt != null;
                  const billingConsent = consentByOrg.has(org.id) || status.subscribed;
                  return (
                    <tr key={org.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className={`${td} font-medium text-slate-900`}>{org.name}</td>
                      <td className={td}>{owner ? `${owner.name} (${owner.email})` : "—"}</td>
                      <td className={td}>{fmtDateTime(org.createdAt)}</td>
                      <td className={td}>{baseBadge(status, compedBase(org))}</td>
                      <td className={td}>{start ? fmtDate(start) : "—"}</td>
                      <td className={td}>
                        {end ? <span className="text-rose-600">{fmtDate(end)}</span> : "—"}
                      </td>
                      <td className={td}>
                        {monthly > 0 ? (
                          <span className="font-medium text-slate-900">{yen(monthly)}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className={td}>
                        {org.freeUntil ? fmtDateTime(org.freeUntil) : "未設定 (旧データ)"}
                      </td>
                      <td className={td}>
                        {org.earlyBird ? <Badge className="bg-amber-100 text-amber-800">早期3ヶ月</Badge> : "—"}
                      </td>
                      <td className={td}>
                        <div className="flex gap-1">
                          {org.plan === "PRO" && (
                            <Badge className="bg-indigo-100 text-indigo-800">
                              {pro.stripeTrialing ? "PRO(試)" : "PRO"}
                            </Badge>
                          )}
                          {org.teamPlan === "TEAM" && (
                            <Badge className="bg-violet-100 text-violet-800">TEAM</Badge>
                          )}
                          {org.plan !== "PRO" && org.teamPlan !== "TEAM" && "—"}
                        </div>
                      </td>
                      <td className={td}>
                        <div className="flex gap-1">
                          <Badge className={termsOk ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500"}>
                            規約{termsOk ? "✓" : "—"}
                          </Badge>
                          <Badge className={billingConsent ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500"}>
                            課金{billingConsent ? "✓" : "—"}
                          </Badge>
                        </div>
                      </td>
                      <td className={td}>{org.memberships.length}名</td>
                      <td className={td}>
                        {org._count.customers} / {org._count.contracts}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 契約管理 (解約サマリ) */}
        <Card className="mb-6 overflow-hidden">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">契約管理 — 解約サマリ ({surveys.length})</h2>
            <span className="text-xs text-slate-500">
              失った月額 (MRR): <span className="font-semibold text-rose-600">{yen(lostMrr)}</span>
            </span>
          </div>

          {surveys.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">まだ解約はありません</p>
          ) : (
            <>
              {/* 理由・改善希望の内訳 */}
              <div className="grid gap-6 border-b border-slate-100 px-4 py-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-500">解約理由の内訳</p>
                  <ul className="space-y-1.5">
                    {sortedReasons.map(([label, n]) => (
                      <li key={label} className="flex items-center gap-2 text-sm">
                        <span className="w-52 shrink-0 truncate text-slate-700" title={label}>
                          {label}
                        </span>
                        <span className="h-2 rounded-full bg-rose-400" style={{ width: `${(n / surveyMax) * 100}%`, minWidth: 8 }} />
                        <span className="text-xs font-medium text-slate-500">{n}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-500">改善すれば戻りたい点</p>
                  {sortedImprovements.length === 0 ? (
                    <p className="text-sm text-slate-400">回答なし</p>
                  ) : (
                    <ul className="flex flex-wrap gap-1.5">
                      {sortedImprovements.map(([label, n]) => (
                        <li key={label}>
                          <Badge className="bg-amber-100 text-amber-800">
                            {label} · {n}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* 個別回答 (自由記述つき) */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-max border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className={th}>解約日時</th>
                      <th className={th}>組織</th>
                      <th className={th}>状態</th>
                      <th className={th}>失った月額</th>
                      <th className={th}>主な理由</th>
                      <th className={th}>改善希望</th>
                      <th className={th}>自由記述</th>
                    </tr>
                  </thead>
                  <tbody>
                    {surveys.map((s) => (
                      <tr key={s.id} className="border-b border-slate-100 align-top hover:bg-slate-50">
                        <td className={td}>{fmtDateTime(s.createdAt)}</td>
                        <td className={td}>
                          <div className="font-medium text-slate-900">{s.orgName ?? "—"}</div>
                          <div className="text-xs text-slate-400">{s.email ?? ""}</div>
                        </td>
                        <td className={td}>
                          {s.wasSubscribed ? (
                            <Badge className="bg-rose-100 text-rose-700">課金中を解約</Badge>
                          ) : (
                            <Badge className="bg-slate-200 text-slate-600">無料期間中</Badge>
                          )}
                        </td>
                        <td className={td}>
                          {s.wasSubscribed ? <span className="font-medium text-rose-600">{yen(s.monthlyJpy)}</span> : "—"}
                        </td>
                        <td className={td}>{s.reason || "—"}</td>
                        <td className={`${td} max-w-xs whitespace-normal text-slate-600`}>{s.improvements || "—"}</td>
                        <td className={`${td} max-w-sm whitespace-normal text-slate-600`}>
                          {s.detail ? s.detail : <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>

        {/* 利用ログ */}
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">
              利用ログ (登録・同意・課金・解約・アンケート / 直近100件)
            </h2>
          </div>
          {events.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">まだログがありません</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {events.map((e) => {
                const meta = EVENT_LABELS[e.type] ?? { label: e.type, cls: "bg-slate-100 text-slate-700" };
                return (
                  <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="w-36 shrink-0 text-xs text-slate-400">{fmtDateTime(e.createdAt)}</span>
                    <Badge className={meta.cls}>{meta.label}</Badge>
                    <span className="font-medium text-slate-800">{e.orgName ?? "—"}</span>
                    <span className="text-slate-500">{e.email ?? ""}</span>
                    {e.detail && <span className="text-xs text-slate-400">{e.detail}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
