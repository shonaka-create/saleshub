import { requireSession, isAdmin } from "@/lib/auth";
import { parseFxRates } from "@/lib/currency";
import { Card } from "@/components/ui";
import { OrgSettingsForm } from "./org-form";

export default async function OrgSettingsPage() {
  const session = await requireSession();

  return (
    <Card className="max-w-2xl p-6">
      <h2 className="mb-1 text-base font-semibold">組織・通貨設定</h2>
      <p className="mb-6 text-sm text-slate-500">
        基準通貨は売上管理・ダッシュボードの集計通貨です。外貨建て契約は下記レートで換算されます。
      </p>
      <OrgSettingsForm
        admin={isAdmin(session.role)}
        orgName={session.org.name}
        baseCurrency={session.org.baseCurrency}
        rates={parseFxRates(session.org.fxRates)}
      />
    </Card>
  );
}
