import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Akane Hub", template: "%s | Akane Hub" },
  description: "CRM・案件管理・売上管理の統合業務システム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
