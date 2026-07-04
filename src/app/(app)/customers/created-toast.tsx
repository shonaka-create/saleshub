"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { btnPrimary } from "@/components/ui";

export function CreatedToast({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string;
}) {
  const [visible, setVisible] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (visible) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("created");
    router.replace(url.pathname + url.search, { scroll: false });
  }, [visible, router]);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-lg">
        <span className="text-sm text-slate-700">
          <strong className="text-slate-900">{customerName}</strong> を登録しました
        </span>
        <Link href={`/customers/${customerId}`} className={btnPrimary}>
          詳細を見る →
        </Link>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="text-slate-400 hover:text-slate-600"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
