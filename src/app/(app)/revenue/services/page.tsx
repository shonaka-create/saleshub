import { redirect } from "next/navigation";

// サービス・プラン管理はトップメニュー /services に移設。旧URLはリダイレクトで維持する。
export default function LegacyServicesRedirect() {
  redirect("/services");
}
