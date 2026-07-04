"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/settings", label: "組織・通貨" },
  { href: "/settings/members", label: "メンバー・招待" },
  { href: "/settings/services", label: "サービス・プラン" },
  { href: "/settings/expense-categories", label: "経費カテゴリ" },
  { href: "/settings/custom-fields", label: "カスタム項目" },
  { href: "/settings/cancel", label: "解約" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-1 border-b border-slate-200">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              active
                ? "border-akane-600 text-akane-700"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
