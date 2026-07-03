"use client";

import { useTransition } from "react";

export function ConfirmButton({
  action,
  message,
  className,
  children,
}: {
  action: () => Promise<void>;
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={() => {
        if (window.confirm(message)) startTransition(() => action());
      }}
    >
      {children}
    </button>
  );
}
