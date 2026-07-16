"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS } from "@/lib/constants";
import { addActivity, deleteActivity } from "@/app/actions/activities";
import { Badge, btnSecondary, inputCls, selectCls } from "./ui";
import { ExpandableText } from "./expandable-text";
import { ShowMoreList } from "./show-more-list";

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

// 案件フィルターの選択肢。"all" は全件表示 (従来動作)、"none" は案件に紐付かないメモ。
const ALL = "all";
const NONE = "none";

export function ActivityPanel({
  customerId,
  dealId,
  path,
  activities,
  currentDealId,
  customerDeals,
}: {
  customerId: string;
  dealId?: string | null; // 記録時に紐付ける案件 (案件・契約ページから記録する場合)
  path: string; // revalidate 対象の現在ページ
  activities: ActivityItem[];
  currentDealId?: string | null; // このページ自身の案件 (案件バッジの表示判定用)
  customerDeals?: { id: string; title: string }[]; // 顧客の全案件 (絞り込みの選択肢用)
}) {
  const [filter, setFilter] = useState(ALL);

  // 絞り込みの選択肢: 顧客の全案件があればそれを使い、無ければ履歴に登場する案件から補完する。
  // (メモがまだ無い案件も選べるように、顧客の全案件を優先する)
  const deals = useMemo(() => {
    const seen = new Map<string, string>();
    for (const d of customerDeals ?? []) {
      if (!seen.has(d.id)) seen.set(d.id, d.title);
    }
    for (const a of activities) {
      if (a.deal && !seen.has(a.deal.id)) seen.set(a.deal.id, a.deal.title);
    }
    return [...seen].map(([id, title]) => ({ id, title }));
  }, [customerDeals, activities]);

  const hasUnlinked = useMemo(() => activities.some((a) => !a.deal), [activities]);

  const filtered = useMemo(() => {
    if (filter === ALL) return activities;
    if (filter === NONE) return activities.filter((a) => !a.deal);
    return activities.filter((a) => a.deal?.id === filter);
  }, [activities, filter]);

  // 分けて見る意味がある場合のみ表示 (案件+「案件なし」で2グループ以上あるとき)。
  const showFilter = deals.length + (hasUnlinked ? 1 : 0) > 1;

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

      {showFilter && (
        <div className="mb-4 flex items-center gap-2">
          <label className="shrink-0 whitespace-nowrap text-xs font-medium text-slate-400">
            案件で絞り込み
          </label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={`${selectCls} flex-1`}
          >
            <option value={ALL}>すべての案件</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
            {hasUnlinked && <option value={NONE}>案件なし</option>}
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400">
          {activities.length === 0
            ? "まだ活動記録がありません"
            : "この案件の活動記録はありません"}
        </p>
      ) : (
        // フィルター変更時に ShowMoreList の展開状態をリセットする。
        <ShowMoreList key={filter} initialCount={5}>
          {filtered.map((a) => (
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
              <ExpandableText text={a.content} />
            </li>
          ))}
        </ShowMoreList>
      )}
    </div>
  );
}
