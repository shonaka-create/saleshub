import { requireSession, isAdmin, isCurrentUserSystemAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { planStatus } from "@/lib/plan";
import { PageHeader, Card } from "@/components/ui";
import { ProUpsell } from "../pro-upsell";
import { TemplateLibrary } from "./templates-client";

export const metadata = { title: "テンプレート" };

export default async function TemplatesPage() {
  const session = await requireSession();

  // テンプレートは Pro プランの機能 (トライアル含む)。運営者は課金状態に関わらず解放。
  const [org, sysAdmin] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: session.org.id },
      select: { plan: true, trialEndsAt: true, teamPlan: true },
    }),
    isCurrentUserSystemAdmin(),
  ]);
  const status = planStatus(org);

  if (!status.hasAccess && !sysAdmin) {
    return (
      <div>
        <PageHeader
          title="テンプレート"
          description="提案書・見積書・契約書などのファイル (Word / Excel / PowerPoint / PDF) や Canva・Notion 等のURLを保管し、必要なときにすぐ開ける保管庫です。"
        />
        <Card className="p-8">
          <ProUpsell
            admin={isAdmin(session.role)}
            trialAvailable={status.trialAvailable}
            headline={
              status.trialAvailable
                ? "テンプレートを含む Pro 機能を14日間無料で試せます"
                : "テンプレートは Pro プランの機能です"
            }
          />
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
        description="普段使う提案書・見積書・契約書などのファイル (Word / Excel / PowerPoint / PDF 等) や、Canva・X・Notion などのURLを保管し、必要なときにすぐ開けます。"
      />
      <TemplateLibrary
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          category: t.category,
          fileName: t.fileName,
          fileSize: t.fileSize,
          sourceUrl: t.sourceUrl,
          downloadCount: t.downloadCount,
          updatedAt: t.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
