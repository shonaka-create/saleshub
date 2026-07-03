"use client";

import { useTransition } from "react";
import { btnDanger } from "@/components/ui";
import { deleteDeal } from "@/app/actions/deals";

export function DeleteDealButton({ dealId }: { dealId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("この案件を削除しますか? この操作は取り消せません。")) {
          startTransition(() => {
            deleteDeal(dealId);
          });
        }
      }}
      className={btnDanger}
    >
      {pending ? "削除中..." : "削除"}
    </button>
  );
}
