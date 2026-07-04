import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { planStatus, PRO_PRICE_JPY } from "@/lib/plan";
import { PageHeader, Card } from "@/components/ui";
import { TemplateLibrary } from "./templates-client";

export const metadata = { title: "テンプレート" };

export default async function TemplatesPage() {
  const session = await requireSession();

  // テンプレートは Pro プランの機能 (トライアル含む)
  const org = await db.organization.findUniqueOrThrow({
    where: { id: session.org.id },
    select: { plan: true, trialEndsAt: true },
  });
  const status = planStatus(org);

  if (!status.hasAccess) {
    return (
      <div>
        <PageHeader
          title="テンプレート"
          description="普段使う提案書・見積書・契約書などのファイルを保管し、必要なときにダウンロードして使えます。"
        />
        <Card className="p-8 text-center">
          <p className="text-3xl">📁</p>
          <h3 className="mt-3 text-lg font-bold text-slate-900">
            テンプレートは Pro プランの機能です
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Pro プラン (月額 ¥{PRO_PRICE_JPY}) または14日間無料トライアルでご利用いただけます。
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block rounded-lg bg-akane-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-akane-700"
          >
            トライアル・プラン登録へ (経営数値分析ページ) →
          </Link>
        </Card>
      </div>
    );
  }

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
