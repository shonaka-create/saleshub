import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { buildRevenueReport } from "@/lib/revenue";
import { addMonths, defaultRange, formatMonthJa } from "@/lib/months";
import { PageHeader, Card } from "@/components/ui";
import { RevenueGrid } from "./grid";

export const metadata = { title: "売上管理" };

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const range = defaultRange();
  const from = /^\d{4}-\d{2}$/.test(params.from ?? "") ? params.from! : range.from;
  const to = /^\d{4}-\d{2}$/.test(params.to ?? "") ? params.to! : range.to;

  const report = await buildRevenueReport(session.org.id, from, to);

  const shift = (n: number) => `/revenue?from=${addMonths(from, n)}&to=${addMonths(to, n)}`;

  return (
    <div>
      <PageHeader
        title="売上管理"
        description={`契約から自動計算された売上に加え、セルをクリックして手入力・上書きができます (単位: ${report.baseCurrency}換算)`}
        actions={
          <div className="flex items-center gap-2">
            <Link href={shift(-3)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50">
              ← 3ヶ月前
            </Link>
            <span className="text-sm text-slate-500">
              {formatMonthJa(from)} 〜 {formatMonthJa(to)}
            </span>
            <Link href={shift(3)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50">
              3ヶ月後 →
            </Link>
          </div>
        }
      />

      <Card className="overflow-hidden">
        <RevenueGrid report={report} />
      </Card>

      <p className="mt-4 text-xs text-slate-400">
        ・サービス行のセルは契約データから自動計算されます。クリックして数値を入力すると上書きされ、<span className="font-medium text-amber-600">●</span> マークが付きます。空にして保存すると自動計算値に戻ります。
        <br />
        ・「行を追加」でサービス外の売上 (スポット案件など) を自由に追加できます。経費行は設定画面のカテゴリマスタから変更できます。
      </p>
    </div>
  );
}
