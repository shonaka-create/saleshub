"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  COUNTRIES,
  COUNTRY_LABELS,
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_LABELS,
} from "@/lib/constants";
import { btnPrimary, btnSecondary, inputCls, labelCls, selectCls } from "@/components/ui";
import type { CustomerFormState } from "@/app/actions/customers";

export type CustomFieldView = {
  key: string;
  label: string;
  type: string;
  options: string[];
};

export type CustomerFormValues = {
  id?: string;
  name?: string;
  country?: string;
  status?: string;
  industry?: string | null;
  email?: string | null;
  phone?: string | null;
  instagram?: string | null;
  website?: string | null;
  address?: string | null;
  tags?: string;
  memo?: string | null;
};

const fieldSelectCls = selectCls + " w-full";

export function CustomerForm({
  action,
  values = {},
  fields,
  customValues = {},
  submitLabel,
}: {
  action: (prev: CustomerFormState, formData: FormData) => Promise<CustomerFormState>;
  values?: CustomerFormValues;
  fields: CustomFieldView[];
  customValues?: Record<string, unknown>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<CustomerFormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      )}
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="name">
              顧客名 <span className="text-rose-600">*</span>
            </label>
            <input
              id="name"
              name="name"
              required
              defaultValue={values.name ?? ""}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="country">
              国
            </label>
            <select
              id="country"
              name="country"
              defaultValue={values.country ?? "JP"}
              className={fieldSelectCls}
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {COUNTRY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls} htmlFor="status">
              ステータス
            </label>
            <select
              id="status"
              name="status"
              defaultValue={values.status ?? "LEAD"}
              className={fieldSelectCls}
            >
              {CUSTOMER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CUSTOMER_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls} htmlFor="industry">
              業種
            </label>
            <input
              id="industry"
              name="industry"
              defaultValue={values.industry ?? ""}
              placeholder="カフェ・サロン 等"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="email">
              メール
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={values.email ?? ""}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="phone">
              電話番号
            </label>
            <input
              id="phone"
              name="phone"
              defaultValue={values.phone ?? ""}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="instagram">
              Instagram
            </label>
            <input
              id="instagram"
              name="instagram"
              defaultValue={values.instagram ?? ""}
              placeholder="@handle または URL"
              className={inputCls}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="website">
              Webサイト
            </label>
            <input
              id="website"
              name="website"
              defaultValue={values.website ?? ""}
              placeholder="https://"
              className={inputCls}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="address">
              住所
            </label>
            <input
              id="address"
              name="address"
              defaultValue={values.address ?? ""}
              className={inputCls}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="tags">
              タグ
            </label>
            <input
              id="tags"
              name="tags"
              defaultValue={values.tags ?? ""}
              placeholder="重要, VIP, 紹介"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-slate-400">カンマ区切りで複数入力できます</p>
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="memo">
              メモ
            </label>
            <textarea
              id="memo"
              name="memo"
              rows={4}
              defaultValue={values.memo ?? ""}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {fields.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">カスタム項目</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((f) => {
              const inputName = `cf_${f.key}`;
              const cur = customValues[f.key];
              const curStr = cur == null ? "" : String(cur);
              return (
                <div key={f.key}>
                  <label className={labelCls} htmlFor={inputName}>
                    {f.label}
                  </label>
                  {f.type === "select" ? (
                    <select
                      id={inputName}
                      name={inputName}
                      defaultValue={curStr}
                      className={fieldSelectCls}
                    >
                      <option value="">未選択</option>
                      {f.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={inputName}
                      name={inputName}
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                      defaultValue={curStr}
                      className={inputCls}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "保存中..." : submitLabel}
        </button>
        <Link
          href={values.id ? `/customers/${values.id}` : "/customers"}
          className={btnSecondary}
        >
          キャンセル
        </Link>
      </div>
    </form>
  );
}
