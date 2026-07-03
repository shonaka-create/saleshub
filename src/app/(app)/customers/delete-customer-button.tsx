"use client";

import { deleteCustomer } from "@/app/actions/customers";
import { btnDanger } from "@/components/ui";

export function DeleteCustomerButton({ id }: { id: string }) {
  return (
    <form
      action={deleteCustomer}
      onSubmit={(e) => {
        if (!confirm("この顧客を削除しますか？関連する活動履歴・担当者も削除されます。")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={btnDanger}>
        削除
      </button>
    </form>
  );
}
