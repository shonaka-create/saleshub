import { requireSession, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { baseStatus, BASE_PRICE_JPY, seatTotal } from "@/lib/pricing";
import { planStatus, PRO_PRICE_JPY } from "@/lib/plan";
import { Card } from "@/components/ui";
import { CancelDialog, type CancelTarget } from "./cancel-dialog";

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
      select: {
        basePlanStatus: true,
        freeUntil: true,
        earlyBird: true,
        plan: true,
        trialEndsAt: true,
        teamPlan: true,
      },
    }),
    db.membership.count({ where: { orgId: session.org.id } }),
  ]);
  const status = baseStatus(org);
  const pro = planStatus(org);
  const seatCount = Math.max(1, seats);
  const baseMonthly = seatTotal(BASE_PRICE_JPY, seatCount);
  const proMonthly = seatTotal(PRO_PRICE_JPY, seatCount);

  // 解約できる自社プランを組み立てる。破壊度の低い Pro を先に、サービス全体停止の基本プランを後に置く。
  const targets: CancelTarget[] = [];
  if (pro.isPro || pro.inTrial) {
    targets.push({
      value: "PRO",
      title: "Pro プランのみ解約",
      description: pro.inTrial
        ? "経営数値分析・テンプレートの無料トライアルを終了します。基本プランはそのまま継続します。"
        : `経営数値分析・テンプレート (現在 ${yen(proMonthly)}/月) を解約します。基本プランはそのまま継続します。`,
    });
  }
  targets.push({
    value: "BASE",
    title: "基本プラン（サービス全体）を解約",
    description: status.subscribed
      ? `ご契約中のサブスクリプション (現在 ${yen(baseMonthly)}/月) を即時キャンセルし、Saleshub 全体のご利用を停止します。`
      : status.inFreePeriod
        ? "現在は無料期間中のため請求はありませんが、解約すると Saleshub 全体のご利用が停止されます。"
        : "Saleshub 全体のご利用を停止します。",
  });

  return (
    <Card className="max-w-2xl p-6">
      <h2 className="mb-1 text-base font-semibold text-slate-900">解約</h2>
      <p className="mb-4 text-sm text-slate-500">
        解約する対象を選べます。入力いただいた内容は、今後のサービス改善のためだけに利用します。
      </p>

      {!admin ? (
        <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-500">
          解約手続きには管理者 (オーナー / 管理者) 権限が必要です。組織のオーナーにご依頼ください。
        </p>
      ) : (
        <CancelDialog reasons={REASONS} improvements={IMPROVEMENTS} targets={targets} />
      )}
    </Card>
  );
}

function yen(n: number): string {
  return `¥${n.toLocaleString()}`;
}
