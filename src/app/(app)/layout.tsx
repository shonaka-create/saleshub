import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { logout } from "../(auth)/actions";
import { NavLinks, OrgSwitcher } from "./nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const memberships = await db.membership.findMany({
    where: { userId: session.user.id },
    include: { org: true },
  });

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <Link href="/dashboard" className="text-lg font-bold tracking-tight text-akane-700">
            Akane Hub
          </Link>
          <OrgSwitcher
            current={{ id: session.org.id, name: session.org.name }}
            orgs={memberships.map((m) => ({ id: m.org.id, name: m.org.name }))}
          />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <NavLinks />
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
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
