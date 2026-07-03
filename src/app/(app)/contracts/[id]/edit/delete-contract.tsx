"use client";

import { useTransition } from "react";
import { btnDanger } from "@/components/ui";
import { deleteContract } from "@/app/actions/contracts";

export function DeleteContractButton({ contractId }: { contractId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("この契約を削除しますか? 過去の売上計上からも除外されます。")) {
          startTransition(() => {
            deleteContract(contractId);
          });
        }
      }}
      className={btnDanger}
    >
      {pending ? "削除中..." : "契約を削除"}
    </button>
  );
}
