"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// モバイル/タブレット用ヘッダーに表示する「今どこのメニューか」のタイトル。
// パスの前方一致 (最長一致) で判定する。
const SECTION_TITLES: [string, string][] = [
  ["/customers", "顧客管理"],
  ["/deals", "案件管理"],
  ["/contracts", "契約管理"],
  ["/revenue", "売上管理"],
  ["/dashboard", "経営数値分析"],
  ["/templates", "テンプレート"],
  ["/team", "チーム機能"],
  ["/advisor", "壁打ちCOO"],
  ["/insights", "インサイト"],
  ["/settings", "設定"],
  ["/billing", "プラン"],
  ["/admin", "システム管理"],
];

function sectionTitle(pathname: string): string {
  let best = "Saleshub";
  let bestLen = 0;
  for (const [prefix, label] of SECTION_TITLES) {
    if ((pathname === prefix || pathname.startsWith(prefix + "/")) && prefix.length > bestLen) {
      best = label;
      bestLen = prefix.length;
    }
  }
  return best;
}

export function AppShell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // ルート遷移でドロワーを閉じる
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // ドロワー展開中は背面の縦スクロールを止める
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const title = sectionTitle(pathname);

  return (
    // overflow-x-clip: 子コンテンツが横幅を超えても「ページ外」横スクロールを出さない
    <div className="min-h-screen overflow-x-clip lg:flex">
      {/* モバイル/タブレット用ヘッダー — 現在のメニュー名 + ハンバーガー (lg 以上では非表示) */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="メニューを開く"
          aria-expanded={open}
          className="-ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="truncate text-base font-bold text-slate-900">{title}</span>
      </header>

      {/* ドロワー展開時の背景オーバーレイ (モバイルのみ・タップで閉じる) */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          aria-hidden
        />
      )}

      {/* サイドバー: PC (lg) は常時表示、モバイル/タブレットはオフキャンバス (ハンバーガーで開閉) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 max-w-[82%] flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-out lg:w-60 lg:translate-x-0 ${
          open ? "translate-x-0 shadow-xl" : "-translate-x-full lg:shadow-none"
        }`}
      >
        {/* モバイル用の閉じるボタン */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="メニューを閉じる"
          className="absolute right-2.5 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 lg:hidden"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
        {sidebar}
      </aside>

      {/* メイン: min-w-0 で子 (幅広テーブル等) がレイアウトを押し広げないようにする (ページ外横スクロール防止) */}
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:ml-60 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
