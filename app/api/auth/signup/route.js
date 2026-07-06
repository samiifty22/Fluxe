import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { provisionTenantForUser } from "@/lib/provisionTenant";

export async function POST(req) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return Response.json({ error: "An account with that email already exists — try signing in instead." }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, name: name || null, password: hashed } });
    await provisionTenantForUser(user.id, email);

    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
