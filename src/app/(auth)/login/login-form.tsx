"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthState } from "../actions";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-akane-500 focus:outline-none focus:ring-2 focus:ring-akane-100";

// email/next は招待リンク経由のログイン導線から渡される。
// email は自動入力 (変更可)、next はログイン後の戻り先 (招待リンク) に使う。
export function LoginForm({ email = "", next = "" }: { email?: string; next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});

  return (
    <form action={action} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="mb-6 text-lg font-semibold">ログイン</h1>
      {state.error && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      )}
      {next && <input type="hidden" name="next" value={next} />}
      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium text-slate-700">メールアドレス</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          defaultValue={email}
          readOnly={!!email}
          className={email ? `${inputCls} bg-slate-50 text-slate-600` : inputCls}
        />
      </label>
      <label className="mb-6 block">
        <span className="mb-1 block text-sm font-medium text-slate-700">パスワード</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          autoFocus={!!email}
          className={inputCls}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-akane-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-akane-700 disabled:opacity-50"
      >
        {pending ? "ログイン中..." : "ログイン"}
      </button>
      <p className="mt-6 text-center text-sm text-slate-500">
        アカウントをお持ちでない方は{" "}
        <Link href="/register" className="font-medium text-akane-600 hover:underline">
          新規登録
        </Link>
      </p>
    </form>
  );
}
