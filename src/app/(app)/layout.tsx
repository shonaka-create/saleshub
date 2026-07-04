import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { baseStatus, BASE_PRICE_JPY } from "@/lib/pricing";
import { logout } from "../(auth)/actions";
import { NavLinks, OrgSwitcher } from "./nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const [memberships, org, me] = await Promise.all([
    db.membership.findMany({
      where: { userId: session.user.id },
      include: { org: true },
    }),
    db.organization.findUniqueOrThrow({
      where: { id: session.org.id },
      select: { basePlanStatus: true, freeUntil: true, earlyBird: true },
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { isSystemAdmin: true },
    }),
  ]);

  // 基本プラン (システム利用料): 無料期間が終了して未課金の組織は課金案内ページへ
  const base = baseStatus(org);
  if (!base.hasAccess) redirect("/billing");

  const fmtDate = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`;

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <Link href="/dashboard" className="text-lg font-bold tracking-tight text-akane-700">
            Saleshub
          </Link>
          <OrgSwitcher
            current={{ id: session.org.id, name: session.org.name }}
            orgs={memberships.map((m) => ({ id: m.org.id, name: m.org.name }))}
          />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <NavLinks />
          {me?.isSystemAdmin && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <span className="text-base leading-none">🛠</span>
                システム管理
              </Link>
            </div>
          )}
        </nav>

        <div className="border-t border-slate-100 px-5 py-4">
          <div className="mb-2">
            <p className="truncate text-sm font-medium text-slate-800">{session.user.name}</p>
            <p className="truncate text-xs text-slate-400">
              {session.user.email} · {ROLE_LABELS[session.role as Role] ?? session.role}
            </p>
          </div>
          <form action={logout}>
            <button className="text-xs font-medium text-slate-500 hover:text-akane-600">
              ログアウト
            </button>
          </form>
        </div>
      </aside>

      <main className="ml-60 flex-1 px-8 py-8">
        <div className="mx-auto max-w-6xl">
          {/* 無料期間中の案内バナー */}
          {!base.subscribed && base.inFreePeriod && base.freeUntil && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-akane-200 bg-akane-50 px-4 py-2.5">
              <p className="text-sm text-akane-800">
                {base.earlyBird ? "🎉 早期登録特典 (3ヶ月無料) " : "初月無料 "}
                — {fmtDate(base.freeUntil)}まで無料 (残り {base.freeDaysLeft}日)。以降は月額 ¥
                {BASE_PRICE_JPY} です。
              </p>
              <Link
                href="/billing"
                className="text-sm font-semibold text-akane-700 hover:underline"
              >
                プランの確認・登録 →
              </Link>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
