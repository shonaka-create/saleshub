import { requireSession } from "@/lib/auth";
import { PageHeader, Card, Badge } from "@/components/ui";

export const metadata = { title: "契約書管理" };

const FEATURES = [
  "契約書ファイル (PDF / Word) の保管・バージョン管理",
  "締結状況・契約期間・更新日のトラッキング",
  "顧客・案件との紐付けでいつでも参照",
];

export default async function ContractDocsPage() {
  await requireSession();
  return (
    <div>
      <PageHeader title="契約書管理" description="契約書ファイルの保管・締結状況の管理を一元化" />
      <Card className="p-8 text-center">
        <p className="text-4xl">📄</p>
        <Badge className="mt-3 bg-slate-100 text-slate-600">Coming Soon</Badge>
        <h2 className="mt-3 text-lg font-bold text-slate-900">契約書管理は近日公開予定です</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          締結済みの契約書ファイルを保管し、契約期間や更新日を管理できる機能を準備しています。
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
