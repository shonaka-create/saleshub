import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/currency";
import { PageHeader, Card, Badge, btnPrimary, inputCls, selectCls, labelCls, EmptyState } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { ToggleCheck } from "@/components/toggle-check";
import { FileAttach } from "@/components/file-attach";
import { TeamUpgradeNotice } from "@/components/team-upgrade-notice";
import { currentUserHasTeamAccess } from "@/lib/plan";
import { INVOICE_DIRECTIONS, INVOICE_DIRECTION_LABELS, INVOICE_FIELD_LABELS, type InvoiceDirection } from "@/lib/constants";
import { createInvoice, toggleInvoiceFlag, toggleInvoiceDate, deleteInvoice } from "@/app/actions/invoices";

export const metadata = { title: "請求書管理" };

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("ja-JP") : "";
}

export default async function InvoicesPage() {
  const session = await requireSession();
  const orgId = session.org.id;
  const currency = session.org.baseCurrency;

  if (!(await currentUserHasTeamAccess(orgId))) {
    return (
      <div>
        <PageHeader title="🧾 請求書管理" description="受領/送付・必要項目・締切日の同意・入金/支払いを管理" />
        <TeamUpgradeNotice
          title="請求書管理はチーム機能です"
          description="チームプランにアップグレードすると、発行・受領の請求書と入金・支払いをまとめて管理できます。"
        />
      </div>
    );
  }

  const [invoices, customers] = await Promise.all([
    db.invoice.findMany({
      where: { orgId },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      include: { customer: { select: { id: true, name: true } } },
    }),
    db.customer.findMany({ where: { orgId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const now = new Date();
  const isOverdue = (i: (typeof invoices)[number]) => !!i.dueDate && !i.settledAt && new Date(i.dueDate) < now;

  const issued = invoices.filter((i) => i.direction === "ISSUED");
  const received = invoices.filter((i) => i.direction === "RECEIVED");
  // 未収 = 発行済で未入金 / 未払 = 受領で未支払
  const receivable = issued.filter((i) => !i.settledAt).reduce((s, i) => s + i.amount, 0);
  const payable = received.filter((i) => !i.settledAt).reduce((s, i) => s + i.amount, 0);
  const overdueCount = invoices.filter(isOverdue).length;
  const missingItems = invoices.filter((i) => !i.itemsComplete).length;

  const tiles = [
    { label: "未収 (入金待ち)", value: formatMoney(receivable, currency), sub: `発行 ${issued.length} 件` },
    { label: "未払 (支払待ち)", value: formatMoney(payable, currency), sub: `受領 ${received.length} 件` },
    { label: "期限超過", value: `${overdueCount} 件`, sub: "締切日を過ぎて未決済", warn: overdueCount > 0 },
    { label: "必要項目 未達", value: `${missingItems} 件`, sub: "登録番号・税率等の不備", warn: missingItems > 0 },
  ];

  return (
    <div>
      <PageHeader
        title="🧾 請求書管理"
        description="受領・送付、必要項目、締切日への同意、締切日までの入金・支払いを1件ずつ管理します"
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <p className="text-xs text-slate-500">{t.label}</p>
            <p className={`mt-1 text-xl font-bold ${t.warn ? "text-amber-600" : "text-slate-900"}`}>{t.value}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{t.sub}</p>
          </Card>
        ))}
      </div>

      <details className="mb-6">
        <summary className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-akane-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-akane-700">
          ＋ 請求書を登録
        </summary>
        <Card className="mt-3 p-6">
          <form action={createInvoice} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>区分 *</label>
              <select name="direction" defaultValue="ISSUED" className={`${selectCls} w-full`}>
                {INVOICE_DIRECTIONS.map((d) => (
                  <option key={d} value={d}>{INVOICE_DIRECTION_LABELS[d]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>取引先名 * (発行時は顧客名で自動補完)</label>
              <input name="counterparty" placeholder="取引先の会社名・氏名" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>顧客 (発行時・任意)</label>
              <select name="customerId" defaultValue="" className={`${selectCls} w-full`}>
                <option value="">— 選択しない —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>請求書番号 (任意)</label>
              <input name="invoiceNo" placeholder="例: INV-2026-001" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>金額 (税込)</label>
              <input name="amount" type="number" min="0" step="1" defaultValue="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>税率 (%)</label>
              <input name="taxRate" type="number" min="0" step="1" defaultValue="10" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>インボイス登録番号 (任意)</label>
              <input name="registrationNo" placeholder="T1234567890123" className={inputCls} />
            </div>
            <div className="hidden sm:block" />
            <div>
              <label className={labelCls}>請求日</label>
              <input name="issueDate" type="date" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>支払期限 (締切日)</label>
              <input name="dueDate" type="date" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>メモ (任意)</label>
              <textarea name="memo" rows={2} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className={btnPrimary}>登録する</button>
            </div>
          </form>
        </Card>
      </details>

      {invoices.length === 0 ? (
        <EmptyState title="まだ請求書が登録されていません" description="発行した請求書・受領した請求書の両方を管理できます。" />
      ) : (
        <div className="space-y-3">
          {invoices.map((i) => {
            const dir = i.direction as InvoiceDirection;
            const fl = INVOICE_FIELD_LABELS[dir] ?? INVOICE_FIELD_LABELS.ISSUED;
            const overdue = isOverdue(i);
            return (
              <Card key={i.id} className={`p-5 ${overdue ? "border-amber-200" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={dir === "ISSUED" ? "bg-indigo-50 text-indigo-700" : "bg-purple-50 text-purple-700"}>
                        {dir === "ISSUED" ? "発行" : "受領"}
                      </Badge>
                      <h3 className="text-sm font-semibold text-slate-900">{i.counterparty || "—"}</h3>
                      {i.invoiceNo && <span className="text-xs text-slate-400">{i.invoiceNo}</span>}
                      {i.settledAt ? (
                        <Badge className="bg-emerald-100 text-emerald-800">{fl.settled}済</Badge>
                      ) : overdue ? (
                        <Badge className="bg-amber-100 text-amber-800">期限超過</Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      <span className="text-sm font-semibold text-slate-800">{formatMoney(i.amount, currency)}</span>
                      <span className="ml-1">(税{i.taxRate}%)</span>
                      {i.issueDate && <> ・ 請求 {fmtDate(i.issueDate)}</>}
                      {i.dueDate && <> ・ 締切 {fmtDate(i.dueDate)}</>}
                      {i.registrationNo && <> ・ 登録番号 {i.registrationNo}</>}
                      {i.customer && (
                        <> ・ <Link href={`/customers/${i.customer.id}`} className="text-akane-600 hover:underline">{i.customer.name}</Link></>
                      )}
                    </p>
                    {i.memo && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-500">{i.memo}</p>}
                  </div>
                  <ConfirmButton
                    action={deleteInvoice.bind(null, i.id)}
                    message={`${i.counterparty} の請求書を削除しますか？`}
                    className="text-xs text-slate-400 hover:text-rose-500"
                  >
                    削除
                  </ConfirmButton>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-3">
                  <ToggleCheck
                    initial={i.itemsComplete}
                    action={toggleInvoiceFlag.bind(null, i.id, "itemsComplete")}
                    label="必要項目OK"
                  />
                  <ToggleCheck
                    initial={i.dueDateAgreed}
                    action={toggleInvoiceFlag.bind(null, i.id, "dueDateAgreed")}
                    label="締切日に同意"
                  />
                  <ToggleCheck
                    initial={i.deliveredAt !== null}
                    action={toggleInvoiceDate.bind(null, i.id, "deliveredAt")}
                    label={<>{fl.delivered}済{i.deliveredAt && <span className="ml-1 text-[11px] text-slate-400">{fmtDate(i.deliveredAt)}</span>}</>}
                  />
                  <ToggleCheck
                    initial={i.settledAt !== null}
                    action={toggleInvoiceDate.bind(null, i.id, "settledAt")}
                    label={<>{fl.settled}済{i.settledAt && <span className="ml-1 text-[11px] text-slate-400">{fmtDate(i.settledAt)}</span>}</>}
                  />
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-400">請求書ファイル</span>
                  <FileAttach entity="invoice" id={i.id} fileName={i.fileName} fileSize={i.fileSize} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
