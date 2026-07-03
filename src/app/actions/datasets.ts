"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

// 貼り付けCSV/TSVテキストからデータセットを作成 (1行目をヘッダーとして扱う)
export async function createDatasetFromText(formData: FormData): Promise<void> {
  const session = await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  const raw = String(formData.get("data") ?? "").trim();
  if (!name || !raw) return;

  const delimiter = raw.includes("\t") ? "\t" : ",";
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return;

  const headers = lines[0].split(delimiter).map((h) => h.trim());
  const dataLines = lines.slice(1);

  // 列の型を推定 (全行数値なら number)
  const columns = headers.map((label, i) => {
    const isNumber = dataLines.every((line) => {
      const v = (line.split(delimiter)[i] ?? "").trim().replace(/,/g, "");
      return v === "" || Number.isFinite(Number(v));
    });
    return { key: `c${i}`, label, type: isNumber ? "number" : "text" };
  });

  const source = await db.dataSource.findFirst({
    where: { orgId: session.org.id, type: "CSV" },
  });
  const csvSource =
    source ??
    (await db.dataSource.create({
      data: { orgId: session.org.id, name: "CSVインポート", type: "CSV" },
    }));

  const dataset = await db.dataset.create({
    data: {
      orgId: session.org.id,
      sourceId: csvSource.id,
      name,
      columns: JSON.stringify(columns),
    },
  });

  for (let i = 0; i < dataLines.length; i++) {
    const values = dataLines[i].split(delimiter);
    const data: Record<string, string | number> = {};
    columns.forEach((col, ci) => {
      const v = (values[ci] ?? "").trim();
      data[col.key] = col.type === "number" && v !== "" ? Number(v.replace(/,/g, "")) : v;
    });
    await db.dataRow.create({
      data: { datasetId: dataset.id, rowIndex: i, data: JSON.stringify(data) },
    });
  }

  revalidatePath("/data");
  redirect(`/data/${dataset.id}`);
}

export async function deleteDataset(id: string) {
  const session = await requireSession();
  await db.dataset.deleteMany({ where: { id, orgId: session.org.id } });
  revalidatePath("/data");
  redirect("/data");
}
