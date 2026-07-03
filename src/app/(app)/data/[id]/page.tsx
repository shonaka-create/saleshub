import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { deleteDataset } from "@/app/actions/datasets";

type Column = { key: string; label: string; type: string };

export default async function DatasetPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const dataset = await db.dataset.findFirst({
    where: { id, orgId: session.org.id },
    include: { source: true, rows: { orderBy: { rowIndex: "asc" } } },
  });
  if (!dataset) notFound();

  const columns: Column[] = JSON.parse(dataset.columns);
  const rows = dataset.rows.map((r) => JSON.parse(r.data) as Record<string, string | number>);

  return (
    <div>
      <PageHeader
        title={dataset.name}
        description={`${dataset.source?.name ?? "手入力"} · ${rows.length} 行 · 更新 ${dataset.updatedAt.toLocaleDateString("ja-JP")}`}
        actions={
          <div className="flex items-center gap-3">
            <Link href="/data" className="text-sm text-slate-500 hover:underline">← 一覧へ</Link>
            <ConfirmButton
              action={deleteDataset.bind(null, dataset.id)}
              message={`データセット「${dataset.name}」を削除しますか？`}
              className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
            >
              削除
            </ConfirmButton>
          </div>
        }
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-2.5 text-xs font-semibold text-slate-500 ${col.type === "number" ? "text-right" : "text-left"}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-2 text-sm ${col.type === "number" ? "tabular text-right" : "text-left"}`}
                    >
                      {col.type === "number" && typeof row[col.key] === "number"
                        ? (row[col.key] as number).toLocaleString("ja-JP")
                        : String(row[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
