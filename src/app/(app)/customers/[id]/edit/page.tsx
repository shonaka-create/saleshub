import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { updateCustomer } from "@/app/actions/customers";
import { CustomerForm, type CustomFieldView } from "../../customer-form";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const [customer, defs] = await Promise.all([
    db.customer.findFirst({ where: { id, orgId: session.org.id } }),
    db.customFieldDef.findMany({
      where: { orgId: session.org.id, entity: "customer" },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  if (!customer) notFound();

  const fields: CustomFieldView[] = defs.map((d) => ({
    key: d.key,
    label: d.label,
    type: d.type,
    options: parseOptions(d.options),
  }));

  return (
    <div>
      <PageHeader title="顧客を編集" description={customer.name} />
      <CustomerForm
        action={updateCustomer}
        submitLabel="更新する"
        fields={fields}
        customValues={parseCustomData(customer.customData)}
        values={{
          id: customer.id,
          name: customer.name,
          country: customer.country,
          status: customer.status,
          industry: customer.industry,
          email: customer.email,
          phone: customer.phone,
          instagram: customer.instagram,
          website: customer.website,
          address: customer.address,
          tags: customer.tags,
          memo: customer.memo,
        }}
      />
    </div>
  );
}

function parseOptions(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

function parseCustomData(json: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(json);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
