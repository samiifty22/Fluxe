import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Note: kept dependency-free of lib/auth.js on purpose — that file pulls in
// the Prisma client, which doesn't run in the Edge middleware runtime.
export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const hasAccess =
    token.billingStatus === "active" ||
    token.billingStatus === "trialing" ||
    (token.trialEndsAt && new Date(token.trialEndsAt).getTime() > Date.now());

  if (!hasAccess) {
    const url = req.nextUrl.clone();
    url.pathname = "/billing";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
