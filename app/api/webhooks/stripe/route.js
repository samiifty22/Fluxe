import { getStripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";

function planFromPriceId(priceId) {
  if (priceId === process.env.STRIPE_PRICE_YEARLY) return "yearly";
  if (priceId === process.env.STRIPE_PRICE_MONTHLY) return "monthly";
  return null;
}

async function syncSubscription(stripe, subscription) {
  const tenantId = subscription.metadata?.tenantId
    ?? (await stripe.customers.retrieve(subscription.customer)).metadata?.tenantId;
  if (!tenantId) return;

  const priceId = subscription.items?.data?.[0]?.price?.id;
  const plan = planFromPriceId(priceId);
  const status = subscription.status; // active | trialing | past_due | canceled | ...

  await prisma.billing.upsert({
    where: { tenantId },
    update: {
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: subscription.id,
      status,
      plan,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
    create: {
      tenantId,
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: subscription.id,
      status,
      plan,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  });

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { plan: status === "active" || status === "trialing" ? (plan ?? "monthly") : "expired" },
  });
}

export async function POST(req) {
  const stripe = getStripe();
  if (!stripe) return Response.json({ error: "Stripe not configured" }, { status: 500 });

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return Response.json({ error: `Webhook signature verification failed: ${e.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object;
        if (checkoutSession.subscription) {
          const subscription = await stripe.subscriptions.retrieve(checkoutSession.subscription);
          if (checkoutSession.client_reference_id && !subscription.metadata?.tenantId) {
            subscription.metadata = { ...subscription.metadata, tenantId: checkoutSession.client_reference_id };
          }
          await syncSubscription(stripe, subscription);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created":
      case "customer.subscription.deleted": {
        await syncSubscription(stripe, event.data.object);
        break;
      }
      default:
        break;
    }
    return Response.json({ received: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
