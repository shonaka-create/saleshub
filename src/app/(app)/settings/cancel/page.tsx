import { requireSession, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { baseStatus, BASE_PRICE_JPY, seatTotal } from "@/lib/pricing";
import { Card } from "@/components/ui";
import { cancelBasePlan } from "@/app/actions/base-billing";

export const metadata = { title: "解約 | 設定" };

// 解約の理由アンケート (システム改善につながる設問) → 解約実行。
// 解約すると Stripe サブスクリプションが即時キャンセルされ、以降の請求は発生しない。

const REASONS = [
  "料金が高い・費用対効果が合わない",
  "使い方が難しく、定着しなかった",
  "必要な機能が足りなかった",
  "他のツールに乗り換える",
  "事業・利用を一時的に停止する",
  "その他",
];

const IMPROVEMENTS = [
  "料金体系の見直し (もっと安く / 人数課金以外)",
  "操作をもっとシンプルに",
  "機能を追加してほしい",
  "他サービスとの連携 (会計・カレンダー等)",
  "サポート・使い方ガイドの充実",
  "動作を速く・安定させてほしい",
];

export default async function CancelPage({
  searchParams,
}: {
  searchParams: Promise<{ cancel?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const admin = isAdmin(session.role);

  const [org, seats] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: session.org.id },
      select: { basePlanStatus: true, freeUntil: true, earlyBird: true },
    }),
    db.membership.count({ where: { orgId: session.org.id } }),
  ]);
  const status = baseStatus(org);
  const monthly = seatTotal(BASE_PRICE_JPY, Math.max(1, seats));

  return (
    <Card className="max-w-2xl p-6">
      <h2 className="mb-1 text-base font-semibold text-slate-900">解約 (基本プラン)</h2>
      <p className="mb-4 text-sm text-slate-500">
        解約すると、次回以降の課金 (現在 {yen(monthly)}/月) は発生しなくなります。
        {status.subscribed
          ? "現在ご契約中のサブスクリプションを即時にキャンセルします。"
          : status.inFreePeriod
            ? "現在は無料期間中のため請求は発生していませんが、解約するとシステムのご利用が停止されます。"
            : "現在は課金が停止しています。"}
        入力いただいた内容は、今後のサービス改善のためだけに利用します。
      </p>

      {sp.cancel === "confirm" && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          解約するには、最下部の確認チェックが必要です。
        </p>
      )}
      {sp.cancel === "forbidden" && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          解約には管理者権限が必要です。組織のオーナーにご依頼ください。
        </p>
      )}

      {!admin ? (
        <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-500">
          解約手続きには管理者 (オーナー / 管理者) 権限が必要です。組織のオーナーにご依頼ください。
        </p>
      ) : (
        <form action={cancelBasePlan} className="space-y-6">
          {/* 解約理由 (単一選択) */}
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">
              解約の主な理由を教えてください
            </legend>
            <div className="mt-2 space-y-1.5">
              {REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" name="reason" value={r} required className="accent-akane-600" />
                  {r}
                </label>
              ))}
            </div>
          </fieldset>

          {/* 改善してほしい点 (複数選択) */}
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">
              どこが改善されれば、また使ってみたいですか？ (複数選択可)
            </legend>
            <div className="mt-2 space-y-1.5">
              {IMPROVEMENTS.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="improvement" value={r} className="accent-akane-600" />
                  {r}
                </label>
              ))}
            </div>
          </fieldset>

          {/* 自由記述 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              具体的にどんな点を改善すべきか、ぜひ教えてください (任意)
            </label>
            <textarea
              name="detail"
              rows={4}
              placeholder="例: 〇〇の入力が手間だった / 〇〇と連携したい / 料金は月◯円なら続けたい など"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-akane-500 focus:outline-none focus:ring-2 focus:ring-akane-100"
            />
          </div>

          {/* 確認 */}
          <label className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-800">
            <input type="checkbox" name="confirm" className="mt-0.5 h-4 w-4 accent-rose-600" />
            <span>
              解約すると以降の課金は停止し、無料期間の残りに関わらずシステムのご利用ができなくなることを理解しました
              (データは保存され、再登録で復帰できます)。
            </span>
          </label>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3.5 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
          >
            アンケートを送信して解約する
          </button>
        </form>
      )}
    </Card>
  );
}

function yen(n: number): string {
  return `¥${n.toLocaleString()}`;
}
