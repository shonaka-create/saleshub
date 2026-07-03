"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register, type AuthState } from "../actions";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-akane-500 focus:outline-none focus:ring-2 focus:ring-akane-100";

export default function RegisterPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(register, {});

  return (
    <form action={action} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="mb-1 text-lg font-semibold">組織アカウントの新規作成</h1>
      <p className="mb-6 text-sm text-slate-500">
        あなたがオーナーとなる組織 (テナント) を作成します。作成後にメンバーを招待できます。
      </p>
      {state.error && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      )}
      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium text-slate-700">組織名</span>
        <input type="text" name="orgName" required placeholder="AKANE WEB STUDIO" className={inputCls} />
      </label>
      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium text-slate-700">お名前</span>
        <input type="text" name="name" required className={inputCls} />
      </label>
      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium text-slate-700">メールアドレス</span>
        <input type="email" name="email" required autoComplete="email" className={inputCls} />
      </label>
      <label className="mb-6 block">
        <span className="mb-1 block text-sm font-medium text-slate-700">パスワード (8文字以上)</span>
        <input type="password" name="password" required minLength={8} autoComplete="new-password" className={inputCls} />
      </label>
      <button
        type="submit" disabled={pending}
        className="w-full rounded-lg bg-akane-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-akane-700 disabled:opacity-50"
      >
        {pending ? "作成中..." : "組織を作成して開始"}
      </button>
      <p className="mt-6 text-center text-sm text-slate-500">
        既にアカウントをお持ちの方は{" "}
        <Link href="/login" className="font-medium text-akane-600 hover:underline">
          ログイン
        </Link>
      </p>
    </form>
  );
}
