import { requireSession } from "@/lib/auth";
import { PageHeader, Card, Badge } from "@/components/ui";

export const metadata = { title: "請求書管理" };

const FEATURES = [
  "契約・売上から請求書をワンクリックで作成",
  "入金ステータス (未請求 / 請求済 / 入金済) の管理",
  "PDF の発行・ダウンロード・再送",
];

export default async function InvoicesPage() {
  await requireSession();
  return (
    <div>
      <PageHeader title="請求書管理" description="請求書の作成・発行・入金管理をこれひとつで" />
      <Card className="p-8 text-center">
        <p className="text-4xl">🧾</p>
        <Badge className="mt-3 bg-slate-100 text-slate-600">Coming Soon</Badge>
        <h2 className="mt-3 text-lg font-bold text-slate-900">請求書管理は近日公開予定です</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          契約・売上データと連動した請求書の発行・入金管理機能を準備しています。
        </p>
        <ul className="mx-auto mt-5 max-w-sm space-y-2 text-left text-sm text-slate-700">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <span className="text-slate-400">◦</span>
              {f}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
