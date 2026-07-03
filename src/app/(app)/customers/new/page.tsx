import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { createCustomer } from "@/app/actions/customers";
import { CustomerForm, type CustomFieldView } from "../customer-form";

export default async function NewCustomerPage() {
  const session = await requireSession();
  const defs = await db.customFieldDef.findMany({
    where: { orgId: session.org.id, entity: "customer" },
    orderBy: { sortOrder: "asc" },
  });

  const fields: CustomFieldView[] = defs.map((d) => ({
    key: d.key,
    label: d.label,
    type: d.type,
    options: parseOptions(d.options),
  }));

  return (
    <div>
      <PageHeader title="新規顧客" description="顧客情報を登録します" />
      <CustomerForm action={createCustomer} fields={fields} submitLabel="登録する" />
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
