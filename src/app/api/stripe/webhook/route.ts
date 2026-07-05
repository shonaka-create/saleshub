// Stripe Webhook: サブスクリプションの状態を Organization に反映する。
// - metadata.plan = "BASE" (基本プラン 月500円) | "PRO" (経営分析 月490円)
//   ※ 過去に metadata.plan なしで作成された Pro サブスクリプションは PRO として扱う
// - あわせて BillingEvent (システム管理者向け利用ログ) を記録する
// セッション文脈がないため dbAdmin (RLS バイパス) で書き込む。
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { dbAdmin } from "@/lib/db";

type PlanKind = "BASE" | "PRO" | "TEAM";

function planKind(metadata: Stripe.Metadata | null | undefined): PlanKind {
  if (metadata?.plan === "BASE") return "BASE";
  if (metadata?.plan === "TEAM") return "TEAM";
  return "PRO";
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
        } else if (kind === "TEAM") {
          await dbAdmin.organization.updateMany({
            where: { id: orgId },
            data: {
              teamPlan: "TEAM",
              stripeTeamSubscriptionId: subscriptionId,
              ...(customerId ? { stripeCustomerId: customerId } : {}),
            },
          });
          await logEvent(orgId, "TEAM_SUBSCRIBED", "チームプラン (月額3,000円) 課金開始 — Pro機能も解放");
        } else {
          // トライアル付き Checkout の場合はサブスクリプションから trial_end を取得して保存する
          let trialEnd: Date | null = null;
          if (subscriptionId) {
            try {
              const sub = await stripe.subscriptions.retrieve(subscriptionId);
              if (sub.trial_end) trialEnd = new Date(sub.trial_end * 1000);
            } catch {
              /* trial なしとして扱う */
            }
          }
          await dbAdmin.organization.updateMany({
            where: { id: orgId },
            data: {
              plan: "PRO",
              stripeSubscriptionId: subscriptionId,
              ...(trialEnd ? { trialEndsAt: trialEnd } : {}),
              ...(customerId ? { stripeCustomerId: customerId } : {}),
            },
          });
          await logEvent(
            orgId,
            trialEnd ? "PRO_TRIAL_STARTED" : "PRO_SUBSCRIBED",
            trialEnd
              ? `Pro 14日無料トライアル開始 (カード登録済み、${trialEnd.toISOString().slice(0, 10)} 以降 月額490円)`
              : "Pro プラン (経営分析・月額490円) 課金開始"
          );
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
      } else if (planKind(sub.metadata) === "TEAM") {
        await dbAdmin.organization.updateMany({
          where: { id: orgId },
          data: {
            teamPlan: active ? "TEAM" : "FREE",
            stripeTeamSubscriptionId: sub.id,
            ...(typeof sub.customer === "string" ? { stripeCustomerId: sub.customer } : {}),
          },
        });
      } else {
        await dbAdmin.organization.updateMany({
          where: { id: orgId },
          data: {
            plan: active ? "PRO" : "FREE",
            stripeSubscriptionId: sub.id,
            // trial_end を同期 (トライアル中は未来日付、課金移行後は過去日付になり自然に「トライアル終了」扱い)
            ...(sub.trial_end ? { trialEndsAt: new Date(sub.trial_end * 1000) } : {}),
            ...(typeof sub.customer === "string" ? { stripeCustomerId: sub.customer } : {}),
          },
        });
        // トライアル終了 → 課金開始への移行をログに残す
        if (sub.status === "active" && event.data.previous_attributes && "status" in event.data.previous_attributes && event.data.previous_attributes.status === "trialing") {
          await logEvent(orgId, "PRO_TRIAL_CONVERTED", "Pro トライアル終了 → 月額490円の課金開始");
        }
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
      } else if (planKind(sub.metadata) === "TEAM") {
        if (orgId) {
          await dbAdmin.organization.updateMany({
            where: { id: orgId },
            data: { teamPlan: "FREE", stripeTeamSubscriptionId: null },
          });
          await logEvent(orgId, "TEAM_CANCELED", "チームプランを解約");
        } else {
          await dbAdmin.organization.updateMany({
            where: { stripeTeamSubscriptionId: sub.id },
            data: { teamPlan: "FREE", stripeTeamSubscriptionId: null },
          });
        }
      } else {
        // トライアル中の解約は課金前のキャンセル (料金は一切発生しない)
        const canceledInTrial = sub.trial_end != null && sub.trial_end * 1000 > Date.now();
        if (orgId) {
          await dbAdmin.organization.updateMany({
            where: { id: orgId },
            data: { plan: "FREE", stripeSubscriptionId: null },
          });
          await logEvent(
            orgId,
            canceledInTrial ? "PRO_TRIAL_CANCELED" : "PRO_CANCELED",
            canceledInTrial ? "Pro トライアル中に解約 (課金なし)" : "Pro プランを解約"
          );
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
