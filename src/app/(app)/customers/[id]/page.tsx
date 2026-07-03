import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  COUNTRY_LABELS,
  CUSTOMER_STATUS_COLORS,
  CUSTOMER_STATUS_LABELS,
  DEAL_STAGE_LABELS,
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
} from "@/lib/constants";
import { formatMoney } from "@/lib/currency";
import {
  PageHeader,
  Card,
  Badge,
  EmptyState,
  btnSecondary,
  inputCls,
  selectCls,
  labelCls,
} from "@/components/ui";
import { addActivity, deleteActivity, addContact, deleteContact } from "@/app/actions/customers";
import { DeleteCustomerButton } from "../delete-customer-button";

function instagramHref(v: string): string {
  if (/^https?:\/\//i.test(v)) return v;
  return `https://instagram.com/${v.replace(/^@/, "")}`;
}
function websiteHref(v: string): string {
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const customer = await db.customer.findFirst({
    where: { id, orgId: session.org.id },
    include: {
      contacts: true,
      deals: { orderBy: { updatedAt: "desc" } },
      contracts: { orderBy: { startDate: "desc" } },
      activities: {
        orderBy: { occurredAt: "desc" },
        include: { user: true },
      },
    },
  });
  if (!customer) notFound();

  const defs = await db.customFieldDef.findMany({
    where: { orgId: session.org.id, entity: "customer" },
    orderBy: { sortOrder: "asc" },
  });
  const customData = parseCustomData(customer.customData);
  const tags = customer.tags.split(",").map((t) => t.trim()).filter(Boolean);

  const info: { label: string; value: React.ReactNode }[] = [
    { label: "国", value: COUNTRY_LABELS[customer.country] ?? customer.country },
    { label: "業種", value: customer.industry ?? "—" },
    {
      label: "メール",
      value: customer.email ? (
        <a href={`mailto:${customer.email}`} className="text-akane-700 hover:underline">
          {customer.email}
        </a>
      ) : (
        "—"
      ),
    },
    { label: "電話", value: customer.phone ?? "—" },
    {
      label: "Instagram",
      value: customer.instagram ? (
        <a
          href={instagramHref(customer.instagram)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-akane-700 hover:underline"
        >
          {customer.instagram}
        </a>
      ) : (
        "—"
      ),
    },
    {
      label: "Webサイト",
      value: customer.website ? (
        <a
          href={websiteHref(customer.website)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-akane-700 hover:underline"
        >
          {customer.website}
        </a>
      ) : (
        "—"
      ),
    },
    { label: "住所", value: customer.address ?? "—" },
    { label: "登録日", value: customer.createdAt.toLocaleDateString("ja-JP") },
  ];

  return (
    <div>
      <PageHeader
        title={customer.name}
        description={CUSTOMER_STATUS_LABELS[customer.status] ?? customer.status}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/customers/${customer.id}/edit`} className={btnSecondary}>
              編集
            </Link>
            <DeleteCustomerButton id={customer.id} />
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge className={CUSTOMER_STATUS_COLORS[customer.status] ?? "bg-slate-100 text-slate-700"}>
          {CUSTOMER_STATUS_LABELS[customer.status] ?? customer.status}
        </Badge>
        {tags.map((t) => (
          <Badge key={t} className="bg-slate-100 text-slate-600">
            {t}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* メインカラム */}
        <div className="space-y-6 lg:col-span-2">
          {/* 基本情報 */}
          <Card className="p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">基本情報</h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {info.map((row) => (
                <div key={row.label}>
                  <dt className="text-xs text-slate-500">{row.label}</dt>
                  <dd className="text-sm text-slate-800">{row.value}</dd>
                </div>
              ))}
            </dl>
            {customer.memo && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <dt className="text-xs text-slate-500">メモ</dt>
                <dd className="whitespace-pre-wrap text-sm text-slate-800">{customer.memo}</dd>
              </div>
            )}
            {defs.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <h3 className="mb-3 text-xs font-semibold text-slate-500">カスタム項目</h3>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                  {defs.map((d) => {
                    const v = customData[d.key];
                    return (
                      <div key={d.id}>
                        <dt className="text-xs text-slate-500">{d.label}</dt>
                        <dd className="text-sm text-slate-800">
                          {v == null || String(v) === "" ? "—" : String(v)}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            )}
          </Card>

          {/* 活動履歴 */}
          <Card className="p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">活動履歴</h2>
            <form action={addActivity} className="mb-5 space-y-3 rounded-lg bg-slate-50 p-4">
              <input type="hidden" name="customerId" value={customer.id} />
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className={labelCls} htmlFor="activity-type">
                    種別
                  </label>
                  <select id="activity-type" name="type" defaultValue="NOTE" className={selectCls}>
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {ACTIVITY_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <textarea
                name="content"
                required
                rows={3}
                placeholder="活動内容を記録..."
                className={inputCls}
              />
              <button type="submit" className={btnSecondary}>
                記録する
              </button>
            </form>

            {customer.activities.length === 0 ? (
              <p className="text-sm text-slate-400">活動履歴はまだありません</p>
            ) : (
              <ul className="space-y-4">
                {customer.activities.map((a) => (
                  <li key={a.id} className="flex gap-3 border-l-2 border-slate-200 pl-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-akane-50 text-akane-700">
                          {ACTIVITY_TYPE_LABELS[a.type] ?? a.type}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {a.occurredAt.toLocaleDateString("ja-JP")}
                        </span>
                        {a.user && (
                          <span className="text-xs text-slate-400">{a.user.name}</span>
                        )}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{a.content}</p>
                    </div>
                    <form action={deleteActivity}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="customerId" value={customer.id} />
                      <button
                        type="submit"
                        className="text-xs text-slate-400 hover:text-rose-600"
                      >
                        削除
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* サイドカラム */}
        <div className="space-y-6">
          {/* 担当者 */}
          <Card className="p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">担当者</h2>
            {customer.contacts.length === 0 ? (
              <p className="mb-4 text-sm text-slate-400">担当者は登録されていません</p>
            ) : (
              <ul className="mb-4 space-y-3">
                {customer.contacts.map((ct) => (
                  <li
                    key={ct.id}
                    className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 last:border-0"
                  >
                    <div className="text-sm">
                      <p className="font-medium text-slate-800">
                        {ct.name}
                        {ct.role && <span className="ml-2 text-xs text-slate-500">{ct.role}</span>}
                      </p>
                      {ct.email && <p className="text-xs text-slate-500">{ct.email}</p>}
                      {ct.phone && <p className="text-xs text-slate-500">{ct.phone}</p>}
                    </div>
                    <form action={deleteContact}>
                      <input type="hidden" name="id" value={ct.id} />
                      <input type="hidden" name="customerId" value={customer.id} />
                      <button type="submit" className="text-xs text-slate-400 hover:text-rose-600">
                        削除
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={addContact} className="space-y-2 rounded-lg bg-slate-50 p-3">
              <input type="hidden" name="customerId" value={customer.id} />
              <input name="name" required placeholder="氏名 (必須)" className={inputCls} />
              <input name="role" placeholder="役職・担当" className={inputCls} />
              <input name="email" type="email" placeholder="メール" className={inputCls} />
              <input name="phone" placeholder="電話番号" className={inputCls} />
              <button type="submit" className={btnSecondary}>
                担当者を追加
              </button>
            </form>
          </Card>

          {/* 案件 */}
          <Card className="p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">案件</h2>
            {customer.deals.length === 0 ? (
              <p className="text-sm text-slate-400">案件はありません</p>
            ) : (
              <ul className="space-y-2">
                {customer.deals.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/deals/${d.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50"
                    >
                      <span className="text-sm font-medium text-slate-800">{d.title}</span>
                      <span className="flex items-center gap-2">
                        <Badge className="bg-slate-100 text-slate-600">
                          {DEAL_STAGE_LABELS[d.stage] ?? d.stage}
                        </Badge>
                        <span className="whitespace-nowrap text-xs text-slate-500">
                          {formatMoney(d.monthlyFee, d.currency)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* 契約 */}
          <Card className="p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">契約</h2>
            {customer.contracts.length === 0 ? (
              <p className="text-sm text-slate-400">契約はありません</p>
            ) : (
              <ul className="space-y-2">
                {customer.contracts.map((ct) => (
                  <li
                    key={ct.id}
                    className="rounded-lg border border-slate-100 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-800">{ct.name}</span>
                      <Badge
                        className={
                          ct.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }
                      >
                        {ct.status === "ACTIVE" ? "契約中" : "終了"}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                      <span>{formatMoney(ct.monthlyFee, ct.currency)}/月</span>
                      <span>{ct.startDate.toLocaleDateString("ja-JP")}〜</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function parseCustomData(json: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(json);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
