import Link from "next/link";
import { requireSession, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { baseStatus, BASE_PRICE_JPY, seatTotal, EARLY_BIRD_DEADLINE, isEarlyBird } from "@/lib/pricing";
import { planStatus, PRO_PRICE_JPY, TEAM_PRICE_JPY } from "@/lib/plan";
import { startBaseCheckout, openBaseBillingPortal } from "@/app/actions/base-billing";
import { startProCheckout, startProTrialCheckout, startTeamCheckout, openBillingPortal } from "@/app/actions/billing";
import { logout } from "@/app/(auth)/actions";

export const metadata = { title: "ご利用プラン | Saleshub" };

const yen = (n: number) => `¥${n.toLocaleString()}`;

// 基本プラン・Pro・チームプランの案内・登録ページ。
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
        plan: true,
        trialEndsAt: true,
        teamPlan: true,
        stripeCustomerId: true,
      },
    }),
    db.membership.count({ where: { orgId: session.org.id } }),
  ]);
  const base = baseStatus(org);
  const pro = planStatus(org); // teamPlan を含むので TEAM 加入時は hasAccess=true
  const isTeam = org.teamPlan === "TEAM";
  const memberSeats = Math.max(1, seats);
  const baseMonthly = seatTotal(BASE_PRICE_JPY, memberSeats);
  const earlyBirdOpen = isEarlyBird();

  const fmtDate = (d: Date) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  const baseNote = `月額 ¥${BASE_PRICE_JPY}/人 × ${memberSeats}名 = ${yen(baseMonthly)} (税込)`;
  const proNote = `月額 +¥${PRO_PRICE_JPY}/人 × ${memberSeats}名 = ${yen(seatTotal(PRO_PRICE_JPY, memberSeats))} (税込)`;
  const teamNote = `月額 +¥${TEAM_PRICE_JPY}/人 × ${memberSeats}名 = ${yen(seatTotal(TEAM_PRICE_JPY, memberSeats))} (税込)`;

  // 各プラン枠の下部に置く継続課金の同意付き登録ボタン
  const ConsentCheckout = ({
    action,
    note,
    label,
    accent,
  }: {
    action: (formData: FormData) => void | Promise<void>;
    note: string;
    label: string;
    accent: string; // ボタン背景クラス
  }) => (
    <form action={action} className="mt-auto pt-4">
      <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] leading-relaxed text-slate-600">
        <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 accent-akane-600" />
        <span>
          <Link href="/terms" target="_blank" className="font-medium text-akane-600 underline">利用規約</Link>
          ・
          <Link href="/privacy" target="_blank" className="font-medium text-akane-600 underline">個人情報保護方針</Link>
          に同意し、<strong>{note}</strong> の継続課金を承諾します
        </span>
      </label>
      <button
        type="submit"
        className={`mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90 ${accent}`}
      >
        {label}
      </button>
    </form>
  );

  const adminNote = (
    <p className="mt-auto pt-4 text-xs text-slate-400">
      登録には管理者権限が必要です。組織のオーナーにご依頼ください。
    </p>
  );

  const activeBlock = (text: string, extra?: React.ReactNode) => (
    <div className="mt-auto pt-4">
      <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-700">
        ✓ {text}
      </span>
      {extra}
    </div>
  );

  // ---- 基本プランのCTA ----
  const baseCta = base.subscribed ? (
    activeBlock(
      "ご契約中",
      admin && org.stripeCustomerId ? (
        <div className="mt-2 flex justify-center gap-3 text-xs">
          <form action={openBaseBillingPortal}>
            <button className="text-slate-500 hover:underline">支払い方法</button>
          </form>
          <Link href="/settings/cancel" className="text-slate-400 hover:underline">解約</Link>
        </div>
      ) : null
    )
  ) : admin ? (
    <ConsentCheckout action={startBaseCheckout} note={baseNote} label="基本プランに登録する" accent="bg-akane-600" />
  ) : (
    adminNote
  );

  // ---- ProプランのCTA ----
  const proPortal =
    admin && org.stripeCustomerId ? (
      <form action={openBillingPortal} className="mt-2 text-center">
        <button className="text-xs text-slate-500 hover:underline">支払い方法・解約</button>
      </form>
    ) : null;
  const proCta = isTeam ? (
    activeBlock("チームプランに含まれています")
  ) : pro.isPro ? (
    activeBlock("ご契約中", proPortal)
  ) : pro.inTrial ? (
    activeBlock(`トライアル中 (残り${pro.trialDaysLeft}日)`, proPortal)
  ) : !admin ? (
    adminNote
  ) : pro.trialAvailable ? (
    <ConsentCheckout
      action={startProTrialCheckout}
      note={`14日間無料。その後 ${proNote}`}
      label="Proを14日間無料で試す"
      accent="bg-gradient-to-r from-amber-400 to-amber-500"
    />
  ) : (
    <form action={startProCheckout} className="mt-auto pt-4">
      <button className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90">
        Proプランに登録する
      </button>
    </form>
  );

  // ---- チームプランのCTA ----
  const teamCta = isTeam ? (
    activeBlock("ご契約中", proPortal)
  ) : admin ? (
    <ConsentCheckout
      action={startTeamCheckout}
      note={`${teamNote}（Pro機能も利用可能）`}
      label="チーム機能にアップグレード"
      accent="bg-gradient-to-r from-sky-500 to-indigo-500"
    />
  ) : (
    adminNote
  );

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-akane-50 via-white to-slate-100 p-4 py-12">
      <div className="w-full max-w-5xl">
        <div className="mb-8 text-center">
          <div className="text-3xl font-bold tracking-tight text-akane-700">Saleshub</div>
          <p className="mt-2 text-sm text-slate-500">{org.name} のご利用プラン</p>
        </div>

        {/* ステータスバナー */}
        <div className="mx-auto mb-8 max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {sp.billing === "canceled" && (
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              解約しました。ご利用ありがとうございました。データは保存されています。再開はいつでも下記から可能です。
            </div>
          )}
          {base.subscribed ? (
            <h1 className="text-base font-bold text-slate-900">基本プラン: ご契約中（{baseNote}）</h1>
          ) : base.inFreePeriod ? (
            <>
              <h1 className="text-base font-bold text-slate-900">
                無料期間中です{base.earlyBird ? "（早期登録特典: 3ヶ月無料）" : "（初月無料）"}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {base.freeUntil
                  ? `${fmtDate(base.freeUntil)} まで無料でご利用いただけます（残り ${base.freeDaysLeft}日）。`
                  : "無料でご利用いただけます。"}
                無料期間の終了後は {baseNote} です。
              </p>
            </>
          ) : (
            <>
              <h1 className="text-base font-bold text-slate-900">無料期間が終了しました</h1>
              <p className="mt-1 text-sm text-slate-600">
                ご利用を続けるには、下の基本プランへの登録が必要です。データはそのまま保存されています。
              </p>
            </>
          )}

          {sp.billing === "consent" && (
            <p className="mt-3 text-xs text-rose-600">
              登録には、利用規約・個人情報保護方針および継続課金への同意（チェック）が必要です。
            </p>
          )}
          {sp.billing === "unconfigured" && (
            <p className="mt-3 text-xs text-rose-600">
              決済設定が未完了です（STRIPE_SECRET_KEY / STRIPE_PRICE_ID_BASE を設定してください）。
            </p>
          )}
          {sp.billing === "team_unconfigured" && (
            <p className="mt-3 text-xs text-rose-600">
              チームプランの決済設定が未完了です（STRIPE_PRICE_ID_TEAM を設定してください）。
            </p>
          )}
          {sp.billing === "forbidden" && (
            <p className="mt-3 text-xs text-rose-600">プラン登録には管理者権限が必要です。</p>
          )}

          <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-akane-600 hover:underline">
            ← ダッシュボードへ戻る
          </Link>
        </div>

        {/* 料金プラン一覧 (基本 → Pro → チーム機能) */}
        <div className="mb-6 text-center">
          <h2 className="text-lg font-bold text-slate-900">料金プラン</h2>
          <p className="mt-1 text-sm text-slate-500">
            料金はすべて<strong>1メンバーあたり</strong>の月額です。メンバーを追加すると人数に応じて加算されます。
          </p>
        </div>

        <div className="grid items-stretch gap-4 md:grid-cols-3">
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
            {baseCta}
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
              {["経営数値分析 (MRR/利益などの経営指標)", "テンプレート (提案書・見積書などの保管)"].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="text-amber-500">★</span>
                  {f}
                </li>
              ))}
            </ul>
            {proCta}
          </div>

          {/* チーム機能 */}
          <div className="flex flex-col rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm ring-1 ring-indigo-100">
            <span className="inline-flex w-fit items-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-2.5 py-0.5 text-xs font-bold text-white">
              チーム機能
            </span>
            <p className="mt-4 text-2xl font-bold text-slate-900">
              +¥{TEAM_PRICE_JPY.toLocaleString()}
              <span className="text-sm font-medium text-slate-500"> / 人・月</span>
            </p>
            <p className="text-xs text-slate-400">Pro プランのすべて + 以下</p>
            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              {[
                { t: "契約書管理（送付・締結・保管の追跡）", soon: false },
                { t: "請求書管理（発行・受領／入金・支払）", soon: false },
                { t: "委託費管理（委託先の稼働・費用計上）", soon: false },
                { t: "タスク管理（担当割り当て・進捗共有）", soon: true },
                { t: "アサイン管理（メンバーの稼働可視化）", soon: true },
                { t: "WBS（工程分解して進捗管理）", soon: true },
              ].map((f) => (
                <li key={f.t} className="flex items-start gap-2">
                  <span className="text-indigo-500">◆</span>
                  <span>
                    {f.t}
                    {f.soon && (
                      <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] font-medium text-slate-400">近日</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            {teamCta}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Pro・チーム機能 は基本プランに追加してご利用いただけます。チーム機能には Pro
          プランの全機能が含まれます。表示はすべて1メンバーあたりの月額です。
        </p>

        <div className="mx-auto mt-8 flex max-w-lg items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400">
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
  );
}
