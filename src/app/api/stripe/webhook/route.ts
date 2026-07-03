// Stripe Webhook: サブスクリプションの状態を Organization.plan に反映する。
// セッション文脈がないため dbAdmin (RLS バイパス) で書き込む。
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { dbAdmin } from "@/lib/db";

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
        await dbAdmin.organization.updateMany({
          where: { id: orgId },
          data: {
            plan: "PRO",
            stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
            stripeSubscriptionId:
              typeof session.subscription === "string" ? session.subscription : null,
          },
        });
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const orgId = sub.metadata?.orgId;
      const active = sub.status === "active" || sub.status === "trialing";
      if (orgId) {
        await dbAdmin.organization.updateMany({
          where: { id: orgId },
          data: {
            plan: active ? "PRO" : "FREE",
            stripeSubscriptionId: sub.id,
            stripeCustomerId: typeof sub.customer === "string" ? sub.customer : undefined,
          },
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const orgId = sub.metadata?.orgId;
      if (orgId) {
        await dbAdmin.organization.updateMany({
          where: { id: orgId },
          data: { plan: "FREE", stripeSubscriptionId: null },
        });
      } else {
        // metadata に orgId がない場合はサブスクリプション ID で照合
        await dbAdmin.organization.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { plan: "FREE", stripeSubscriptionId: null },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
