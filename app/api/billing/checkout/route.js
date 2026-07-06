import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { PLANS } from "@/lib/plans";
import prisma from "@/lib/prisma";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Not signed in" }, { status: 401 });

    const stripe = getStripe();
    if (!stripe) return Response.json({ error: "Billing isn't configured yet — the site owner needs to add STRIPE_SECRET_KEY." }, { status: 500 });

    const { plan } = await req.json();
    const planDef = PLANS[plan];
    if (!planDef) return Response.json({ error: "Unknown plan" }, { status: 400 });
    const priceId = process.env[planDef.priceEnvVar];
    if (!priceId) return Response.json({ error: `Billing isn't configured yet — missing ${planDef.priceEnvVar}.` }, { status: 500 });

    const tenantId = session.user.tenantId;
    const billing = await prisma.billing.findUnique({ where: { tenantId } });

    let customerId = billing?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: session.user.email, metadata: { tenantId } });
      customerId = customer.id;
      await prisma.billing.upsert({
        where: { tenantId },
        update: { stripeCustomerId: customerId },
        create: { tenantId, stripeCustomerId: customerId },
      });
    }

    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: tenantId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { tenantId, plan },
      success_url: `${appUrl}/app?checkout=success`,
      cancel_url: `${appUrl}/billing?checkout=cancelled`,
    });

    return Response.json({ url: checkoutSession.url });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
