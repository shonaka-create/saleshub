import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { PageHeader, Card, Badge } from "@/components/ui";

export const metadata = { title: "チーム機能" };

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
  await requireSession();
  return (
    <div>
      <PageHeader
        title="チーム機能"
        description="チームでの生産性を高める機能を、今後このページに順次追加していきます"
      />

      <Card className="mb-6 border-sky-100 bg-sky-50/50 p-4">
        <p className="text-sm text-slate-600">
          📄 請求書・契約書・委託費の管理は
          <Link href="/contracts/steps" className="mx-1 font-medium text-akane-600 hover:underline">
            契約管理の手続きテンプレート
          </Link>
          に統合しました。手続きプロセスの1つとして追加できます。
        </p>
      </Card>

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
        これらは「チーム」プラン (¥3,000/月) の機能として今後公開予定です。追加してほしい機能があればお気軽にお問い合わせください。
      </p>
    </div>
  );
}
