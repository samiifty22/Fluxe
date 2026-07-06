export async function GET() {
  try {
    const anthropic = !!process.env.ANTHROPIC_API_KEY;
    const cj = !!(process.env.CJ_API_KEY && process.env.CJ_EMAIL);
    const stripe = !!(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

    return Response.json({
      status: "ok",
      integrations: {
        anthropic: anthropic ? "configured" : "missing",
        cj: cj ? "configured" : "missing",
        stripe: stripe ? "configured" : "missing",
      },
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
