import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Not signed in" }, { status: 401 });

    const stripe = getStripe();
    if (!stripe) return Response.json({ error: "Billing isn't configured yet — the site owner needs to add STRIPE_SECRET_KEY." }, { status: 500 });

    const billing = await prisma.billing.findUnique({ where: { tenantId: session.user.tenantId } });
    if (!billing?.stripeCustomerId) return Response.json({ error: "No billing account found yet — subscribe first." }, { status: 400 });

    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: billing.stripeCustomerId,
      return_url: `${appUrl}/app`,
    });

    return Response.json({ url: portalSession.url });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
