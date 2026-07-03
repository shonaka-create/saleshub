import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui";
import { updateContract } from "@/app/actions/contracts";
import { ContractForm, type ContractFormValues, type PlanOpt } from "../../contract-form";
import { DeleteContractButton } from "./delete-contract";

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
      select: { id: true, serviceId: true, name: true, currency: true, initialFee: true, monthlyFee: true },
    }),
  ]);

  const initial: ContractFormValues = {
    id: contract.id,
    name: contract.name,
    customerId: contract.customerId,
    serviceId: contract.serviceId,
    planId: contract.planId ?? "",
    currency: contract.currency,
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
      <Card className="p-6">
        <ContractForm
          action={updateContract}
          initial={initial}
          customers={customers}
          services={services}
          plans={plans as PlanOpt[]}
          submitLabel="更新する"
          cancelHref="/contracts"
          showStatus
        />
      </Card>
    </>
  );
}
