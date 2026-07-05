"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// /team 配下のサブページ (契約書・請求書・委託費管理) から「チーム機能」トップへ戻る導線。
// /team 本体では表示しない。
export function TeamBackLink() {
  const pathname = usePathname();
  if (pathname === "/team") return null;
  return (
    <Link
      href="/team"
      className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-akane-700"
    >
      ← チーム機能に戻る
    </Link>
  );
}
