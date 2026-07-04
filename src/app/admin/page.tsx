import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";
import { baseStatus, BASE_PRICE_JPY } from "@/lib/pricing";
import { Card, Badge } from "@/components/ui";

export const metadata = { title: "システム管理 | Saleshub" };

// サービス運営者専用: 全テナントの登録・課金・解約状況を横断的に閲覧する。
// User.isSystemAdmin が true のユーザーのみアクセス可。テナント横断のため dbAdmin を使う。

const EVENT_LABELS: Record<string, { label: string; cls: string }> = {
  REGISTER: { label: "新規登録", cls: "bg-emerald-100 text-emerald-800" },
  BASE_SUBSCRIBED: { label: "基本プラン課金開始", cls: "bg-sky-100 text-sky-800" },
  BASE_CANCELED: { label: "基本プラン解約", cls: "bg-rose-100 text-rose-700" },
  PRO_SUBSCRIBED: { label: "Pro課金開始", cls: "bg-indigo-100 text-indigo-800" },
  PRO_CANCELED: { label: "Pro解約", cls: "bg-rose-100 text-rose-700" },
  PRO_TRIAL_STARTED: { label: "Proトライアル開始", cls: "bg-amber-100 text-amber-800" },
};

function fmtDateTime(d: Date): string {
  return d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminPage() {
  const session = await requireSession();
  const me = await dbAdmin.user.findUnique({
    where: { id: session.user.id },
    select: { isSystemAdmin: true },
  });
  if (!me?.isSystemAdmin) redirect("/dashboard");

  const [orgs, userCount, events] = await Promise.all([
    dbAdmin.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        memberships: { include: { user: true } },
        _count: { select: { customers: true, contracts: true } },
      },
    }),
    dbAdmin.user.count(),
    dbAdmin.billingEvent.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  const now = Date.now();
  const withStatus = orgs.map((o) => ({ org: o, status: baseStatus(o, now) }));
  const counts = {
    orgs: orgs.length,
    users: userCount,
    free: withStatus.filter((x) => !x.status.subscribed && x.status.inFreePeriod).length,
    paying: withStatus.filter((x) => x.status.subscribed).length,
    canceled: withStatus.filter((x) => x.status.canceled).length,
    expired: withStatus.filter((x) => !x.status.hasAccess).length,
    pro: orgs.filter((o) => o.plan === "PRO").length,
  };

  const tiles = [
    { label: "登録組織数", value: `${counts.orgs}`, sub: `ユーザー ${counts.users}名` },
    { label: "基本プラン課金中", value: `${counts.paying}`, sub: `月額 ¥${BASE_PRICE_JPY} × ${counts.paying}` },
    { label: "無料期間中", value: `${counts.free}`, sub: "早期特典3ヶ月 / 初月無料" },
    { label: "解約・期限切れ", value: `${counts.canceled} / ${counts.expired}`, sub: "解約済 / 未課金停止中" },
    { label: "Pro (経営分析)", value: `${counts.pro}`, sub: "月額 ¥490 課金中" },
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
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">🛠 システム管理</h1>
            <p className="mt-1 text-sm text-slate-500">
              Saleshub 全体の登録・課金・解約状況 (運営者専用)
            </p>
          </div>
          <Link href="/dashboard" className="text-sm font-medium text-akane-600 hover:underline">
            ← アプリへ戻る
          </Link>
        </div>

        {/* サマリー */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
                  <th className={th}>無料期間終了</th>
                  <th className={th}>特典</th>
                  <th className={th}>Pro</th>
                  <th className={th}>メンバー</th>
                  <th className={th}>顧客 / 契約</th>
                </tr>
              </thead>
              <tbody>
                {withStatus.map(({ org, status }) => {
                  const owner = org.memberships.find((m) => m.role === "OWNER")?.user;
                  return (
                    <tr key={org.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className={`${td} font-medium text-slate-900`}>{org.name}</td>
                      <td className={td}>
                        {owner ? `${owner.name} (${owner.email})` : "—"}
                      </td>
                      <td className={td}>{fmtDateTime(org.createdAt)}</td>
                      <td className={td}>{baseBadge(status)}</td>
                      <td className={td}>
                        {org.freeUntil ? fmtDateTime(org.freeUntil) : "未設定 (旧データ)"}
                      </td>
                      <td className={td}>
                        {org.earlyBird ? <Badge className="bg-amber-100 text-amber-800">早期3ヶ月</Badge> : "—"}
                      </td>
                      <td className={td}>
                        {org.plan === "PRO" ? <Badge className="bg-indigo-100 text-indigo-800">PRO</Badge> : "—"}
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

        {/* 利用ログ */}
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">利用ログ (登録・課金・解約 / 直近100件)</h2>
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
