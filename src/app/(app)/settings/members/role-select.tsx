"use client";

import { useTransition } from "react";

export function RoleSelect({
  membershipId,
  current,
  action,
}: {
  membershipId: string;
  current: string;
  action: (membershipId: string, role: string) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      defaultValue={current}
      disabled={pending}
      onChange={(e) => startTransition(() => action(membershipId, e.target.value))}
      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
    >
      <option value="ADMIN">管理者</option>
      <option value="MEMBER">メンバー</option>
    </select>
  );
}
