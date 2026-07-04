"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession, isAdmin } from "@/lib/auth";
import { getStripe, proPriceId, appUrl } from "@/lib/stripe";

// ===== Pro プラン課金 (Stripe) =====

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

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
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
