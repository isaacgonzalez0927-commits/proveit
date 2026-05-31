import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { normalizePlanId, type PlanId } from "@/types";
import { isStripeConfigured } from "@/lib/billing";
import {
  applyPaidPlan,
  billingFromStripePriceId,
  lookupUserIdByStripeCustomer,
  priceIdFromSubscription,
  resolvePlanFromSubscription,
  revertToFree,
} from "@/lib/stripeSubscriptionSync";

export const runtime = "nodejs";

function billingFromMetadata(metadata: Stripe.Metadata | null | undefined): "monthly" | "yearly" {
  return metadata?.billing === "yearly" ? "yearly" : "monthly";
}

function resolveUserIdFromSession(session: Stripe.Checkout.Session): string | null {
  const fromMeta = session.metadata?.userId;
  if (typeof fromMeta === "string" && fromMeta.length > 0) return fromMeta;
  if (typeof session.client_reference_id === "string" && session.client_reference_id.length > 0) {
    return session.client_reference_id;
  }
  return null;
}

async function resolveUserIdFromSubscription(
  sub: Stripe.Subscription
): Promise<string | null> {
  const fromMeta = sub.metadata?.userId;
  if (typeof fromMeta === "string" && fromMeta.length > 0) return fromMeta;
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
  if (customerId) return lookupUserIdByStripeCustomer(customerId);
  return null;
}

function resolvePlanFromSession(session: Stripe.Checkout.Session): PlanId | null {
  const fromMeta = normalizePlanId(session.metadata?.plan);
  if (fromMeta === "pro" || fromMeta === "premium") return fromMeta;
  return null;
}

export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 501 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = resolveUserIdFromSession(session);
        let plan = resolvePlanFromSession(session);
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id ?? null;

        if (!plan && subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          plan = resolvePlanFromSubscription(sub);
        }

        if (userId && (plan === "pro" || plan === "premium")) {
          const applied = await applyPaidPlan(
            userId,
            plan,
            billingFromMetadata(session.metadata),
            customerId,
            subscriptionId
          );
          if (!applied.ok) {
            console.error("webhook checkout.session.completed:", applied.error, { userId, plan });
            return NextResponse.json({ error: applied.error }, { status: 500 });
          }
        } else {
          console.warn("webhook checkout.session.completed: missing userId or plan", {
            userId,
            plan,
            sessionId: session.id,
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await resolveUserIdFromSubscription(sub);
        const plan = resolvePlanFromSubscription(sub);
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
        if (!userId) break;
        if (sub.status === "active" || sub.status === "trialing") {
          if (plan === "pro" || plan === "premium") {
            const priceId = priceIdFromSubscription(sub);
            const billing =
              sub.metadata?.billing === "yearly" || sub.metadata?.billing === "monthly"
                ? sub.metadata.billing
                : billingFromStripePriceId(priceId);
            const applied = await applyPaidPlan(
              userId,
              plan,
              billing,
              customerId,
              sub.id
            );
            if (!applied.ok) {
              console.error("webhook subscription.updated:", applied.error, { userId, plan });
              return NextResponse.json({ error: applied.error }, { status: 500 });
            }
          }
        } else if (
          sub.status === "canceled" ||
          sub.status === "unpaid" ||
          sub.status === "past_due" ||
          sub.status === "incomplete_expired"
        ) {
          const reverted = await revertToFree(userId);
          if (!reverted.ok) {
            return NextResponse.json({ error: reverted.error }, { status: 500 });
          }
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await resolveUserIdFromSubscription(sub);
        if (userId) {
          const reverted = await revertToFree(userId);
          if (!reverted.ok) {
            return NextResponse.json({ error: reverted.error }, { status: 500 });
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    console.error("webhook handler error:", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
