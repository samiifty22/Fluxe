import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { provisionTenantForUser } from "@/lib/provisionTenant";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user?.password) return null;
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  events: {
    // Fires once, the first time a user signs in via an *adapter-managed* provider
    // (Google). Email/password sign-up provisions the tenant directly in the signup route.
    async createUser({ user }) {
      await provisionTenantForUser(user.id, user.email);
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      const email = user?.email ?? token.email;
      if (!email) return token;
      const dbUser = await prisma.user.findUnique({
        where: { email },
        include: { tenant: { include: { billing: true } } },
      });
      if (dbUser) {
        token.userId = dbUser.id;
        token.role = dbUser.role;
        token.tenantId = dbUser.tenantId;
        token.plan = dbUser.tenant?.plan ?? "trial";
        token.trialEndsAt = dbUser.tenant?.trialEndsAt ? dbUser.tenant.trialEndsAt.toISOString() : null;
        token.billingStatus = dbUser.tenant?.billing?.status ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.tenantId = token.tenantId;
        session.user.plan = token.plan;
        session.user.trialEndsAt = token.trialEndsAt;
        session.user.billingStatus = token.billingStatus;
      }
      return session;
    },
  },
};

// True while the tenant's trial hasn't expired yet, or it has an active/trialing paid subscription.
export function hasActiveAccess(user) {
  if (!user) return false;
  if (user.billingStatus === "active" || user.billingStatus === "trialing") return true;
  if (user.trialEndsAt && new Date(user.trialEndsAt).getTime() > Date.now()) return true;
  return false;
}
