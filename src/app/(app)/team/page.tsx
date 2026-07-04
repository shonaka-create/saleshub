import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { PageHeader, Card, Badge } from "@/components/ui";

export const metadata = { title: "チーム機能" };

const UPCOMING = [
  {
    icon: "📄",
    title: "契約書管理",
    description: "契約書ファイルの保管・締結状況の管理",
    href: "/team/contract-docs",
    status: "近日公開",
  },
  {
    icon: "🧾",
    title: "請求書管理",
    description: "契約・売上データと連動した請求書の作成と入金ステータス管理",
    href: "/team/invoices",
    status: "近日公開",
  },
  {
    icon: "💸",
    title: "委託費管理",
    description: "外注先・委託先への支払いを案件ごとに管理",
    href: "/team/outsourcing-costs",
    status: "近日公開",
  },
  {
    icon: "✅",
    title: "タスク管理",
    description: "チームでのタスク割り当て・進捗共有",
    href: null,
    status: "検討中",
  },
  {
    icon: "🗂️",
    title: "WBS (作業分解構成図)",
    description: "案件・プロジェクトを工程単位に分解して進捗を可視化",
    href: null,
    status: "検討中",
  },
];

export default async function TeamPage() {
  await requireSession();
  return (
    <div>
      <PageHeader
        title="チーム機能"
        description="チームでの生産性を高める機能を、今後このページに順次追加していきます"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {UPCOMING.map((item) => {
          const badgeClass =
            item.status === "近日公開" ? "bg-slate-100 text-slate-500" : "bg-slate-50 text-slate-400";
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
        これらは「チーム」プラン (¥3,000/月) の機能として今後公開予定です。追加してほしい機能があればお気軽にお問い合わせください。
      </p>
    </div>
  );
}
