export const metadata = { title: "個人情報保護方針 | Saleshub" };

const h2 = "mt-8 text-base font-bold text-slate-900";
const p = "mt-2 text-sm leading-relaxed text-slate-700";
const li = "ml-5 list-disc text-sm leading-relaxed text-slate-700";

export default function PrivacyPage() {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-bold text-slate-900">個人情報保護方針 (プライバシーポリシー)</h1>
      <p className={p}>
        AKANE WEB STUDIO (以下「当方」) は、当方が提供するクラウドサービス「Saleshub」(以下「本サービス」)
        における利用者の個人情報およびお預かりするデータの取扱いについて、以下のとおり定めます。
      </p>

      <h2 className={h2}>1. 取得する情報</h2>
      <ul className="mt-2 space-y-1">
        <li className={li}>アカウント情報: 氏名、メールアドレス、パスワード (暗号化して保管)、組織名</li>
        <li className={li}>
          利用者が本サービスに入力する業務データ: 顧客情報、案件・契約・売上情報、経費情報、アップロードされたファイル等
        </li>
        <li className={li}>決済情報: 課金プランの契約状況。クレジットカード番号は当方は保持せず、決済代行事業者 (Stripe, Inc.) が取り扱います</li>
        <li className={li}>利用ログ: アクセス日時、操作履歴、Cookie 等の技術情報</li>
      </ul>

      <h2 className={h2}>2. 利用目的</h2>
      <ul className="mt-2 space-y-1">
        <li className={li}>本サービスの提供、本人確認、認証のため</li>
        <li className={li}>料金の請求、課金・解約の管理のため</li>
        <li className={li}>お問い合わせ対応、重要なお知らせの通知のため</li>
        <li className={li}>不正利用の防止、セキュリティの確保のため</li>
        <li className={li}>個人を識別できない統計情報の形式での、サービス品質の改善・新機能の開発のため</li>
      </ul>

      <h2 className={h2}>3. 業務データの取扱い</h2>
      <p className={p}>
        利用者が本サービスに入力した業務データ (顧客情報等) の権利は利用者に帰属します。当方は、本サービスの提供・保守・障害対応に必要な範囲を超えて、これらのデータを閲覧・利用しません。
      </p>

      <h2 className={h2}>4. 第三者提供</h2>
      <p className={p}>
        当方は、法令に基づく場合または人の生命・身体・財産の保護に必要な場合を除き、本人の同意なく個人情報を第三者に提供しません。個人情報を販売することはありません。
      </p>

      <h2 className={h2}>5. 委託先 (外部サービス)</h2>
      <p className={p}>本サービスの提供にあたり、以下の事業者にデータの処理を委託しています。</p>
      <ul className="mt-2 space-y-1">
        <li className={li}>Supabase Inc. (データベース・認証基盤)</li>
        <li className={li}>Vercel Inc. (アプリケーションホスティング)</li>
        <li className={li}>Stripe, Inc. (決済処理)</li>
      </ul>

      <h2 className={h2}>6. 安全管理措置</h2>
      <p className={p}>
        通信の暗号化 (TLS)、パスワードのハッシュ化、組織単位のアクセス制御 (Row Level Security)
        等の合理的な安全管理措置を講じます。
      </p>

      <h2 className={h2}>7. 保存期間と削除</h2>
      <p className={p}>
        個人情報および業務データは、アカウントが有効な間保存します。解約・退会後は、法令上の保存義務がある情報を除き、合理的な期間内に削除します。
      </p>

      <h2 className={h2}>8. 開示・訂正・削除の請求</h2>
      <p className={p}>
        本人からの個人情報の開示・訂正・利用停止・削除のご請求には、本人確認のうえ法令に従い速やかに対応します。下記窓口までご連絡ください。
      </p>

      <h2 className={h2}>9. 改定</h2>
      <p className={p}>
        本方針は必要に応じて改定することがあります。重要な変更は本サービス上で告知します。
      </p>

      <h2 className={h2}>10. お問い合わせ窓口</h2>
      <p className={p}>
        AKANE WEB STUDIO
        <br />
        メール: nakaebisu.shotaro1543@gmail.com
      </p>

      <p className="mt-8 text-xs text-slate-400">制定日: 2026年7月4日</p>
    </article>
  );
}
