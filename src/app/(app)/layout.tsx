import Link from "next/link";
import { requireSession, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { baseStatus, BASE_PRICE_JPY, seatTotal } from "@/lib/pricing";
import { logout } from "../(auth)/actions";
import { NavLinks, OrgSwitcher } from "./nav";
import { AppShell } from "./app-shell";
import { PlanExpiredModal, FreePeriodEndingModal } from "./plan-gate-modal";
import { FreePeriodBanner } from "./free-period-banner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const admin = isAdmin(session.role);
  const [memberships, org, me, seats] = await Promise.all([
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
    db.membership.count({ where: { orgId: session.org.id } }),
  ]);

  const base = baseStatus(org);
  const memberSeats = Math.max(1, seats);
  const monthlyLabel = `月額 ¥${BASE_PRICE_JPY}/人 × ${memberSeats}名 = ¥${seatTotal(BASE_PRICE_JPY, memberSeats).toLocaleString()}`;

  // 基本プラン (システム利用料): 無料期間が終了して未課金の組織はブロッキングポップアップを表示し、
  // アプリ本体はレンダリングしない (課金しないと使えないことをポップアップで明示する)。
  // ただしサービス運営者 (isSystemAdmin) は課金状態に関わらず全機能を解放する。
  if (!base.hasAccess && !me?.isSystemAdmin) {
    return <PlanExpiredModal orgName={session.org.name} monthlyLabel={monthlyLabel} admin={admin} />;
  }

  // 無料期間終了日は JST 固定で表示する (サーバーのローカル時刻 = Vercel では UTC のズレを防ぐ)。
  const fmtDate = (d: Date) => {
    const jst = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    return `${jst.getMonth() + 1}月${jst.getDate()}日`;
  };
  // 無料期間の残りが7日以内なら課金を促すポップアップ (閉じられる)。運営者には出さない。
  const showEndingModal =
    !me?.isSystemAdmin && !base.subscribed && base.inFreePeriod && base.freeDaysLeft <= 7;

  return (
    <>
      <AppShell
        sidebar={
          <>
            <div className="border-b border-slate-100 px-5 py-4">
              <Link href="/customers" className="text-lg font-bold tracking-tight text-akane-700">
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
              {/* 法務ページへのリンク (利用規約・プライバシー・特商法) */}
              <p className="mt-3 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-slate-400">
                <Link href="/terms" target="_blank" className="hover:text-akane-600 hover:underline">
                  利用規約
                </Link>
                <Link href="/privacy" target="_blank" className="hover:text-akane-600 hover:underline">
                  個人情報保護方針
                </Link>
                <Link href="/tokushoho" target="_blank" className="hover:text-akane-600 hover:underline">
                  特定商取引法に基づく表記
                </Link>
              </p>
            </div>
          </>
        }
      >
        {/* 無料期間中の案内バナー (経営数値分析ページでは Pro トライアルバナーと重複するため非表示) */}
        {!base.subscribed && base.inFreePeriod && base.freeUntil && (
          <FreePeriodBanner
            earlyBird={base.earlyBird}
            freeUntilLabel={fmtDate(base.freeUntil)}
            freeDaysLeft={base.freeDaysLeft}
            monthlyLabel={monthlyLabel}
          />
        )}
        {children}
      </AppShell>

      {/* 無料期間終了間近のポップアップ */}
      {showEndingModal && (
        <FreePeriodEndingModal
          daysLeft={base.freeDaysLeft}
          monthlyLabel={monthlyLabel}
          admin={admin}
        />
      )}
    </>
  );
}
