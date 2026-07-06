import prisma from "@/lib/prisma";
import { TRIAL_DAYS } from "@/lib/plans";

// Gives a brand-new user their own tenant + a free trial. Shared by both the
// Google OAuth sign-up path (NextAuth's createUser event) and email/password sign-up.
export async function provisionTenantForUser(userId, email) {
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 86400000);
  const tenant = await prisma.tenant.create({
    data: { name: email, ownerId: userId, plan: "trial", trialEndsAt },
  });
  await prisma.user.update({ where: { id: userId }, data: { tenantId: tenant.id, role: "owner" } });
  return tenant;
}
