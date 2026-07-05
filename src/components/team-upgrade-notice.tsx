import Link from "next/link";
import { Card, Badge } from "@/components/ui";
import { TEAM_PRICE_JPY } from "@/lib/plan";

// チーム機能 (契約書/請求書/委託費管理) 未加入の組織に表示するアップグレード案内。
export function TeamUpgradeNotice({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="mx-auto max-w-xl p-8 text-center">
      <p className="text-4xl">🔒</p>
      <Badge className="mt-3 bg-gradient-to-r from-sky-500 to-indigo-500 text-white">
        チーム機能 (¥{TEAM_PRICE_JPY.toLocaleString()}/人・月)
      </Badge>
      <h2 className="mt-3 text-lg font-bold text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{description}</p>
      <ul className="mx-auto mt-5 max-w-sm space-y-2 text-left text-sm text-slate-700">
        {[
          "契約書管理（送付・締結・保管の追跡）",
          "請求書管理（発行・受領／入金・支払）",
          "委託費管理（委託先の稼働・費用計上）",
          "経営数値分析など Pro プランの全機能",
        ].map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="text-emerald-600">✓</span>
            {f}
          </li>
        ))}
      </ul>
      <Link
        href="/billing"
        className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
      >
        チーム機能にアップグレード →
      </Link>
    </Card>
  );
}
