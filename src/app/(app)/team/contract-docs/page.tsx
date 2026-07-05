import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, Card, Badge, btnPrimary, inputCls, selectCls, labelCls, EmptyState } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { ToggleCheck } from "@/components/toggle-check";
import { CONTRACT_DOC_STAGE_LABELS, CONTRACT_DOC_STAGE_COLORS } from "@/lib/constants";
import { createContractDoc, toggleContractDocStage, deleteContractDoc } from "@/app/actions/contract-docs";

export const metadata = { title: "契約書管理" };

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("ja-JP") : "";
}

type DocRow = {
  id: string;
  title: string;
  counterparty: string;
  sentAt: Date | null;
  agreedAt: Date | null;
  storedAt: Date | null;
  fileName: string | null;
  fileUrl: string | null;
  memo: string | null;
  customer: { id: string; name: string } | null;
  contract: { id: string; name: string } | null;
};

function stageOf(d: DocRow): keyof typeof CONTRACT_DOC_STAGE_LABELS {
  if (d.storedAt) return "STORED";
  if (d.agreedAt) return "AGREED";
  if (d.sentAt) return "SENT";
  return "DRAFT";
}

export default async function ContractDocsPage() {
  const session = await requireSession();
  const orgId = session.org.id;

  const [docs, customers, contracts] = await Promise.all([
    db.contractDoc.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true } },
        contract: { select: { id: true, name: true } },
      },
    }),
    db.customer.findMany({ where: { orgId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.contract.findMany({ where: { orgId }, orderBy: { createdAt: "desc" }, select: { id: true, name: true } }),
  ]);

  // 論点サマリ: 回せているか / 同意 / 保管 の各到達数
  const total = docs.length;
  const sent = docs.filter((d) => d.sentAt).length;
  const agreed = docs.filter((d) => d.agreedAt).length;
  const stored = docs.filter((d) => d.storedAt).length;
  // 送付したが未締結 = 相手の同意待ちで止まっているもの (要フォロー)
  const awaitingAgree = docs.filter((d) => d.sentAt && !d.agreedAt).length;
  const awaitingStore = docs.filter((d) => d.agreedAt && !d.storedAt).length;

  const tiles = [
    { label: "登録件数", value: total, sub: "契約書全体" },
    { label: "送付済", value: sent, sub: `未送付 ${total - sent}` },
    { label: "締結待ち", value: awaitingAgree, sub: "送付済・同意未取得", warn: awaitingAgree > 0 },
    { label: "保管待ち", value: awaitingStore, sub: "締結済・未保管", warn: awaitingStore > 0 },
    { label: "保管完了", value: stored, sub: "回付〜保管まで完了" },
  ];

  return (
    <div>
      <PageHeader
        title="📄 契約書管理"
        description="「契約書を回せているか・同意を得ているか・保管できているか」を1件ずつ追跡します"
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <p className="text-xs text-slate-500">{t.label}</p>
            <p className={`mt-1 text-2xl font-bold ${t.warn ? "text-amber-600" : "text-slate-900"}`}>{t.value}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{t.sub}</p>
          </Card>
        ))}
      </div>

      <details className="mb-6">
        <summary className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-akane-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-akane-700">
          ＋ 契約書を登録
        </summary>
        <Card className="mt-3 p-6">
          <form action={createContractDoc} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>契約書名 *</label>
              <input name="title" required placeholder="例: 業務委託基本契約書 / NDA" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>顧客 (任意)</label>
              <select name="customerId" defaultValue="" className={`${selectCls} w-full`}>
                <option value="">— 選択しない —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>相手方 (未入力なら顧客名)</label>
              <input name="counterparty" placeholder="相手方の会社名・氏名" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>関連契約 (任意)</label>
              <select name="contractId" defaultValue="" className={`${selectCls} w-full`}>
                <option value="">— 選択しない —</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>保管ファイル名 (任意)</label>
              <input name="fileName" placeholder="例: NDA_2026.pdf" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>保管先URL (任意)</label>
              <input name="fileUrl" placeholder="Google Drive / Box などの共有リンク" className={inputCls} />
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

      {docs.length === 0 ? (
        <EmptyState title="まだ契約書が登録されていません" description="上のボタンから最初の契約書を登録しましょう。" />
      ) : (
        <div className="space-y-3">
          {docs.map((d) => {
            const stage = stageOf(d);
            return (
              <Card key={d.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{d.title}</h3>
                      <Badge className={CONTRACT_DOC_STAGE_COLORS[stage]}>{CONTRACT_DOC_STAGE_LABELS[stage]}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      相手方: {d.counterparty || "—"}
                      {d.customer && (
                        <> ・ <Link href={`/customers/${d.customer.id}`} className="text-akane-600 hover:underline">{d.customer.name}</Link></>
                      )}
                      {d.contract && (
                        <> ・ <Link href={`/contracts/${d.contract.id}`} className="text-akane-600 hover:underline">{d.contract.name}</Link></>
                      )}
                    </p>
                    {d.fileUrl ? (
                      <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-akane-600 hover:underline">
                        📎 {d.fileName || "保管ファイルを開く"}
                      </a>
                    ) : d.fileName ? (
                      <p className="mt-1 text-xs text-slate-400">📎 {d.fileName}</p>
                    ) : null}
                    {d.memo && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-500">{d.memo}</p>}
                  </div>
                  <ConfirmButton
                    action={deleteContractDoc.bind(null, d.id)}
                    message={`「${d.title}」を削除しますか？`}
                    className="text-xs text-slate-400 hover:text-rose-500"
                  >
                    削除
                  </ConfirmButton>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-3">
                  <ToggleCheck
                    initial={d.sentAt !== null}
                    action={toggleContractDocStage.bind(null, d.id, "sent")}
                    label={<>① 送付・回付{d.sentAt && <span className="ml-1 text-[11px] text-slate-400">{fmtDate(d.sentAt)}</span>}</>}
                  />
                  <ToggleCheck
                    initial={d.agreedAt !== null}
                    action={toggleContractDocStage.bind(null, d.id, "agreed")}
                    label={<>② 同意・締結{d.agreedAt && <span className="ml-1 text-[11px] text-slate-400">{fmtDate(d.agreedAt)}</span>}</>}
                  />
                  <ToggleCheck
                    initial={d.storedAt !== null}
                    action={toggleContractDocStage.bind(null, d.id, "stored")}
                    label={<>③ 保管完了{d.storedAt && <span className="ml-1 text-[11px] text-slate-400">{fmtDate(d.storedAt)}</span>}</>}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
