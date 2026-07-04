import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { PageHeader, Card, Badge } from "@/components/ui";

export const metadata = { title: "チーム機能" };

const STEPS = [
  {
    icon: "🤝",
    title: "① 契約成立",
    description: "案件が受注し、契約管理に契約として登録される",
    href: "/contracts",
    soon: false,
  },
  {
    icon: "📄",
    title: "② 契約書を発行",
    description: "契約書ファイルの保管・締結状況の管理",
    href: "/team/contract-docs",
    soon: true,
  },
  {
    icon: "🧾",
    title: "③ 請求書を発行・入金管理",
    description: "契約・売上データと連動した請求書の作成と入金ステータス管理",
    href: "/team/invoices",
    soon: true,
  },
  {
    icon: "💸",
    title: "④ 委託費を計上",
    description: "外注先・委託先への支払いを案件ごとに管理",
    href: "/team/outsourcing-costs",
    soon: true,
  },
];

export default async function TeamPage() {
  await requireSession();
  return (
    <div>
      <PageHeader
        title="チーム機能"
        description="契約成立後の書類・経費まわりを、ひとつのワークフローとしてまとめて管理します"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <Link key={s.href} href={s.href} className="block">
            <Card className="h-full p-5 transition hover:border-akane-300 hover:shadow">
              <p className="text-3xl">{s.icon}</p>
              <h2 className="mt-3 text-sm font-bold text-slate-900">{s.title}</h2>
              <p className="mt-1 text-xs text-slate-500">{s.description}</p>
              {s.soon && (
                <Badge className="mt-3 bg-slate-100 text-slate-500">近日公開</Badge>
              )}
            </Card>
          </Link>
        ))}
      </div>

      <p className="mt-6 text-xs text-slate-400">
        請求書管理・契約書管理・委託費管理は「チーム」プラン (¥3,000/月) の機能として今後公開予定です。
      </p>
    </div>
  );
}
