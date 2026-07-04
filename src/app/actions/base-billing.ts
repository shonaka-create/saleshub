"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession, isAdmin } from "@/lib/auth";
import { getStripe, appUrl } from "@/lib/stripe";

// ===== 基本プラン課金 (システム利用料: 初月無料 → 月額500円) =====

// 基本プランの Checkout セッションを作成して Stripe 決済ページへリダイレクトする
export async function startBaseCheckout() {
  const session = await requireSession();
  if (!isAdmin(session.role)) redirect("/billing?billing=forbidden");

  const stripe = getStripe();
  const price = process.env.STRIPE_PRICE_ID_BASE;
  if (!stripe || !price) redirect("/billing?billing=unconfigured");

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
    metadata: { orgId: org.id, plan: "BASE" },
    subscription_data: { metadata: { orgId: org.id, plan: "BASE" } },
    success_url: `${appUrl()}/dashboard?base=subscribed`,
    cancel_url: `${appUrl()}/billing`,
  });

  redirect(checkout.url ?? "/billing");
}

// Stripe カスタマーポータル (支払い方法変更・解約)
export async function openBaseBillingPortal() {
  const session = await requireSession();
  if (!isAdmin(session.role)) redirect("/billing?billing=forbidden");

  const stripe = getStripe();
  if (!stripe) redirect("/billing?billing=unconfigured");

  const org = await db.organization.findUniqueOrThrow({
    where: { id: session.org.id },
    select: { stripeCustomerId: true },
  });
  if (!org.stripeCustomerId) redirect("/billing");

  const portal = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${appUrl()}/billing`,
  });
  redirect(portal.url);
}
