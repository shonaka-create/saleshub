import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { DATA_SOURCE_TYPE_LABELS } from "@/lib/constants";
import { PageHeader, Card, Badge, btnPrimary, inputCls, labelCls, EmptyState } from "@/components/ui";
import { createDatasetFromText } from "@/app/actions/datasets";

export const metadata = { title: "データ連携" };

export default async function DataPage() {
  const session = await requireSession();
  const [sources, datasets] = await Promise.all([
    db.dataSource.findMany({ where: { orgId: session.org.id }, orderBy: { createdAt: "asc" } }),
    db.dataset.findMany({
      where: { orgId: session.org.id },
      include: { source: true, _count: { select: { rows: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="データ連携"
        description="外部データの取込と閲覧。Google Analytics などからのデータをここに蓄積し、表として確認できます。"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {sources.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-800">{s.name}</p>
              <Badge
                className={
                  s.type === "GA4"
                    ? "bg-amber-50 text-amber-700"
                    : s.type === "MCP"
                      ? "bg-indigo-50 text-indigo-700"
                      : "bg-slate-100 text-slate-600"
                }
              >
                {DATA_SOURCE_TYPE_LABELS[s.type] ?? s.type}
              </Badge>
            </div>
            {s.type === "GA4" && (
              <p className="mt-2 text-xs text-slate-400">
                今後、Claude の MCP 連携で GA4 のデータを取得・加工してデータセットとして自動蓄積する予定の接続枠です。
              </p>
            )}
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">データセット</h2>
          {datasets.length === 0 ? (
            <EmptyState title="データセットがありません" description="右のフォームからCSV/TSVを貼り付けて作成できます" />
          ) : (
            <ul className="space-y-2">
              {datasets.map((d) => (
                <li key={d.id}>
                  <Link href={`/data/${d.id}`}>
                    <Card className="p-4 transition hover:border-akane-300">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-800">{d.name}</p>
                        <span className="text-xs text-slate-400">{d._count.rows} 行</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {d.source?.name ?? "手入力"} · 更新 {d.updatedAt.toLocaleDateString("ja-JP")}
                      </p>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Card className="h-fit p-6">
          <h2 className="mb-1 text-sm font-semibold text-slate-800">CSV/TSV から取込</h2>
          <p className="mb-4 text-xs text-slate-500">
            Excel やスプレッドシートからコピーして貼り付けてください。1行目は見出しとして扱われます。
          </p>
          <form action={createDatasetFromText} className="space-y-3">
            <div>
              <label className={labelCls}>データセット名</label>
              <input name="name" required placeholder="例: GA 月次レポート 2026上期" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>データ (CSV または タブ区切り)</label>
              <textarea
                name="data" required rows={8}
                placeholder={"月,ユーザー数,セッション数\n2026-05,450,590\n2026-06,610,800"}
                className={`${inputCls} font-mono text-xs`}
              />
            </div>
            <button type="submit" className={btnPrimary}>取込む</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
