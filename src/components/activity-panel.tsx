import Link from "next/link";
import { ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS } from "@/lib/constants";
import { addActivity, deleteActivity } from "@/app/actions/activities";
import { Badge, btnSecondary, inputCls, selectCls } from "./ui";

// 顧客・案件・契約の各ページで共通の活動履歴パネル。
// 履歴は顧客単位で共有され、どのページで記録しても他のページから同じ内容が見える。
export type ActivityItem = {
  id: string;
  type: string;
  content: string;
  occurredAt: Date;
  dealId: string | null;
  user: { name: string } | null;
  deal: { id: string; title: string } | null;
};

export function ActivityPanel({
  customerId,
  dealId,
  path,
  activities,
  currentDealId,
}: {
  customerId: string;
  dealId?: string | null; // 記録時に紐付ける案件 (案件・契約ページから記録する場合)
  path: string; // revalidate 対象の現在ページ
  activities: ActivityItem[];
  currentDealId?: string | null; // このページ自身の案件 (案件バッジの表示判定用)
}) {
  return (
    <div>
      <form action={addActivity} className="mb-5 space-y-3 rounded-lg bg-slate-50 p-4">
        <input type="hidden" name="customerId" value={customerId} />
        {dealId && <input type="hidden" name="dealId" value={dealId} />}
        <input type="hidden" name="path" value={path} />
        <select name="type" defaultValue="NOTE" className={`${selectCls} w-full`}>
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACTIVITY_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <textarea
          name="content"
          rows={2}
          required
          placeholder="活動内容を記録..."
          className={inputCls}
        />
        <button type="submit" className={btnSecondary}>
          記録する
        </button>
      </form>

      {activities.length === 0 ? (
        <p className="text-sm text-slate-400">まだ活動記録がありません</p>
      ) : (
        <ul className="space-y-4">
          {activities.map((a) => (
            <li key={a.id} className="border-l-2 border-akane-100 pl-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-akane-50 text-akane-700">
                  {ACTIVITY_TYPE_LABELS[a.type] ?? a.type}
                </Badge>
                {a.deal && a.deal.id !== currentDealId && (
                  <Link href={`/deals/${a.deal.id}`}>
                    <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                      案件: {a.deal.title}
                    </Badge>
                  </Link>
                )}
                <span className="text-xs text-slate-400">
                  {new Date(a.occurredAt).toLocaleDateString("ja-JP")}
                </span>
                {a.user && <span className="text-xs text-slate-400">{a.user.name}</span>}
                <form action={deleteActivity} className="ml-auto">
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="customerId" value={customerId} />
                  {a.dealId && <input type="hidden" name="dealId" value={a.dealId} />}
                  <input type="hidden" name="path" value={path} />
                  <button type="submit" className="text-xs text-slate-400 hover:text-rose-600">
                    削除
                  </button>
                </form>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{a.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
