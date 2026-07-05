import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";
import { baseStatus, BASE_PRICE_JPY, seatTotal } from "@/lib/pricing";
import { PRO_PRICE_JPY } from "@/lib/plan";
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
  const withStatus = orgs.map((o) => ({ org: o, status: baseStatus(o, now) }));

  // 席課金の月額 (課金中の組織のみを実請求とみなす)
  const orgMonthly = (o: (typeof orgs)[number], subscribed: boolean) => {
    const seats = Math.max(1, o.memberships.length);
    const base = subscribed ? seatTotal(BASE_PRICE_JPY, seats) : 0;
    const pro = o.plan === "PRO" ? seatTotal(PRO_PRICE_JPY, seats) : 0;
    return base + pro;
  };

  const counts = {
    orgs: orgs.length,
    users: userCount,
    free: withStatus.filter((x) => !x.status.subscribed && x.status.inFreePeriod).length,
    paying: withStatus.filter((x) => x.status.subscribed).length,
    canceled: withStatus.filter((x) => x.status.canceled).length,
    expired: withStatus.filter((x) => !x.status.hasAccess).length,
    pro: orgs.filter((o) => o.plan === "PRO").length,
  };
  // 席課金ベースの月次売上 (MRR) と解約率
  const mrr = withStatus.reduce((sum, x) => sum + orgMonthly(x.org, x.status.subscribed), 0);
  const churnDenom = counts.paying + counts.canceled;
  const churnRate = churnDenom > 0 ? (counts.canceled / churnDenom) * 100 : null;

  const tiles = [
    { label: "登録組織数", value: `${counts.orgs}`, sub: `ユーザー ${counts.users}名` },
    { label: "基本プラン課金中", value: `${counts.paying}`, sub: `席課金 ¥${BASE_PRICE_JPY}/人` },
    { label: "月次売上 (MRR)", value: yen(mrr), sub: "課金中の席×単価の合計" },
    { label: "無料期間中", value: `${counts.free}`, sub: "早期特典3ヶ月 / 初月無料" },
    {
      label: "解約率",
      value: churnRate == null ? "—" : `${churnRate.toFixed(0)}%`,
      sub: `解約 ${counts.canceled} / 期限切れ ${counts.expired}`,
    },
    { label: "Pro (経営分析)", value: `${counts.pro}`, sub: `席課金 ¥${PRO_PRICE_JPY}/人` },
  ];

  const baseBadge = (s: ReturnType<typeof baseStatus>) =>
    s.subscribed ? (
      <Badge className="bg-sky-100 text-sky-800">課金中</Badge>
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

        {/* サマリー */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {tiles.map((t) => (
            <Card key={t.label} className="p-4">
              <p className="text-xs font-medium text-slate-500">{t.label}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{t.value}</p>
              <p className="mt-1 text-xs text-slate-400">{t.sub}</p>
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
                  <th className={th}>Pro</th>
                  <th className={th}>同意状況</th>
                  <th className={th}>メンバー</th>
                  <th className={th}>顧客 / 契約</th>
                </tr>
              </thead>
              <tbody>
                {withStatus.map(({ org, status }) => {
                  const owner = org.memberships.find((m) => m.role === "OWNER")?.user;
                  const start = startByOrg.get(org.id);
                  const end = endByOrg.get(org.id);
                  const monthly = orgMonthly(org, status.subscribed);
                  const termsOk = owner?.termsAcceptedAt != null;
                  const billingConsent = consentByOrg.has(org.id) || status.subscribed;
                  return (
                    <tr key={org.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className={`${td} font-medium text-slate-900`}>{org.name}</td>
                      <td className={td}>{owner ? `${owner.name} (${owner.email})` : "—"}</td>
                      <td className={td}>{fmtDateTime(org.createdAt)}</td>
                      <td className={td}>{baseBadge(status)}</td>
                      <td className={td}>{start ? fmtDate(start) : "—"}</td>
                      <td className={td}>
                        {end ? <span className="text-rose-600">{fmtDate(end)}</span> : "—"}
                      </td>
                      <td className={td}>
                        {status.subscribed || org.plan === "PRO" ? (
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
                        {org.plan === "PRO" ? <Badge className="bg-indigo-100 text-indigo-800">PRO</Badge> : "—"}
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
