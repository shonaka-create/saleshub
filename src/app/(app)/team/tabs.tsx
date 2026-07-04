"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/team", label: "概要" },
  { href: "/team/invoices", label: "請求書管理" },
  { href: "/team/contract-docs", label: "契約書管理" },
  { href: "/team/outsourcing-costs", label: "委託費管理" },
];

export function TeamTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex flex-wrap gap-1 border-b border-slate-200">
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
