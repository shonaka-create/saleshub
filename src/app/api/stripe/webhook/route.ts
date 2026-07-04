// Stripe Webhook: サブスクリプションの状態を Organization に反映する。
// - metadata.plan = "BASE" (基本プラン 月500円) | "PRO" (経営分析 月490円)
//   ※ 過去に metadata.plan なしで作成された Pro サブスクリプションは PRO として扱う
// - あわせて BillingEvent (システム管理者向け利用ログ) を記録する
// セッション文脈がないため dbAdmin (RLS バイパス) で書き込む。
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { dbAdmin } from "@/lib/db";

type PlanKind = "BASE" | "PRO";

function planKind(metadata: Stripe.Metadata | null | undefined): PlanKind {
  return metadata?.plan === "BASE" ? "BASE" : "PRO";
}

async function logEvent(orgId: string, type: string, detail: string) {
  const org = await dbAdmin.organization.findUnique({ where: { id: orgId }, select: { name: true } });
  await dbAdmin.billingEvent
    .create({ data: { orgId, orgName: org?.name ?? null, type, detail } })
    .catch(() => {}); // ログ失敗で webhook 全体を失敗させない
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "stripe not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "no signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const orgId = session.client_reference_id;
      if (orgId && session.mode === "subscription") {
        const kind = planKind(session.metadata);
        const customerId = typeof session.customer === "string" ? session.customer : undefined;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : undefined;
        if (kind === "BASE") {
          await dbAdmin.organization.updateMany({
            where: { id: orgId },
            data: {
              basePlanStatus: "ACTIVE",
              stripeBaseSubscriptionId: subscriptionId,
              ...(customerId ? { stripeCustomerId: customerId } : {}),
            },
          });
          await logEvent(orgId, "BASE_SUBSCRIBED", "基本プラン (月額500円) 課金開始");
        } else {
          await dbAdmin.organization.updateMany({
            where: { id: orgId },
            data: {
              plan: "PRO",
              stripeSubscriptionId: subscriptionId,
              ...(customerId ? { stripeCustomerId: customerId } : {}),
            },
          });
          await logEvent(orgId, "PRO_SUBSCRIBED", "Pro プラン (経営分析・月額490円) 課金開始");
        }
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const orgId = sub.metadata?.orgId;
      const active = sub.status === "active" || sub.status === "trialing";
      if (!orgId) break;
      if (planKind(sub.metadata) === "BASE") {
        await dbAdmin.organization.updateMany({
          where: { id: orgId },
          data: {
            basePlanStatus: active ? "ACTIVE" : "CANCELED",
            stripeBaseSubscriptionId: sub.id,
            ...(typeof sub.customer === "string" ? { stripeCustomerId: sub.customer } : {}),
          },
        });
      } else {
        await dbAdmin.organization.updateMany({
          where: { id: orgId },
          data: {
            plan: active ? "PRO" : "FREE",
            stripeSubscriptionId: sub.id,
            ...(typeof sub.customer === "string" ? { stripeCustomerId: sub.customer } : {}),
          },
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const orgId = sub.metadata?.orgId;
      if (planKind(sub.metadata) === "BASE") {
        if (orgId) {
          await dbAdmin.organization.updateMany({
            where: { id: orgId },
            data: { basePlanStatus: "CANCELED", stripeBaseSubscriptionId: null },
          });
          await logEvent(orgId, "BASE_CANCELED", "基本プランを解約");
        } else {
          await dbAdmin.organization.updateMany({
            where: { stripeBaseSubscriptionId: sub.id },
            data: { basePlanStatus: "CANCELED", stripeBaseSubscriptionId: null },
          });
        }
      } else {
        if (orgId) {
          await dbAdmin.organization.updateMany({
            where: { id: orgId },
            data: { plan: "FREE", stripeSubscriptionId: null },
          });
          await logEvent(orgId, "PRO_CANCELED", "Pro プランを解約");
        } else {
          // metadata に orgId がない場合はサブスクリプション ID で照合
          await dbAdmin.organization.updateMany({
            where: { stripeSubscriptionId: sub.id },
            data: { plan: "FREE", stripeSubscriptionId: null },
          });
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
