import { PageHeader } from "@/components/ui";
import { SettingsTabs } from "./tabs";

export const metadata = { title: "設定" };

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PageHeader title="設定" description="組織・メンバー・マスタデータの管理" />
      <SettingsTabs />
      <div className="mt-6">{children}</div>
    </div>
  );
}
