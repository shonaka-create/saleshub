import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { TemplateLibrary } from "./templates-client";

export const metadata = { title: "テンプレート" };

export default async function TemplatesPage() {
  const session = await requireSession();
  const templates = await db.template.findMany({
    where: { orgId: session.org.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="テンプレート"
        description="普段使う提案書・見積書・契約書などのファイル (Word / Excel / PowerPoint / PDF 等) を保管し、必要なときにダウンロードして使えます。"
      />
      <TemplateLibrary
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          category: t.category,
          fileName: t.fileName,
          fileSize: t.fileSize,
          downloadCount: t.downloadCount,
          updatedAt: t.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
