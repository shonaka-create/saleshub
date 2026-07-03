"use client";

import { useActionState } from "react";
import Link from "next/link";
import { acceptInvite, type AuthState } from "../../actions";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-akane-500 focus:outline-none focus:ring-2 focus:ring-akane-100";

export function InviteForm(props: {
  token: string;
  orgName: string;
  email: string;
  roleLabel: string;
  existingUser: boolean;
  loggedInAsInvitee: boolean;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(acceptInvite, {});

  // 既存アカウント宛の招待は、本人としてログイン済みの場合のみ受諾できる
  if (props.existingUser && !props.loggedInAsInvitee) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold">「{props.orgName}」への招待</h1>
        <p className="mb-6 text-sm text-slate-500">
          {props.email} 宛の招待です ({props.roleLabel}として参加)。
          このメールアドレスのアカウントは登録済みです。
          ログインしてから、もう一度この招待リンクを開いてください。
        </p>
        <Link
          href="/login"
          className="block w-full rounded-lg bg-akane-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-akane-700"
        >
          ログインする
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="mb-1 text-lg font-semibold">「{props.orgName}」への招待</h1>
      <p className="mb-6 text-sm text-slate-500">
        {props.email} 宛の招待です ({props.roleLabel}として参加)。
        {props.existingUser
          ? " 既存アカウントで参加します。"
          : " アカウントを作成して参加してください。"}
      </p>
      {state.error && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      )}
      <input type="hidden" name="token" value={props.token} />
      {!props.existingUser && (
        <>
          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium text-slate-700">お名前</span>
            <input type="text" name="name" required className={inputCls} />
          </label>
          <label className="mb-6 block">
            <span className="mb-1 block text-sm font-medium text-slate-700">パスワード (8文字以上)</span>
            <input type="password" name="password" required minLength={8} className={inputCls} />
          </label>
        </>
      )}
      <button
        type="submit" disabled={pending}
        className="w-full rounded-lg bg-akane-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-akane-700 disabled:opacity-50"
      >
        {pending ? "参加中..." : "組織に参加する"}
      </button>
    </form>
  );
}
