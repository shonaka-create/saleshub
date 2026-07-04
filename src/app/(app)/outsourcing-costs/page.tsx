import { requireSession } from "@/lib/auth";
import { PageHeader, Card, Badge } from "@/components/ui";

export const metadata = { title: "委託費管理" };

const FEATURES = [
  "外注先・委託先ごとの支払い管理",
  "案件・契約に紐づく委託費の見える化",
  "経営数値分析の外注費アラートと連動",
];

export default async function OutsourcingCostsPage() {
  await requireSession();
  return (
    <div>
      <PageHeader title="委託費管理" description="外注・委託先への支払いを案件ごとに管理" />
      <Card className="p-8 text-center">
        <p className="text-4xl">🤝</p>
        <Badge className="mt-3 bg-slate-100 text-slate-600">Coming Soon</Badge>
        <h2 className="mt-3 text-lg font-bold text-slate-900">委託費管理は近日公開予定です</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          外注先・委託先ごとの支払いを案件と紐づけて管理し、コストを見える化する機能を準備しています。
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
