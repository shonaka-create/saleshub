"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register, type AuthState } from "../actions";
import { Countdown } from "@/components/countdown";
import { BASE_PRICE_JPY, EARLY_BIRD_DEADLINE, isEarlyBird } from "@/lib/pricing";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-akane-500 focus:outline-none focus:ring-2 focus:ring-akane-100";

export default function RegisterPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(register, {});
  const earlyBird = isEarlyBird();

  return (
    <div>
      {/* 料金案内 */}
      <div className="mb-4 rounded-2xl border border-akane-200 bg-white p-5 shadow-sm">
        {earlyBird && (
          <div className="mb-3 rounded-xl bg-gradient-to-r from-akane-600 to-rose-500 px-4 py-3 text-center text-white">
            <p className="text-sm font-bold">🎉 早期登録キャンペーン実施中</p>
            <p className="mt-0.5 text-xs opacity-90">
              2026年7月15日までのご登録で <strong>3ヶ月間無料</strong>
            </p>
            <p className="mt-1 text-sm font-semibold">
              <Countdown deadlineIso={EARLY_BIRD_DEADLINE.toISOString()} />
            </p>
          </div>
        )}
        <ul className="space-y-1.5 text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <span className="text-emerald-600">✓</span>
            {earlyBird ? (
              <span>
                今なら <strong>3ヶ月間無料</strong> (通常は初月無料)
              </span>
            ) : (
              <span>
                <strong>初月無料</strong> でお試しいただけます
              </span>
            )}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600">✓</span>
            <span>
              無料期間終了後は <strong>月額 {BASE_PRICE_JPY}円 / 人</strong> (税込) — いつでも解約できます
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600">✓</span>
            <span>顧客管理・案件管理・契約管理・売上管理をこれひとつで</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-slate-400">＋</span>
            <span className="text-slate-500">
              メンバーを追加した分だけ加算（1人あたりの料金）。経営分析 (Pro) は別途 月額490円/人・14日間無料トライアル
            </span>
          </li>
        </ul>
      </div>

      <form action={action} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold">無料ではじめる</h1>
        <p className="mb-6 text-sm text-slate-500">
          あなたがオーナーとなる組織 (テナント) を作成します。登録時にクレジットカードは不要です。
        </p>
        {state.error && (
          <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
        )}
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">組織名 (会社名・屋号)</span>
          <input type="text" name="orgName" required placeholder="例: 株式会社サンプル" className={inputCls} />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">お名前</span>
          <input type="text" name="name" required className={inputCls} />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">メールアドレス</span>
          <input type="email" name="email" required autoComplete="email" className={inputCls} />
        </label>
        <label className="mb-5 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">パスワード (8文字以上)</span>
          <input type="password" name="password" required minLength={8} autoComplete="new-password" className={inputCls} />
        </label>

        {/* 規約同意 */}
        <label className="mb-6 flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
          <input type="checkbox" name="agree" required className="mt-0.5 h-4 w-4 accent-akane-600" />
          <span className="text-sm leading-relaxed text-slate-700">
            <Link href="/terms" target="_blank" className="font-medium text-akane-600 underline">
              利用規約
            </Link>
            および
            <Link href="/privacy" target="_blank" className="font-medium text-akane-600 underline">
              個人情報保護方針
            </Link>
            (データの取扱いを含む) に同意します
          </span>
        </label>

        <button
          type="submit" disabled={pending}
          className="w-full rounded-lg bg-akane-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-akane-700 disabled:opacity-50"
        >
          {pending ? "作成中..." : earlyBird ? "無料で登録する (3ヶ月無料)" : "無料で登録する (初月無料)"}
        </button>
        <p className="mt-6 text-center text-sm text-slate-500">
          既にアカウントをお持ちの方は{" "}
          <Link href="/login" className="font-medium text-akane-600 hover:underline">
            ログイン
          </Link>
        </p>
      </form>
    </div>
  );
}
