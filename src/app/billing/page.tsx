import Link from "next/link";
import { requireSession, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { baseStatus, BASE_PRICE_JPY } from "@/lib/pricing";
import { startBaseCheckout, openBaseBillingPortal } from "@/app/actions/base-billing";
import { logout } from "@/app/(auth)/actions";
import { btnPrimary, btnSecondary } from "@/components/ui";

export const metadata = { title: "ご利用プラン | Saleshub" };

// 基本プラン (システム利用料) の案内・登録ページ。
// 無料期間が終了した組織は (app) レイアウトからここへリダイレクトされる。
export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const admin = isAdmin(session.role);

  const org = await db.organization.findUniqueOrThrow({
    where: { id: session.org.id },
    select: {
      name: true,
      basePlanStatus: true,
      freeUntil: true,
      earlyBird: true,
      stripeCustomerId: true,
    },
  });
  const status = baseStatus(org);

  const fmtDate = (d: Date) =>
    `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-akane-50 via-white to-slate-100 p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="text-3xl font-bold tracking-tight text-akane-700">Saleshub</div>
          <p className="mt-2 text-sm text-slate-500">{org.name} のご利用プラン</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {status.subscribed ? (
            <>
              <h1 className="text-lg font-bold text-slate-900">基本プラン: ご契約中</h1>
              <p className="mt-2 text-sm text-slate-500">
                月額 ¥{BASE_PRICE_JPY} でご利用いただいています。ありがとうございます。
              </p>
              {admin && org.stripeCustomerId && (
                <form action={openBaseBillingPortal} className="mt-6">
                  <button type="submit" className={btnSecondary}>
                    支払い方法の変更・解約 (Stripe ポータル)
                  </button>
                </form>
              )}
              <Link href="/dashboard" className="mt-6 inline-block text-sm font-medium text-akane-600 hover:underline">
                ← ダッシュボードへ戻る
              </Link>
            </>
          ) : status.inFreePeriod ? (
            <>
              <h1 className="text-lg font-bold text-slate-900">
                無料期間中です{status.earlyBird ? " (早期登録特典: 3ヶ月無料)" : " (初月無料)"}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {status.freeUntil
                  ? `${fmtDate(status.freeUntil)} まで無料でご利用いただけます (残り ${status.freeDaysLeft}日)。`
                  : "無料でご利用いただけます。"}
                <br />
                無料期間の終了後は月額 ¥{BASE_PRICE_JPY} (税込) です。今すぐ登録しても、請求は Stripe
                の課金開始日から始まります。
              </p>
              {admin ? (
                <form action={startBaseCheckout} className="mt-6">
                  <button type="submit" className={btnPrimary}>
                    基本プランに登録する (月額 ¥{BASE_PRICE_JPY})
                  </button>
                </form>
              ) : (
                <p className="mt-6 text-xs text-slate-400">
                  プラン登録には管理者権限が必要です。組織のオーナーにご依頼ください。
                </p>
              )}
              <Link href="/dashboard" className="mt-6 inline-block text-sm font-medium text-akane-600 hover:underline">
                ← ダッシュボードへ戻る
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-lg font-bold text-slate-900">無料期間が終了しました</h1>
              <p className="mt-2 text-sm text-slate-600">
                Saleshub のご利用を続けるには、基本プラン (月額 ¥{BASE_PRICE_JPY} 税込)
                への登録が必要です。データはそのまま保存されています。
              </p>
              <ul className="mt-5 space-y-2 text-sm text-slate-700">
                {[
                  "顧客管理・案件管理・契約管理",
                  "売上管理 (自動計算 + 手入力)",
                  "経営数値分析ダッシュボード",
                  "メンバー招待・権限管理",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-emerald-600">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {admin ? (
                <form action={startBaseCheckout} className="mt-6">
                  <button type="submit" className={`${btnPrimary} w-full justify-center`}>
                    基本プランに登録して続ける (月額 ¥{BASE_PRICE_JPY})
                  </button>
                </form>
              ) : (
                <p className="mt-6 text-xs text-slate-400">
                  プラン登録には管理者権限が必要です。組織のオーナーにご依頼ください。
                </p>
              )}
            </>
          )}

          {sp.billing === "unconfigured" && (
            <p className="mt-4 text-xs text-rose-600">
              決済設定が未完了です (STRIPE_SECRET_KEY / STRIPE_PRICE_ID_BASE を設定してください)。
            </p>
          )}
          {sp.billing === "forbidden" && (
            <p className="mt-4 text-xs text-rose-600">プラン登録には管理者権限が必要です。</p>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400">
            <span>
              <Link href="/terms" className="hover:underline">利用規約</Link>
              {" ・ "}
              <Link href="/privacy" className="hover:underline">個人情報保護方針</Link>
            </span>
            <form action={logout}>
              <button className="font-medium text-slate-500 hover:text-akane-600">ログアウト</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
