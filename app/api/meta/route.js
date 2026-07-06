import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveCredentials } from "@/lib/integrations";

// ── Meta Marketing API ────────────────────────────────────────────────────────
const BASE = "https://graph.facebook.com/v19.0";

async function creds() {
  const session = await getServerSession(authOptions);
  return resolveCredentials(session?.user?.tenantId, "meta");
}

async function metaPost(endpoint, body, accessToken) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, access_token: accessToken }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

export async function POST(req) {
  try {
    const { campaign } = await req.json();
    const { accessToken, adAccountId, pageId } = await creds();

    if (!accessToken || !adAccountId) {
      return Response.json({
        success: true,
        source: "Simulated (add Meta credentials in Settings to go live)",
        result: {
          campaignId: `sim_camp_${Date.now()}`,
          adSetId: `sim_adset_${Date.now()}`,
          adId: `sim_ad_${Date.now()}`,
          status: "PAUSED",
          message: "Campaign config validated. Connect Meta API to push live.",
        },
      });
    }

    // Step 1 — Create Campaign
    const campRes = await metaPost(`/${adAccountId}/campaigns`, {
      name: campaign.campaignName,
      objective: "OUTCOME_SALES",
      status: "PAUSED", // start paused for safety
      special_ad_categories: [],
    }, accessToken);

    // Step 2 — Create Ad Set
    const adSetRes = await metaPost(`/${adAccountId}/adsets`, {
      name: campaign.meta.adSetName,
      campaign_id: campRes.id,
      billing_event: "IMPRESSIONS",
      optimization_goal: "OFFSITE_CONVERSIONS",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      daily_budget: (campaign.meta.dailyBudget * 100).toString(), // in cents
      targeting: {
        geo_locations: { countries: ["US"] },
        age_min: 25,
        age_max: 55,
        facebook_positions: ["feed", "instagram_stream"],
      },
      status: "PAUSED",
    }, accessToken);

    // Step 3 — Create Ad Creative + Ad (first copy only for now)
    const adCopy = campaign.meta.adCopies?.[0];
    const creativeRes = await metaPost(`/${adAccountId}/adcreatives`, {
      name: `${campaign.campaignName} - Creative 1`,
      object_story_spec: {
        page_id: pageId,
        link_data: {
          message: adCopy?.primaryText ?? "",
          link: process.env.NEXT_PUBLIC_APP_URL ?? "https://example.com",
          name: adCopy?.headline ?? "",
          description: adCopy?.description ?? "",
          call_to_action: { type: "SHOP_NOW" },
        },
      },
    }, accessToken);

    const adRes = await metaPost(`/${adAccountId}/ads`, {
      name: `${campaign.campaignName} - Ad 1`,
      adset_id: adSetRes.id,
      creative: { creative_id: creativeRes.id },
      status: "PAUSED",
    }, accessToken);

    return Response.json({
      success: true,
      source: "Meta Marketing API (Live)",
      result: {
        campaignId: campRes.id,
        adSetId: adSetRes.id,
        adId: adRes.id,
        status: "PAUSED",
        message: "Campaign created and paused. Review in Meta Ads Manager before activating.",
      },
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// GET → fetch campaign performance
export async function GET() {
  try {
    const { accessToken, adAccountId } = await creds();
    if (!accessToken || !adAccountId) {
      return Response.json({ campaigns: MOCK_META_CAMPAIGNS, source: "Mock" });
    }
    const res = await fetch(
      `${BASE}/${adAccountId}/campaigns?fields=id,name,status,insights{spend,cpm,ctr,actions}&access_token=${accessToken}`
    );
    const data = await res.json();
    return Response.json({ campaigns: data.data ?? [], source: "Meta (Live)" });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

const MOCK_META_CAMPAIGNS = [
  { id: "123", name: "SpinSpice – Kitchen Lovers", status: "ACTIVE",  spend: "340", roas: "3.1", ctr: "1.8%" },
  { id: "456", name: "PetBottle – Pet Parents",    status: "ACTIVE",  spend: "510", roas: "2.9", ctr: "1.5%" },
  { id: "789", name: "SpinSpice – Broad",          status: "PAUSED",  spend: "180", roas: "1.2", ctr: "0.6%" },
];
