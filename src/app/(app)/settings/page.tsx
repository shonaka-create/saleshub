import { requireSession, isAdmin } from "@/lib/auth";
import { Card } from "@/components/ui";
import { OrgSettingsForm } from "./org-form";

export default async function OrgSettingsPage() {
  const session = await requireSession();

  return (
    <Card className="max-w-2xl p-6">
      <h2 className="mb-1 text-base font-semibold">組織・通貨設定</h2>
      <p className="mb-6 text-sm text-slate-500">
        基準通貨を設定すると、案件・契約・売上管理・ダッシュボードのすべての金額がこの通貨で表示されます。
      </p>
      <OrgSettingsForm
        admin={isAdmin(session.role)}
        orgName={session.org.name}
        baseCurrency={session.org.baseCurrency}
      />
    </Card>
  );
}
