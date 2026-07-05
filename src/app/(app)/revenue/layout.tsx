// サービス・プランはトップメニュー (/services)、経費カテゴリは月次表のポップアップに移設したため、
// 売上管理のタブは廃止。レイアウトは子ページをそのまま表示する。
export default function RevenueLayout({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
