import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantIntegration, setTenantIntegration, INTEGRATION_TYPES } from "@/lib/integrations";

function mask(value) {
  if (!value) return "";
  if (value.length <= 4) return "••••";
  return `${"•".repeat(Math.max(value.length - 4, 4))}${value.slice(-4)}`;
}

// GET → for each integration type, whether the tenant has their own value saved,
// whether a shared env-var fallback exists, and a masked preview (never the real value).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) return Response.json({ error: "Not signed in" }, { status: 401 });

  const result = {};
  for (const [type, def] of Object.entries(INTEGRATION_TYPES)) {
    const stored = await getTenantIntegration(session.user.tenantId, type);
    const fields = {};
    for (const [field, envVar] of Object.entries(def.fields)) {
      const own = stored?.[field] || "";
      fields[field] = {
        configured: !!own,
        preview: mask(own),
        envFallback: !own && !!process.env[envVar],
      };
    }
    result[type] = { label: def.label, fields };
  }
  return Response.json({ integrations: result });
}

// POST → save/update one integration's fields for the signed-in user's tenant.
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { type, fields } = await req.json();
  if (!INTEGRATION_TYPES[type]) return Response.json({ error: "Unknown integration type" }, { status: 400 });

  const existing = (await getTenantIntegration(session.user.tenantId, type)) || {};
  const merged = { ...existing };
  for (const field of Object.keys(INTEGRATION_TYPES[type].fields)) {
    if (typeof fields?.[field] === "string" && fields[field].trim() !== "") {
      merged[field] = fields[field].trim();
    }
  }
  await setTenantIntegration(session.user.tenantId, type, merged);
  return Response.json({ success: true });
}
