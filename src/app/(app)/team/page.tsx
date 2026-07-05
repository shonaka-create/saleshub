import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { currentUserHasTeamAccess, TEAM_PRICE_JPY } from "@/lib/plan";
import { PageHeader, Card, Badge } from "@/components/ui";

export const metadata = { title: "チーム機能" };

// 提供中のバックオフィス管理機能 (契約管理の手続きテンプレートからも導線あり)
const AVAILABLE = [
  {
    icon: "📄",
    title: "契約書管理",
    description: "契約書を回せているか・同意を得ているか・保管できているかを追跡",
    href: "/team/contract-docs",
  },
  {
    icon: "🧾",
    title: "請求書管理",
    description: "受領/送付・必要項目・締切日の同意・締切日までの入金/支払いを管理",
    href: "/team/invoices",
  },
  {
    icon: "💸",
    title: "委託費管理",
    description: "委託先の稼働を「だれが・いつ・何を・いくら」で記録し費用計上まで管理",
    href: "/team/outsourcing-costs",
  },
];

const UPCOMING = [
  {
    icon: "✅",
    title: "タスク管理",
    description: "チームでのタスク割り当て・進捗共有",
    href: null,
    status: "近日公開",
  },
  {
    icon: "🙋",
    title: "アサイン管理",
    description: "メンバーの担当・稼働状況を案件横断で可視化",
    href: null,
    status: "近日公開",
  },
  {
    icon: "🗂️",
    title: "WBS (作業分解構成図)",
    description: "案件・プロジェクトを工程単位に分解して進捗を可視化",
    href: null,
    status: "近日公開",
  },
];

export default async function TeamPage() {
  const session = await requireSession();
  const hasTeam = await currentUserHasTeamAccess(session.org.id);
  return (
    <div>
      <PageHeader
        title="チーム機能"
        description={`契約書・請求書・委託費管理などのバックオフィス機能をまとめて提供します (¥${TEAM_PRICE_JPY.toLocaleString()}/人・月)`}
      />

      {hasTeam ? (
        <Card className="mb-6 border-sky-100 bg-sky-50/50 p-4">
          <p className="text-sm text-slate-600">
            📄 契約書・請求書・委託費の管理は下記から利用できます。
            <Link href="/contracts/steps" className="mx-1 font-medium text-akane-600 hover:underline">
              契約管理の手続きテンプレート
            </Link>
            に手続きプロセスとして追加すると、各契約のチェックリストからも開けます。
          </p>
        </Card>
      ) : (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 border-indigo-100 bg-indigo-50/50 p-4">
          <p className="text-sm text-slate-600">
            🔒 契約書・請求書・委託費管理はチームプランの機能です。アップグレードすると Pro
            プランの経営数値分析もあわせてご利用いただけます。
          </p>
          <Link
            href="/billing"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            アップグレード →
          </Link>
        </Card>
      )}

      <h2 className="mb-3 text-sm font-bold text-slate-700">バックオフィス管理</h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AVAILABLE.map((item) => (
          <Link key={item.title} href={item.href} className="block">
            <Card className="h-full p-5 transition hover:border-akane-300 hover:shadow">
              <p className="text-3xl">{item.icon}</p>
              <h3 className="mt-3 text-sm font-bold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{item.description}</p>
              {hasTeam ? (
                <Badge className="mt-3 bg-emerald-50 text-emerald-700">利用可能</Badge>
              ) : (
                <Badge className="mt-3 bg-indigo-50 text-indigo-600">🔒 チーム機能</Badge>
              )}
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-bold text-slate-700">今後追加予定</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {UPCOMING.map((item) => {
          const badgeClass = "bg-slate-100 text-slate-500";
          const content = (
            <Card className="h-full p-5 transition hover:border-akane-300 hover:shadow">
              <p className="text-3xl">{item.icon}</p>
              <h2 className="mt-3 text-sm font-bold text-slate-900">{item.title}</h2>
              <p className="mt-1 text-xs text-slate-500">{item.description}</p>
              <Badge className={`mt-3 ${badgeClass}`}>{item.status}</Badge>
            </Card>
          );
          return item.href ? (
            <Link key={item.title} href={item.href} className="block">
              {content}
            </Link>
          ) : (
            <div key={item.title}>{content}</div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-slate-400">
        契約書・請求書・委託費管理はチームプラン (¥{TEAM_PRICE_JPY.toLocaleString()}/人・月) の機能で、Pro
        プランの全機能も含まれます。タスク管理・アサイン管理・WBS などは順次追加予定です。追加してほしい機能があればお気軽にお問い合わせください。
      </p>
    </div>
  );
}
