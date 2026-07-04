import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui";
import { createDeal } from "@/app/actions/deals";
import { DealForm, type DealFormValues, type PlanOpt, type CustomFieldDefOpt } from "../deal-form";

function parseOptions(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export default async function NewDealPage() {
  const session = await requireSession();
  const orgId = session.org.id;

  const [customers, services, plans, defs] = await Promise.all([
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
    db.customFieldDef.findMany({ where: { orgId, entity: "deal" }, orderBy: { sortOrder: "asc" } }),
  ]);

  const customFields: CustomFieldDefOpt[] = defs.map((d) => ({
    key: d.key,
    label: d.label,
    type: d.type,
    options: parseOptions(d.options),
  }));

  const initial: DealFormValues = {
    customerId: "",
    title: "",
    stage: "LEAD",
    serviceId: "",
    planId: "",
    initialFee: 0,
    monthlyFee: 0,
    probability: 50,
    expectedCloseDate: "",
    memo: "",
    customData: {},
  };

  return (
    <>
      <PageHeader title="新規案件" description="営業案件を登録します" />
      <Card className="p-6">
        <DealForm
          action={createDeal}
          initial={initial}
          customers={customers}
          services={services}
          plans={plans as PlanOpt[]}
          customFields={customFields}
          submitLabel="登録する"
          cancelHref="/deals"
        />
      </Card>
    </>
  );
}
