"use server";

import { redirect } from "next/navigation";
import { db, dbAdmin } from "@/lib/db";
import { requireSession, isAdmin } from "@/lib/auth";
import { getStripe, appUrl } from "@/lib/stripe";
import { BASE_PRICE_JPY, seatTotal } from "@/lib/pricing";
import { PRO_PRICE_JPY } from "@/lib/plan";

// ===== 基本プラン課金 (システム利用料: 初月無料 → 月額500円 / 人) =====
// 課金量は「単価 × 組織のメンバー数」。Checkout 作成時点のメンバー数を quantity として渡す
// (席課金)。期中のメンバー増減は次回登録/更新のタイミングで数量へ反映する方針 (表示先行)。

// 基本プランの Checkout セッションを作成して Stripe 決済ページへリダイレクトする
export async function startBaseCheckout(formData: FormData) {
  const session = await requireSession();
  if (!isAdmin(session.role)) redirect("/billing?billing=forbidden");
  // 課金開始 (継続課金) への同意を必須にする
  if (formData.get("consent") !== "on") redirect("/billing?billing=consent");

  const stripe = getStripe();
  const price = process.env.STRIPE_PRICE_ID_BASE;
  if (!stripe || !price) redirect("/billing?billing=unconfigured");

  const org = await db.organization.findUniqueOrThrow({
    where: { id: session.org.id },
    select: { id: true, stripeCustomerId: true },
  });
  const seats = Math.max(1, await db.membership.count({ where: { orgId: org.id } }));

  // 課金への明示的な同意を証跡として残す (個人情報保護方針・利用規約・継続課金に同意)
  await dbAdmin.billingEvent
    .create({
      data: {
        orgId: org.id,
        orgName: session.org.name,
        email: session.user.email,
        type: "BASE_CONSENT",
        detail: `基本プラン課金への同意 (利用規約・個人情報保護方針・月額¥${BASE_PRICE_JPY}/人の継続課金) — ${seats}席で Checkout へ`,
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

// ===== 解約 (アプリ内から。改善アンケート付き) =====
// 解約対象 (target) を選べる: BASE = 基本プラン (=サービス全体の利用停止) / PRO = Pro プランのみ (基本は継続)。
// 課金中なら該当 Stripe サブスクリプションを即時キャンセルし、以降の請求を止める。
export async function cancelPlan(formData: FormData) {
  const target = String(formData.get("target") ?? "BASE");
  if (target === "PRO") return cancelProPlan(formData);
  return cancelBasePlan(formData);
}

// Pro プラン (経営数値分析・テンプレート) のみ解約する。基本プランはそのまま継続。
export async function cancelProPlan(formData: FormData) {
  const session = await requireSession();
  if (!isAdmin(session.role)) redirect("/settings/cancel?cancel=forbidden");

  const reason = String(formData.get("reason") ?? "").trim();
  const improvement = formData.getAll("improvement").map(String).filter(Boolean).join("・");
  const detail = String(formData.get("detail") ?? "").trim() || "(自由記述なし)";
  if (formData.get("confirm") !== "on") redirect("/settings/cancel?cancel=confirm");

  const [org, seats] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: session.org.id },
      select: { id: true, plan: true, trialEndsAt: true, stripeSubscriptionId: true },
    }),
    db.membership.count({ where: { orgId: session.org.id } }),
  ]);
  // トライアル中の解約は課金前のキャンセル (一切請求されない) なので「課金中を解約」に数えない。
  // webhook (customer.subscription.deleted) の canceledInTrial 判定と定義を揃える。
  const inTrial = org.trialEndsAt != null && org.trialEndsAt.getTime() > Date.now();
  const wasSubscribed = org.plan === "PRO" && !!org.stripeSubscriptionId && !inTrial;
  const monthlyJpy = wasSubscribed ? seatTotal(PRO_PRICE_JPY, Math.max(1, seats)) : 0;

  const stripe = getStripe();
  if (stripe && org.stripeSubscriptionId) {
    await stripe.subscriptions.cancel(org.stripeSubscriptionId).catch(() => {});
  }
  // plan を FREE に戻す。trialEndsAt は「トライアル消費済み」の印なので残す (再登録で再トライアル不可)。
  await dbAdmin.organization.updateMany({
    where: { id: org.id },
    data: { plan: "FREE", stripeSubscriptionId: null },
  });

  await dbAdmin.cancellationSurvey
    .create({
      data: {
        orgId: org.id,
        orgName: session.org.name,
        email: session.user.email,
        reason: reason || "未選択",
        improvements: improvement,
        detail: detail === "(自由記述なし)" ? "" : detail,
        wasSubscribed,
        monthlyJpy,
      },
    })
    .catch(() => {});
  await dbAdmin.billingEvent
    .create({
      data: {
        orgId: org.id,
        orgName: session.org.name,
        email: session.user.email,
        type: "PRO_CANCELED",
        detail: `アプリ内から Pro プランを解約 (基本プランは継続) / 理由: ${reason || "未選択"}`,
      },
    })
    .catch(() => {});

  redirect("/settings/cancel?cancel=pro-canceled");
}

// 基本プラン (=サービス全体) を解約する。無料期間中でも利用停止になる。
export async function cancelBasePlan(formData: FormData) {
  const session = await requireSession();
  if (!isAdmin(session.role)) redirect("/settings/cancel?cancel=forbidden");

  const reason = String(formData.get("reason") ?? "").trim();
  const improvement = formData.getAll("improvement").map(String).filter(Boolean).join("・");
  const detail =
    String(formData.get("detail") ?? "").trim() || "(自由記述なし)";
  if (formData.get("confirm") !== "on") redirect("/settings/cancel?cancel=confirm");

  const [org, seats] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: session.org.id },
      select: { id: true, basePlanStatus: true, stripeBaseSubscriptionId: true },
    }),
    db.membership.count({ where: { orgId: session.org.id } }),
  ]);
  // 解約時点で「実際に課金されていた」か / 失う月額 (MRR) を確定させておく。
  // 運営/無償組織 (basePlanStatus=ACTIVE だが Stripe サブスク無し) は実請求がないので除外し、
  // 管理画面の realBase (ACTIVE かつ stripeBaseSubscriptionId != null) と定義を揃える。
  const wasSubscribed = !!org.stripeBaseSubscriptionId;
  const monthlyJpy = wasSubscribed ? seatTotal(BASE_PRICE_JPY, Math.max(1, seats)) : 0;

  // 課金中なら Stripe サブスクリプションをキャンセル (webhook 経由でも CANCELED になるが、
  // 即時に利用停止・請求停止を確定させるためここでも状態を更新する)。
  const stripe = getStripe();
  if (stripe && org.stripeBaseSubscriptionId) {
    await stripe.subscriptions
      .cancel(org.stripeBaseSubscriptionId)
      .catch(() => {}); // 既に解約済み等は無視
  }

  await dbAdmin.organization.updateMany({
    where: { id: org.id },
    data: { basePlanStatus: "CANCELED", stripeBaseSubscriptionId: null },
  });

  // 契約管理サマリの集計元: 構造化したアンケート回答を保存
  await dbAdmin.cancellationSurvey
    .create({
      data: {
        orgId: org.id,
        orgName: session.org.name,
        email: session.user.email,
        reason: reason || "未選択",
        improvements: improvement,
        detail: detail === "(自由記述なし)" ? "" : detail,
        wasSubscribed,
        monthlyJpy,
      },
    })
    .catch(() => {});

  // 改善につながるアンケート回答を利用ログにも記録 (時系列の一覧表示用)
  await dbAdmin.billingEvent
    .create({
      data: {
        orgId: org.id,
        orgName: session.org.name,
        email: session.user.email,
        type: "CANCEL_SURVEY",
        detail: `解約理由: ${reason || "未選択"} / 改善希望: ${improvement || "なし"} / 詳細: ${detail}`,
      },
    })
    .catch(() => {});
  await dbAdmin.billingEvent
    .create({
      data: {
        orgId: org.id,
        orgName: session.org.name,
        email: session.user.email,
        type: "BASE_CANCELED",
        detail: "アプリ内から基本プランを解約 (利用停止)",
      },
    })
    .catch(() => {});

  redirect("/billing?billing=canceled");
}
