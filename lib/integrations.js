import crypto from "crypto";
import prisma from "@/lib/prisma";

function getKey() {
  const raw = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!raw) throw new Error("INTEGRATIONS_ENCRYPTION_KEY is not set");
  return crypto.createHash("sha256").update(raw).digest();
}

function encrypt(fields) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(fields), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

function decrypt(stored) {
  const [ivB64, tagB64, dataB64] = stored.split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return JSON.parse(dec.toString("utf8"));
}

// Every integration's field list — drives both the Settings form and env-var fallback names.
export const INTEGRATION_TYPES = {
  anthropic: { label: "Anthropic (Claude)", fields: { apiKey: "ANTHROPIC_API_KEY" } },
  shopify:   { label: "Shopify",            fields: { accessToken: "SHOPIFY_ACCESS_TOKEN", storeDomain: "SHOPIFY_STORE_DOMAIN" } },
  meta:      { label: "Meta Ads",           fields: { accessToken: "META_ACCESS_TOKEN", adAccountId: "META_AD_ACCOUNT_ID", pageId: "META_PAGE_ID" } },
  tiktok:    { label: "TikTok Ads",         fields: { accessToken: "TIKTOK_ACCESS_TOKEN", advertiserId: "TIKTOK_ADVERTISER_ID" } },
  cj:        { label: "CJ Dropshipping",    fields: { apiKey: "CJ_API_KEY", email: "CJ_EMAIL" } },
  shipbob:   { label: "ShipBob",            fields: { token: "SHIPBOB_TOKEN" } },
};

export async function getTenantIntegration(tenantId, type) {
  if (!tenantId) return null;
  const row = await prisma.integration.findFirst({ where: { tenantId, type } });
  if (!row) return null;
  try { return decrypt(row.config); } catch { return null; }
}

export async function setTenantIntegration(tenantId, type, fields) {
  const config = encrypt(fields);
  const existing = await prisma.integration.findFirst({ where: { tenantId, type } });
  if (existing) return prisma.integration.update({ where: { id: existing.id }, data: { config } });
  return prisma.integration.create({ data: { tenantId, type, config } });
}

// Resolves credentials for a route: tenant's own saved values win, env vars are the fallback
// (so the app keeps working in mock/shared mode for anyone who hasn't configured their own yet).
export async function resolveCredentials(tenantId, type) {
  const def = INTEGRATION_TYPES[type];
  const stored = await getTenantIntegration(tenantId, type);
  const result = {};
  for (const [field, envVar] of Object.entries(def.fields)) {
    result[field] = (stored?.[field] || process.env[envVar] || "").trim();
  }
  return result;
}
