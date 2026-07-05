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
  let from = /^\d{4}-\d{2}$/.test(params.from ?? "") ? params.from! : range.from;
  let to = /^\d{4}-\d{2}$/.test(params.to ?? "") ? params.to! : range.to;
  if (from > to) [from, to] = [to, from]; // 逆転指定でも空表示にしない

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
        ・売上セクションの「＋ 売上行を追加」で、紐づけるサービスを選んで単発売上 (スポット案件など) を追加できます。数値分析にもそのサービスの売上として反映されます。新しいサービス自体を増やしたい場合は左メニューの
        <Link href="/services" className="text-akane-600 hover:underline">「サービス・プラン」</Link>
        から、経費カテゴリは経費セクションの「カテゴリを編集」ボタンから追加・変更できます。
      </p>
    </div>
  );
}
