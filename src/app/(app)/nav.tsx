"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { switchOrg } from "../(auth)/actions";

const links = [
  // 旧「ダッシュボード」+「経営分析」は /dashboard (経営数値分析) に統合済み
  { href: "/dashboard", label: "経営数値分析", icon: "📈" },
  { href: "/customers", label: "顧客管理", icon: "👥" },
  { href: "/deals", label: "案件管理", icon: "📋" },
  { href: "/contracts", label: "契約管理", icon: "📝" },
  { href: "/revenue", label: "売上管理", icon: "💰" },
  { href: "/advisor", label: "相談君", icon: "🤝", maxPro: true },
  { href: "/templates", label: "テンプレート", icon: "📁" },
  { href: "/settings", label: "設定", icon: "⚙️" },
] as { href: string; label: string; icon: string; pro?: boolean; maxPro?: boolean }[];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-akane-50 text-akane-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="text-base leading-none">{link.icon}</span>
              {link.label}
              {link.pro && (
                <span className="ml-auto rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  PRO
                </span>
              )}
              {link.maxPro && (
                <span className="ml-auto rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  MAX
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function OrgSwitcher({
  current,
  orgs,
}: {
  current: { id: string; name: string };
  orgs: { id: string; name: string }[];
}) {
  const router = useRouter();
  if (orgs.length <= 1) {
    return <p className="mt-1 truncate text-xs text-slate-500">{current.name}</p>;
  }
  return (
    <select
      className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600"
      value={current.id}
      onChange={async (e) => {
        await switchOrg(e.target.value);
        router.refresh();
      }}
    >
      {orgs.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
