import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui";
import { createContract } from "@/app/actions/contracts";
import { ContractForm, type ContractFormValues, type PlanOpt } from "../contract-form";

function todayInput(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ dealId?: string }>;
}) {
  const session = await requireSession();
  const orgId = session.org.id;
  const sp = await searchParams;

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

  // ?dealId= 指定時は案件から契約内容をプリフィル
  const deal = sp.dealId
    ? await db.deal.findFirst({ where: { id: sp.dealId, orgId } })
    : null;

  const initial: ContractFormValues = {
    dealId: deal?.id,
    name: deal?.title ?? "",
    customerId: deal?.customerId ?? "",
    serviceId: deal?.serviceId ?? "",
    planId: deal?.planId ?? "",
    initialFee: deal?.initialFee ?? 0,
    monthlyFee: deal?.monthlyFee ?? 0,
    startDate: todayInput(),
    memo: "",
  };

  return (
    <>
      <PageHeader
        title="新規契約"
        description={
          deal ? `案件「${deal.title}」から契約を作成します` : "契約を登録すると月次売上に自動計上されます"
        }
      />
      <Card className="p-6">
        <ContractForm
          action={createContract}
          initial={initial}
          customers={customers}
          services={services}
          plans={plans as PlanOpt[]}
          submitLabel="契約を作成"
          cancelHref="/contracts"
        />
      </Card>
    </>
  );
}
