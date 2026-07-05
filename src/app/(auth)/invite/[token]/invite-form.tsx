"use client";

import { useActionState } from "react";
import Link from "next/link";
import { BASE_PRICE_JPY } from "@/lib/pricing";
import { acceptInvite, type AuthState } from "../../actions";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-akane-500 focus:outline-none focus:ring-2 focus:ring-akane-100";

// 参加すると席課金 (基本プラン) の対象が1名増えることを、招待リンクを開いた時点で明示する。
function BillingNotice() {
  return (
    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
      <p className="font-medium">💳 課金についてのご案内</p>
      <p className="mt-1">
        この組織に参加すると、基本プランの課金対象メンバーが1名増えます (¥{BASE_PRICE_JPY}/人・月)。
        請求は組織のオーナーに発生し、無料期間中は請求されません。
      </p>
    </div>
  );
}

export function InviteForm(props: {
  token: string;
  orgName: string;
  email: string;
  roleLabel: string;
  existingUser: boolean;
  loggedInAsInvitee: boolean;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(acceptInvite, {});

  // 既存アカウント宛の招待は、本人としてログイン済みの場合のみ受諾できる。
  // ログインへ誘導する際にメールアドレスと戻り先 (招待リンク) を引き継ぐ。
  if (props.existingUser && !props.loggedInAsInvitee) {
    const loginHref = `/login?email=${encodeURIComponent(props.email)}&next=${encodeURIComponent(
      `/invite/${props.token}`
    )}`;
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold">「{props.orgName}」への招待</h1>
        <p className="mb-6 text-sm text-slate-500">
          {props.email} 宛の招待です ({props.roleLabel}として参加)。
          このメールアドレスのアカウントは登録済みです。ログインすると、そのまま参加できます
          (メールアドレスは入力済みなので、パスワードのみご入力ください)。
        </p>
        <BillingNotice />
        <Link
          href={loginHref}
          className="block w-full rounded-lg bg-akane-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-akane-700"
        >
          ログインして参加する
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
      <BillingNotice />
      {state.error && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      )}
      <input type="hidden" name="token" value={props.token} />

      {/* メールアドレスは招待で固定 (表示のみ・変更不可) */}
      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium text-slate-700">メールアドレス</span>
        <input type="email" value={props.email} readOnly disabled className={`${inputCls} bg-slate-50 text-slate-500`} />
      </label>

      {!props.existingUser && (
        <>
          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium text-slate-700">お名前</span>
            <input type="text" name="name" required className={inputCls} />
          </label>
          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium text-slate-700">パスワード (8文字以上)</span>
            <input type="password" name="password" required minLength={8} className={inputCls} />
          </label>
          <label className="mb-6 flex items-start gap-2 text-xs text-slate-600">
            <input type="checkbox" name="agree" required className="mt-0.5 accent-akane-600" />
            <span>
              <Link href="/terms" target="_blank" className="text-akane-600 underline hover:no-underline">
                利用規約
              </Link>
              と
              <Link href="/privacy" target="_blank" className="text-akane-600 underline hover:no-underline">
                個人情報保護方針
              </Link>
              、および上記の課金 (席課金) の仕組みに同意します
            </span>
          </label>
        </>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-akane-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-akane-700 disabled:opacity-50"
      >
        {pending ? "参加中..." : "組織に参加する"}
      </button>
    </form>
  );
}
