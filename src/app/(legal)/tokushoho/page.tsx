import { BASE_PRICE_JPY } from "@/lib/pricing";
import { PRO_PRICE_JPY, MAX_PRO_PRICE_JPY } from "@/lib/plan";

export const metadata = { title: "特定商取引法に基づく表記 | Saleshub" };

// 特定商取引法に基づく表記。Stripe のアカウント審査でも本ページの URL を提出する。
// 個人事業主のため、所在地・電話番号は消費者庁ガイドラインに基づく請求開示方式。
const rows: { label: string; body: React.ReactNode }[] = [
  { label: "販売事業者", body: "yournist (個人事業主)" },
  { label: "運営統括責任者", body: "中胡 翔太郎" },
  {
    label: "所在地",
    body: "個人事業主のため省略しています。ご請求をいただければ遅滞なく開示いたします (下記メールアドレスまでご連絡ください)。",
  },
  {
    label: "電話番号",
    body: "個人事業主のため省略しています。ご請求をいただければ遅滞なく開示いたします。お問い合わせはメールにて承ります。",
  },
  { label: "メールアドレス", body: "nakaebisu.shotaro1543@gmail.com" },
  {
    label: "販売価格",
    body: (
      <ul className="space-y-1">
        <li>基本プラン: 月額 {BASE_PRICE_JPY}円 (税込) / 人</li>
        <li>Pro プラン: 基本プランとは別途 月額 {PRO_PRICE_JPY}円 (税込) / 人</li>
        <li>MAX プラン: 月額 {MAX_PRO_PRICE_JPY.toLocaleString()}円 (税込) ※近日提供予定</li>
        <li className="text-slate-500">
          ※ 初月無料、早期登録特典 (3ヶ月無料)、Pro プランの14日間無料トライアルなど、無料期間の詳細はサービス内の料金案内に表示されます。
        </li>
      </ul>
    ),
  },
  {
    label: "商品代金以外の必要料金",
    body: "インターネット接続料金・通信料金等は利用者のご負担となります。",
  },
  { label: "お支払い方法", body: "クレジットカード決済 (決済代行: Stripe)" },
  {
    label: "お支払い時期",
    body: "無料期間または無料トライアルの終了後に初回のお支払いが発生し、以降は1ヶ月ごとの自動更新・自動決済となります。",
  },
  {
    label: "サービスの提供時期",
    body: "利用登録の完了後、直ちにご利用いただけます。",
  },
  {
    label: "解約について",
    body: "いつでも解約できます (サービス内の設定画面または Stripe カスタマーポータルから)。解約後も、お支払い済み期間の末日まではご利用いただけます。無料トライアル期間中に解約した場合、料金は発生しません。",
  },
  {
    label: "返品・返金",
    body: "サービスの性質上、日割りによる返金・返品には対応しておりません (法令に定めがある場合を除く)。",
  },
  {
    label: "動作環境",
    body: "最新版の主要ブラウザ (Google Chrome / Microsoft Edge / Safari / Firefox)",
  },
];

export default function TokushohoPage() {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-bold text-slate-900">特定商取引法に基づく表記</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">
        クラウドサービス「Saleshub」に関する特定商取引法 (特定商取引に関する法律) 第11条に基づく表記です。
      </p>

      <dl className="mt-6 divide-y divide-slate-100 border-t border-b border-slate-100">
        {rows.map((r) => (
          <div key={r.label} className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
            <dt className="text-sm font-semibold text-slate-900">{r.label}</dt>
            <dd className="text-sm leading-relaxed text-slate-700">{r.body}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
