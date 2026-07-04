import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui";
import { updateDeal } from "@/app/actions/deals";
import { DealForm, type DealFormValues, type PlanOpt, type CustomFieldDefOpt } from "../../deal-form";

function parseOptions(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function parseCustomData(json: string): Record<string, string> {
  try {
    const v = JSON.parse(json);
    if (v && typeof v === "object") {
      const out: Record<string, string> = {};
      for (const [k, val] of Object.entries(v)) out[k] = String(val);
      return out;
    }
  } catch {
    /* noop */
  }
  return {};
}

function toDateInput(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export default async function EditDealPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const orgId = session.org.id;
  const { id } = await params;

  const deal = await db.deal.findFirst({ where: { id, orgId } });
  if (!deal) notFound();

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
    id: deal.id,
    customerId: deal.customerId,
    title: deal.title,
    stage: deal.stage,
    serviceId: deal.serviceId ?? "",
    planId: deal.planId ?? "",
    initialFee: deal.initialFee,
    monthlyFee: deal.monthlyFee,
    probability: deal.probability,
    expectedCloseDate: toDateInput(deal.expectedCloseDate),
    memo: deal.memo ?? "",
    customData: parseCustomData(deal.customData),
  };

  return (
    <>
      <PageHeader title="案件を編集" description={deal.title} />
      <Card className="p-6">
        <DealForm
          action={updateDeal}
          initial={initial}
          customers={customers}
          services={services}
          plans={plans as PlanOpt[]}
          customFields={customFields}
          submitLabel="更新する"
          cancelHref={`/deals/${deal.id}`}
        />
      </Card>
    </>
  );
}
