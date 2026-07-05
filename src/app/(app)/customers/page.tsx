import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { COUNTRIES, COUNTRY_LABELS } from "@/lib/constants";
import { PageHeader, Badge, EmptyState, PrimaryLink, selectCls, inputCls, btnSecondary } from "@/components/ui";
import { CreatedToast } from "./created-toast";
import type { Prisma } from "@prisma/client";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; country?: string; created?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const country = sp.country ?? "";

  const where: Prisma.CustomerWhereInput = {
    orgId: session.org.id,
    ...(country ? { country } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { instagram: { contains: q } },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    db.customer.findMany({ where, orderBy: { updatedAt: "desc" } }),
    db.customer.count({ where: { orgId: session.org.id } }),
  ]);

  const hasFilter = Boolean(q || country);
  const createdCustomer = sp.created ? customers.find((c) => c.id === sp.created) : undefined;

  return (
    <div>
      {createdCustomer && (
        <CreatedToast customerId={createdCustomer.id} customerName={createdCustomer.name} />
      )}
      <PageHeader
        title="顧客管理"
        description="顧客の一覧・検索・登録を行います"
        actions={<PrimaryLink href="/customers/new">＋ 新規顧客</PrimaryLink>}
      />

      {/* サマリー */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-slate-500">合計</p>
          <p className="text-lg font-bold text-slate-900">{total}</p>
        </div>
      </div>

      {/* フィルタ */}
      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">検索</label>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="名前・メール・Instagram"
            className={inputCls + " w-56"}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">国</label>
          <select name="country" defaultValue={country} className={selectCls}>
            <option value="">すべて</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {COUNTRY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={btnSecondary}>
          絞り込み
        </button>
        {hasFilter && (
          <Link href="/customers" className="text-sm text-slate-500 hover:text-akane-600">
            クリア
          </Link>
        )}
      </form>

      {customers.length === 0 ? (
        <EmptyState
          title="顧客がいません"
          description={hasFilter ? "条件に一致する顧客が見つかりませんでした" : "「新規顧客」から登録してください"}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">顧客名</th>
                <th className="px-4 py-3 font-medium">国</th>
                <th className="px-4 py-3 font-medium">業種</th>
                <th className="px-4 py-3 font-medium">タグ</th>
                <th className="px-4 py-3 font-medium">Instagram</th>
                <th className="px-4 py-3 font-medium">登録日</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const tags = c.tags.split(",").map((t) => t.trim()).filter(Boolean);
                return (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/customers/${c.id}`}
                        className="font-medium text-akane-700 hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {COUNTRY_LABELS[c.country] ?? c.country}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.industry ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {tags.length === 0
                          ? <span className="text-slate-400">—</span>
                          : tags.map((t) => (
                              <Badge key={t} className="bg-slate-100 text-slate-600">
                                {t}
                              </Badge>
                            ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.instagram ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {c.createdAt.toLocaleDateString("ja-JP")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
