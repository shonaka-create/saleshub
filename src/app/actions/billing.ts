"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, dbAdmin } from "@/lib/db";
import { requireSession, isAdmin } from "@/lib/auth";
import { getStripe, proPriceId, teamPriceId, appUrl } from "@/lib/stripe";
import { TRIAL_DAYS, TEAM_PRICE_JPY } from "@/lib/plan";

// ===== Pro プラン課金 (Stripe) =====

// 14日無料トライアルを開始する (Stripe Checkout 経由)。
// - カード情報の登録と「トライアル終了後は自動的に月額課金が始まる」ことへの
//   明示的な同意 (consent チェックボックス) を得てから Stripe へ遷移する
// - トライアルは1組織1回のみ (trialEndsAt != null なら消費済み)
// - トライアル中に解約すれば Stripe のサブスクリプションが終了し、一切課金されない
export async function startProTrialCheckout(formData: FormData) {
  const session = await requireSession();
  if (!isAdmin(session.role)) redirect("/dashboard?billing=forbidden");
  if (formData.get("consent") !== "on") redirect("/dashboard?billing=consent");

  const stripe = getStripe();
  const price = proPriceId();
  if (!stripe || !price) redirect("/dashboard?billing=unconfigured");

  const org = await db.organization.findUniqueOrThrow({
    where: { id: session.org.id },
    select: { id: true, plan: true, trialEndsAt: true, stripeCustomerId: true },
  });
  if (org.plan === "PRO" || org.trialEndsAt != null) redirect("/dashboard");
  const seats = Math.max(1, await db.membership.count({ where: { orgId: org.id } }));

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: seats }],
    payment_method_collection: "always", // トライアルでもカード情報を必ず収集する
    client_reference_id: org.id,
    ...(org.stripeCustomerId
      ? { customer: org.stripeCustomerId }
      : { customer_email: session.user.email }),
    metadata: { orgId: org.id, plan: "PRO" },
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { orgId: org.id, plan: "PRO" },
    },
    success_url: `${appUrl()}/dashboard?trial=started`,
    cancel_url: `${appUrl()}/dashboard`,
  });

  await dbAdmin.billingEvent
    .create({
      data: {
        orgId: org.id,
        orgName: session.org.name,
        email: session.user.email,
        type: "PRO_TRIAL_CONSENT",
        detail: `トライアル開始の同意 (カード登録 + ${TRIAL_DAYS}日後の自動課金に承諾) — Checkout へ遷移`,
      },
    })
    .catch(() => {});

  redirect(checkout.url ?? "/dashboard");
}

// Checkout セッションを作成して Stripe の決済ページへリダイレクトする
// (経営分析はダッシュボードに統合されたため、遷移先は /dashboard)
export async function startProCheckout() {
  const session = await requireSession();
  if (!isAdmin(session.role)) redirect("/dashboard?billing=forbidden");

  const stripe = getStripe();
  const price = proPriceId();
  if (!stripe || !price) redirect("/dashboard?billing=unconfigured");

  const org = await db.organization.findUniqueOrThrow({
    where: { id: session.org.id },
    select: { id: true, stripeCustomerId: true },
  });
  const seats = Math.max(1, await db.membership.count({ where: { orgId: org.id } }));

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: seats }],
    client_reference_id: org.id,
    ...(org.stripeCustomerId
      ? { customer: org.stripeCustomerId }
      : { customer_email: session.user.email }),
    metadata: { orgId: org.id, plan: "PRO" },
    subscription_data: { metadata: { orgId: org.id, plan: "PRO" } },
    success_url: `${appUrl()}/dashboard?upgraded=1`,
    cancel_url: `${appUrl()}/dashboard`,
  });

  redirect(checkout.url ?? "/dashboard");
}

// ===== チームプラン課金 (Stripe) =====
// 契約書/請求書/委託費管理 + 今後のタスク/アサイン/WBS。TEAM は Pro 機能も包含する。
// トライアルなし・継続課金への同意 (consent) 必須。
export async function startTeamCheckout(formData: FormData) {
  const session = await requireSession();
  if (!isAdmin(session.role)) redirect("/billing?billing=forbidden");
  if (formData.get("consent") !== "on") redirect("/billing?billing=consent");

  const stripe = getStripe();
  const price = teamPriceId();
  if (!stripe || !price) redirect("/billing?billing=team_unconfigured");

  const org = await db.organization.findUniqueOrThrow({
    where: { id: session.org.id },
    select: { id: true, teamPlan: true, stripeCustomerId: true },
  });
  if (org.teamPlan === "TEAM") redirect("/team");
  const seats = Math.max(1, await db.membership.count({ where: { orgId: org.id } }));

  await dbAdmin.billingEvent
    .create({
      data: {
        orgId: org.id,
        orgName: session.org.name,
        email: session.user.email,
        type: "TEAM_CONSENT",
        detail: `チームプラン課金への同意 (月額¥${TEAM_PRICE_JPY}/人の継続課金) — ${seats}席で Checkout へ`,
      },
    })
    .catch(() => {});

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: seats }],
    client_reference_id: org.id,
    ...(org.stripeCustomerId
      ? { customer: org.stripeCustomerId }
      : { customer_email: session.user.email }),
    metadata: { orgId: org.id, plan: "TEAM" },
    subscription_data: { metadata: { orgId: org.id, plan: "TEAM" } },
    success_url: `${appUrl()}/team?upgraded=1`,
    cancel_url: `${appUrl()}/billing`,
  });

  redirect(checkout.url ?? "/billing");
}

// Stripe カスタマーポータル (支払い方法変更・解約) へリダイレクトする
export async function openBillingPortal() {
  const session = await requireSession();
  if (!isAdmin(session.role)) redirect("/dashboard?billing=forbidden");

  const stripe = getStripe();
  if (!stripe) redirect("/dashboard?billing=unconfigured");

  const org = await db.organization.findUniqueOrThrow({
    where: { id: session.org.id },
    select: { stripeCustomerId: true },
  });
  if (!org.stripeCustomerId) redirect("/dashboard");

  const portal = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${appUrl()}/dashboard`,
  });
  redirect(portal.url);
}

// ===== 経営分析の設定 (外注費上限・カテゴリ分類) =====

export async function updateInsightsSettings(formData: FormData) {
  const session = await requireSession();

  const limitRaw = String(formData.get("outsourcingLimit") ?? "").trim();
  const outsourcingLimit = limitRaw === "" ? null : Number(limitRaw);
  const marketingCategoryIds = formData.getAll("marketingCategoryIds").map(String);
  const outsourcingCategoryIds = formData.getAll("outsourcingCategoryIds").map(String);

  const org = await db.organization.findUniqueOrThrow({
    where: { id: session.org.id },
    select: { settings: true },
  });
  let settings: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(org.settings);
    if (parsed && typeof parsed === "object") settings = parsed;
  } catch {
    /* noop */
  }
  settings.insights = {
    marketingCategoryIds,
    outsourcingCategoryIds,
    outsourcingLimit:
      outsourcingLimit != null && Number.isFinite(outsourcingLimit) && outsourcingLimit > 0
        ? outsourcingLimit
        : null,
  };

  await db.organization.update({
    where: { id: session.org.id },
    data: { settings: JSON.stringify(settings) },
  });
  revalidatePath("/dashboard");
}
