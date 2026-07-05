import { requireSession, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { baseStatus, BASE_PRICE_JPY, seatTotal } from "@/lib/pricing";
import { Card } from "@/components/ui";
import { CancelDialog } from "./cancel-dialog";

export const metadata = { title: "解約 | 設定" };

// 解約タブ本体は要約と「解約する」ボタンだけを表示し、ボタンを押すと
// アンケート (改善につながる設問) がポップアップ (モーダル) で開く。
// 送信すると Stripe サブスクリプションが即時キャンセルされ、以降の請求は発生しない。

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

export default async function CancelPage() {
  const session = await requireSession();
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

      {!admin ? (
        <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-500">
          解約手続きには管理者 (オーナー / 管理者) 権限が必要です。組織のオーナーにご依頼ください。
        </p>
      ) : (
        <CancelDialog reasons={REASONS} improvements={IMPROVEMENTS} />
      )}
    </Card>
  );
}

function yen(n: number): string {
  return `¥${n.toLocaleString()}`;
}
