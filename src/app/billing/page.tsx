import Link from "next/link";
import { requireSession, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { baseStatus, BASE_PRICE_JPY, seatTotal, EARLY_BIRD_DEADLINE, isEarlyBird } from "@/lib/pricing";
import { PRO_PRICE_JPY, MAX_PRO_PRICE_JPY, TEAM_PRICE_JPY } from "@/lib/plan";
import { startBaseCheckout, openBaseBillingPortal } from "@/app/actions/base-billing";
import { logout } from "@/app/(auth)/actions";
import { btnSecondary } from "@/components/ui";

export const metadata = { title: "ご利用プラン | Saleshub" };

const yen = (n: number) => `¥${n.toLocaleString()}`;

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

  const [org, seats] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: session.org.id },
      select: {
        name: true,
        basePlanStatus: true,
        freeUntil: true,
        earlyBird: true,
        stripeCustomerId: true,
      },
    }),
    db.membership.count({ where: { orgId: session.org.id } }),
  ]);
  const status = baseStatus(org);
  const memberSeats = Math.max(1, seats);
  const baseMonthly = seatTotal(BASE_PRICE_JPY, memberSeats); // 基本プランの月額合計 (単価 × 人数)
  const earlyBirdOpen = isEarlyBird();

  const fmtDate = (d: Date) =>
    `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  const seatNote = `月額 ¥${BASE_PRICE_JPY}/人 × ${memberSeats}名 = ${yen(baseMonthly)} (税込)`;

  // 継続課金への同意チェック付きの登録フォーム (base checkout は consent 必須)
  const CheckoutForm = ({ label, full }: { label: string; full?: boolean }) => (
    <form action={startBaseCheckout} className="mt-6">
      <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs leading-relaxed text-slate-600">
        <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 accent-akane-600" />
        <span>
          <Link href="/terms" target="_blank" className="font-medium text-akane-600 underline">利用規約</Link>
          ・
          <Link href="/privacy" target="_blank" className="font-medium text-akane-600 underline">個人情報保護方針</Link>
          に同意し、<strong>{seatNote}</strong> の継続課金を承諾します
        </span>
      </label>
      <button
        type="submit"
        className={`mt-3 inline-flex items-center gap-1.5 rounded-lg bg-akane-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-akane-700 ${full ? "w-full justify-center" : ""}`}
      >
        {label}
      </button>
    </form>
  );

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-akane-50 via-white to-slate-100 p-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="text-3xl font-bold tracking-tight text-akane-700">Saleshub</div>
          <p className="mt-2 text-sm text-slate-500">{org.name} のご利用プラン</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {sp.billing === "canceled" && (
            <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              基本プランを解約しました。ご利用ありがとうございました。データは保存されています。再開はいつでも下記から可能です。
            </div>
          )}

          {status.subscribed ? (
            <>
              <h1 className="text-lg font-bold text-slate-900">基本プラン: ご契約中</h1>
              <p className="mt-2 text-sm text-slate-500">
                {seatNote} でご利用いただいています。ありがとうございます。
                <br />
                <span className="text-xs text-slate-400">
                  メンバーを追加すると、次回の更新時に人数に応じて課金額が調整されます。
                </span>
              </p>
              {admin && org.stripeCustomerId && (
                <div className="mt-6 flex flex-wrap gap-3">
                  <form action={openBaseBillingPortal}>
                    <button type="submit" className={btnSecondary}>
                      支払い方法の変更 (Stripe ポータル)
                    </button>
                  </form>
                  <Link href="/settings/cancel" className={btnSecondary}>
                    解約する
                  </Link>
                </div>
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
                無料期間の終了後は {seatNote} です。今すぐ登録しても、請求は Stripe
                の課金開始日から始まります。
              </p>
              {admin ? (
                <CheckoutForm label="基本プランに登録する" />
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
                Saleshub のご利用を続けるには、基本プラン ({seatNote})
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
                <CheckoutForm label="基本プランに登録して続ける" full />
              ) : (
                <p className="mt-6 text-xs text-slate-400">
                  プラン登録には管理者権限が必要です。組織のオーナーにご依頼ください。
                </p>
              )}
            </>
          )}

          {sp.billing === "consent" && (
            <p className="mt-4 text-xs text-rose-600">
              登録には、利用規約・個人情報保護方針および継続課金への同意 (チェック) が必要です。
            </p>
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
              {" ・ "}
              <Link href="/tokushoho" className="hover:underline">特定商取引法に基づく表記</Link>
            </span>
            <form action={logout}>
              <button className="font-medium text-slate-500 hover:text-akane-600">ログアウト</button>
            </form>
          </div>
        </div>
      </div>

      {/* 料金プラン一覧 (基本 → Pro → MAX → for Team) */}
      <section className="mt-12 w-full max-w-5xl">
        <div className="mb-6 text-center">
          <h2 className="text-lg font-bold text-slate-900">料金プラン</h2>
          <p className="mt-1 text-sm text-slate-500">
            料金はすべて<strong>1メンバーあたり</strong>の月額です。メンバーを追加すると人数に応じて加算されます。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* 基本プラン */}
          <div className="flex flex-col rounded-2xl border border-akane-200 bg-white p-6 shadow-sm ring-1 ring-akane-100">
            <span className="inline-flex w-fit items-center rounded-full bg-akane-100 px-2.5 py-0.5 text-xs font-bold text-akane-700">
              基本プラン
            </span>
            <p className="mt-4 text-2xl font-bold text-slate-900">
              ¥{BASE_PRICE_JPY}
              <span className="text-sm font-medium text-slate-500"> / 人・月</span>
            </p>
            {earlyBirdOpen ? (
              <p className="mt-1 text-xs font-semibold text-akane-600">
                {EARLY_BIRD_DEADLINE.getMonth() + 1}月{EARLY_BIRD_DEADLINE.getDate()}日までのご登録なら
                <strong> 3ヶ月間 ¥0</strong>
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">初月無料</p>
            )}
            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              {["顧客管理", "案件管理", "契約管理", "売上管理"].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="text-emerald-600">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro プラン */}
          <div className="flex flex-col rounded-2xl border border-amber-200 bg-white p-6 shadow-sm ring-1 ring-amber-100">
            <span className="inline-flex w-fit items-center rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-2.5 py-0.5 text-xs font-bold text-white">
              Pro プラン
            </span>
            <p className="mt-4 text-2xl font-bold text-slate-900">
              +¥{PRO_PRICE_JPY}
              <span className="text-sm font-medium text-slate-500"> / 人・月</span>
            </p>
            <p className="text-xs text-slate-400">基本プランのすべて + 以下</p>
            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              {["経営数値分析 (MRR/利益などの経営指標)", "テンプレート (提案書・見積書などの保管)"].map(
                (f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-amber-500">★</span>
                    {f}
                  </li>
                ),
              )}
            </ul>
          </div>

          {/* MAX プラン */}
          <div className="flex flex-col rounded-2xl border border-violet-200 bg-white p-6 shadow-sm ring-1 ring-violet-100">
            <span className="inline-flex w-fit items-center rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2.5 py-0.5 text-xs font-bold text-white">
              MAX プラン
            </span>
            <p className="mt-4 text-2xl font-bold text-slate-900">
              +¥{MAX_PRO_PRICE_JPY.toLocaleString()}
              <span className="text-sm font-medium text-slate-500"> / 人・月</span>
            </p>
            <p className="text-xs text-slate-400">Pro プランのすべて + 以下</p>
            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              {["壁打ちCOO (専属COOとの壁打ちチャット)", "週1回のプロによるカスタマイズ"].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="text-violet-500">◆</span>
                  {f}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs font-medium text-violet-600">近日公開</p>
          </div>

          {/* for Team プラン (Coming Soon) */}
          <div className="flex flex-col rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm ring-1 ring-indigo-100">
            <span className="inline-flex w-fit items-center rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-2.5 py-0.5 text-xs font-bold text-white">
              for Team
            </span>
            <p className="mt-4 text-2xl font-bold text-slate-900">
              +¥{TEAM_PRICE_JPY.toLocaleString()}
              <span className="text-sm font-medium text-slate-500"> / 人・月</span>
            </p>
            <p className="text-xs text-slate-400">MAX プランのすべて + 以下</p>
            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              {["チームでの壁打ちCOO共有", "チーム横断の売上・コスト分析"].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="text-indigo-500">◆</span>
                  {f}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs font-medium text-indigo-600">近日公開</p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Pro・MAX・for Team は基本プランに追加してご利用いただけます。表示はすべて1メンバーあたりの月額です。
        </p>
      </section>
    </div>
  );
}
