import { BASE_PRICE_JPY } from "@/lib/pricing";

export const metadata = { title: "利用規約 | Saleshub" };

const h2 = "mt-8 text-base font-bold text-slate-900";
const p = "mt-2 text-sm leading-relaxed text-slate-700";
const li = "ml-5 list-disc text-sm leading-relaxed text-slate-700";

export default function TermsPage() {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-bold text-slate-900">Saleshub 利用規約</h1>
      <p className={p}>
        本規約は、AKANE WEB STUDIO (以下「当方」) が提供するクラウドサービス「Saleshub」(以下「本サービス」)
        の利用条件を定めるものです。利用登録をもって、本規約に同意いただいたものとみなします。
      </p>

      <h2 className={h2}>第1条 (本サービスの内容)</h2>
      <p className={p}>
        本サービスは、顧客管理 (CRM)・案件管理・契約管理・売上管理・経営分析等の機能を提供する業務支援システムです。機能は予告なく追加・変更されることがあります。
      </p>

      <h2 className={h2}>第2条 (アカウント)</h2>
      <ul className="mt-2 space-y-1">
        <li className={li}>登録情報は正確かつ最新の内容で登録してください。</li>
        <li className={li}>アカウント・パスワードの管理責任は利用者が負います。</li>
        <li className={li}>1つの組織 (テナント) のデータは、その組織のメンバーのみがアクセスできます。</li>
      </ul>

      <h2 className={h2}>第3条 (利用料金)</h2>
      <ul className="mt-2 space-y-1">
        <li className={li}>基本プラン: 月額 {BASE_PRICE_JPY}円 (税込) / 組織。初月 (登録から1ヶ月間) は無料です。</li>
        <li className={li}>
          早期登録特典: 2026年7月15日までに登録した組織は、登録から3ヶ月間無料でご利用いただけます。
        </li>
        <li className={li}>Pro プラン (経営分析機能): 基本プランとは別途、月額490円 (税込) / 組織。14日間の無料トライアルがあります。</li>
        <li className={li}>料金は決済代行事業者 (Stripe) を通じてお支払いいただきます。</li>
        <li className={li}>料金を改定する場合は、適用開始の1ヶ月前までに本サービス上で通知します。</li>
      </ul>

      <h2 className={h2}>第4条 (解約)</h2>
      <ul className="mt-2 space-y-1">
        <li className={li}>解約はいつでも可能です。解約後も、支払済みの期間の末日まではご利用いただけます。</li>
        <li className={li}>日割りによる返金は行いません。</li>
        <li className={li}>無料期間の終了後にお支払いがない場合、当方はサービスの提供を停止できます。</li>
      </ul>

      <h2 className={h2}>第5条 (データの取扱い)</h2>
      <ul className="mt-2 space-y-1">
        <li className={li}>利用者が入力した業務データの権利は利用者に帰属します。</li>
        <li className={li}>
          データの取得・利用・保護については「個人情報保護方針」に従います。当方が個人を特定できる形で業務データを第三者に提供することはありません。
        </li>
        <li className={li}>解約後のデータは、法令上の保存義務があるものを除き、合理的な期間内に削除します。</li>
      </ul>

      <h2 className={h2}>第6条 (禁止事項)</h2>
      <ul className="mt-2 space-y-1">
        <li className={li}>法令または公序良俗に違反する行為</li>
        <li className={li}>第三者になりすます行為、他者の個人情報を不正に登録する行為</li>
        <li className={li}>本サービスの運営を妨害する行為 (不正アクセス、過度な負荷をかける行為等)</li>
        <li className={li}>リバースエンジニアリング等の解析行為</li>
      </ul>

      <h2 className={h2}>第7条 (サービスの停止・変更)</h2>
      <p className={p}>
        当方は、保守・障害対応・その他やむを得ない事由により、事前の通知なく本サービスの全部または一部を停止・変更できるものとします。
      </p>

      <h2 className={h2}>第8条 (免責)</h2>
      <ul className="mt-2 space-y-1">
        <li className={li}>本サービスは現状有姿で提供され、当方は完全性・正確性・特定目的への適合性を保証しません。</li>
        <li className={li}>
          当方の責めに帰すべき事由により利用者に損害が生じた場合、当方の賠償責任は、当該利用者が直近12ヶ月間に当方へ支払った利用料金の総額を上限とします。ただし、当方の故意または重過失による場合はこの限りではありません。
        </li>
        <li className={li}>利用者は、自己のデータについて適宜バックアップ (CSV出力等) を行うものとします。</li>
      </ul>

      <h2 className={h2}>第9条 (規約の変更)</h2>
      <p className={p}>
        当方は本規約を変更できるものとし、重要な変更は本サービス上で事前に告知します。変更後に本サービスを利用した場合、変更に同意したものとみなします。
      </p>

      <h2 className={h2}>第10条 (準拠法・管轄)</h2>
      <p className={p}>
        本規約は日本法に準拠します。本サービスに関して紛争が生じた場合、当方の所在地を管轄する地方裁判所を第一審の専属的合意管轄裁判所とします。
      </p>

      <p className="mt-8 text-xs text-slate-400">制定日: 2026年7月4日</p>
    </article>
  );
}
