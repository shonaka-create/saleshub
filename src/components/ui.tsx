import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  className = "bg-slate-100 text-slate-700",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

export const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-lg bg-akane-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-akane-700 disabled:opacity-50";
export const btnSecondary =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";
export const btnDanger =
  "inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3.5 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50";
export const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-akane-500 focus:outline-none focus:ring-2 focus:ring-akane-100";
export const selectCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-akane-500 focus:outline-none focus:ring-2 focus:ring-akane-100";
export const labelCls = "mb-1 block text-sm font-medium text-slate-700";

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={btnPrimary}>
      {children}
    </Link>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
    </div>
  );
}
