import { btnPrimary } from "@/components/ui";
import { TRIAL_DAYS, PRO_PRICE_JPY } from "@/lib/plan";
import { startProTrialCheckout, startProCheckout } from "@/app/actions/billing";

// Pro プランで実際に利用できる機能 (ダッシュボードで実装・表示されているものだけを列挙する)。
// ※ MRR成長率・解約率・LTV・CAC・ARPU 等は現状の入力からは正確に算出できず非表示のため載せない。
export const PRO_FEATURES = [
  "サービス別売上・損益 (P/L)・案件パイプラインのグラフ",
  "契約の増減 (新規・解約・稼働) の推移グラフ",
  "外注費の推移・月次上限アラート・急増検知",
  "テンプレート保管庫 (提案書・見積書・契約書などのファイル/URLを保管)",
];

// 経営数値分析ページとテンプレートページの両方で使う Pro 訴求カードの中身。
// 1つの Pro 登録で「経営数値分析」と「テンプレート」の両機能が解放されることを明示する。
export function ProUpsell({
  admin,
  trialAvailable,
  headline,
}: {
  admin: boolean;
  trialAvailable: boolean;
  headline: string;
}) {
  return (
    <div>
      <div className="text-center">
        <p className="text-3xl">📈</p>
        <h3 className="mt-3 text-lg font-bold text-slate-900">{headline}</h3>
        <p className="mt-2 text-sm text-slate-500">
          Pro プラン (月額 ¥{PRO_PRICE_JPY} 税込・基本プランとは別途) の全機能をお試しいただけます。
        </p>
      </div>

      {/* 両機能が1つの登録で解放されることを明示 */}
      <p className="mx-auto mt-4 max-w-md rounded-lg border border-akane-200 bg-akane-50 px-3 py-2 text-center text-xs font-medium text-akane-800">
        Pro プランに登録すると、<strong>経営数値分析</strong>と<strong>テンプレート</strong>の両方がご利用いただけます。
      </p>

      <ul className="mx-auto mt-5 max-w-sm space-y-2 text-sm text-slate-700">
        {PRO_FEATURES.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="text-emerald-600">✓</span>
            {f}
          </li>
        ))}
      </ul>

      {trialAvailable ? (
        <>
          <div className="mx-auto mt-6 max-w-md rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
            <p className="text-sm font-bold text-amber-900">トライアル開始前にご確認ください</p>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-amber-800">
              <li>
                ・トライアルの開始には<strong>クレジットカード情報の登録</strong>が必要です (Stripe
                の安全な決済ページで入力します)
              </li>
              <li>
                ・{TRIAL_DAYS}日間の無料期間が終了すると、
                <strong>自動的に月額 ¥{PRO_PRICE_JPY} (税込) の継続課金が始まります</strong>
              </li>
              <li>
                ・トライアル中はいつでも解約できます。
                <strong>期間内に解約すれば料金は一切かかりません</strong>
              </li>
              <li>・無料トライアルは1組織につき1回のみです</li>
            </ul>
          </div>

          {admin ? (
            <form action={startProTrialCheckout} className="mx-auto mt-5 max-w-md text-center">
              <label className="flex items-start justify-center gap-2 text-left text-xs text-slate-600">
                <input type="checkbox" name="consent" required className="mt-0.5" />
                <span>
                  上記の内容 (カード情報の登録・トライアル終了後の自動課金・解約方法) を確認し、同意します
                </span>
              </label>
              <button type="submit" className={`${btnPrimary} mt-4`}>
                同意してカードを登録し、14日間無料トライアルを開始
              </button>
              <p className="mt-2 text-[11px] text-slate-400">
                Stripe の決済ページに移動します。トライアル期間中は請求されません。
              </p>
            </form>
          ) : (
            <p className="mt-6 text-center text-xs text-slate-400">
              トライアルの開始には管理者権限が必要です。組織のオーナーにご依頼ください。
            </p>
          )}
        </>
      ) : admin ? (
        <form action={startProCheckout} className="mt-6 text-center">
          <button type="submit" className={btnPrimary}>
            Pro プランに登録する (月額 ¥{PRO_PRICE_JPY})
          </button>
        </form>
      ) : (
        <p className="mt-6 text-center text-xs text-slate-400">
          登録には管理者権限が必要です。組織のオーナーにご依頼ください。
        </p>
      )}
    </div>
  );
}
