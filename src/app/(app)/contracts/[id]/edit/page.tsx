import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui";
import { ActivityPanel } from "@/components/activity-panel";
import { updateContract } from "@/app/actions/contracts";
import { ContractForm, type ContractFormValues, type PlanOpt } from "../../contract-form";
import { DeleteContractButton } from "../delete-contract";

function toDateInput(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const orgId = session.org.id;
  const { id } = await params;

  const contract = await db.contract.findFirst({ where: { id, orgId } });
  if (!contract) notFound();

  // 活動履歴は顧客単位で共有 (顧客・案件ページで記録した内容もここに表示される)
  const [customer, activities, customerDeals] = await Promise.all([
    db.customer.findFirst({ where: { id: contract.customerId, orgId }, select: { name: true } }),
    db.activity.findMany({
      where: { customerId: contract.customerId, orgId },
      include: { user: { select: { name: true } }, deal: { select: { id: true, title: true } } },
      orderBy: { occurredAt: "desc" },
    }),
    db.deal.findMany({
      where: { customerId: contract.customerId, orgId },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const [customers, services, plans] = await Promise.all([
    db.customer.findMany({ where: { orgId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.service.findMany({
      where: { orgId, archived: false },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    db.plan.findMany({
      where: { service: { orgId }, active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, serviceId: true, name: true, initialFee: true, monthlyFee: true },
    }),
  ]);

  const initial: ContractFormValues = {
    id: contract.id,
    name: contract.name,
    customerId: contract.customerId,
    serviceId: contract.serviceId,
    planId: contract.planId ?? "",
    billingCycle: contract.billingCycle,
    initialFee: contract.initialFee,
    monthlyFee: contract.monthlyFee,
    startDate: toDateInput(contract.startDate),
    endDate: toDateInput(contract.endDate),
    status: contract.status,
    memo: contract.memo ?? "",
  };

  return (
    <>
      <PageHeader
        title="契約を編集"
        description={contract.name}
        actions={<DeleteContractButton contractId={contract.id} />}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <ContractForm
              action={updateContract}
              initial={initial}
              customers={customers}
              services={services}
              plans={plans as PlanOpt[]}
              submitLabel="更新する"
              cancelHref={`/contracts/${contract.id}`}
              showStatus
            />
          </Card>
        </div>
        <div>
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-800">
              活動履歴
              {customer && (
                <span className="ml-2 text-xs font-normal text-slate-400">
                  顧客「{customer.name}」の全記録
                </span>
              )}
            </h2>
            <ActivityPanel
              customerId={contract.customerId}
              dealId={contract.dealId}
              currentDealId={contract.dealId}
              path={`/contracts/${contract.id}/edit`}
              activities={activities}
              customerDeals={customerDeals}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
