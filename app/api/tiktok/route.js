import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveCredentials } from "@/lib/integrations";

// ── TikTok Ads API ────────────────────────────────────────────────────────────
const BASE = "https://business-api.tiktok.com/open_api/v1.3";

async function creds() {
  const session = await getServerSession(authOptions);
  return resolveCredentials(session?.user?.tenantId, "tiktok");
}

async function tiktokPost(endpoint, body, accessToken) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.message ?? "TikTok API error");
  return data.data;
}

export async function POST(req) {
  try {
    const { campaign } = await req.json();
    const { accessToken, advertiserId } = await creds();

    if (!accessToken || !advertiserId) {
      return Response.json({
        success: true,
        source: "Simulated (add TikTok credentials in Settings to go live)",
        result: {
          campaignId: `sim_tt_camp_${Date.now()}`,
          adGroupId: `sim_tt_adgroup_${Date.now()}`,
          adId: `sim_tt_ad_${Date.now()}`,
          status: "DISABLE",
          message: "TikTok campaign config validated. Connect TikTok API to push live.",
        },
      });
    }

    // Step 1 — Create Campaign
    const campData = await tiktokPost("/campaign/create/", {
      advertiser_id: advertiserId,
      campaign_name: campaign.campaignName,
      objective_type: "PRODUCT_SALES",
      budget_mode: "BUDGET_MODE_INFINITE",
      operation_status: "DISABLE", // start disabled for safety
    }, accessToken);

    // Step 2 — Create Ad Group
    const adGroupData = await tiktokPost("/adgroup/create/", {
      advertiser_id: advertiserId,
      campaign_id: campData.campaign_id,
      adgroup_name: campaign.tiktok.adGroupName,
      placement_type: "PLACEMENT_TYPE_AUTOMATIC",
      budget_mode: "BUDGET_MODE_DAY",
      budget: campaign.tiktok.dailyBudget,
      schedule_type: "SCHEDULE_START_END",
      schedule_start_time: new Date().toISOString().split(".")[0],
      optimization_goal: "CONVERT",
      bid_type: "BID_TYPE_NO_BID",
      billing_event: "OCPM",
      targeting: {
        location_ids: ["6252001"], // United States
        age_groups: ["AGE_25_34", "AGE_35_44", "AGE_45_54"],
        languages: ["en"],
      },
      operation_status: "DISABLE",
    }, accessToken);

    return Response.json({
      success: true,
      source: "TikTok Ads API (Live)",
      result: {
        campaignId: campData.campaign_id,
        adGroupId: adGroupData.adgroup_id,
        status: "DISABLE",
        message: "TikTok campaign created. Review in TikTok Ads Manager before activating.",
      },
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { accessToken, advertiserId } = await creds();
    if (!accessToken) {
      return Response.json({ campaigns: MOCK_TT, source: "Mock" });
    }
    const res = await fetch(
      `${BASE}/campaign/get/?advertiser_id=${advertiserId}&fields=["campaign_id","campaign_name","operation_status","budget"]`,
      { headers: { "Access-Token": accessToken } }
    );
    const data = await res.json();
    return Response.json({ campaigns: data.data?.list ?? [], source: "TikTok (Live)" });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

const MOCK_TT = [
  { campaign_id: "tt1", campaign_name: "PetBottle – Dog Moms US", operation_status: "ENABLE", spend: "210", roas: "2.6" },
  { campaign_id: "tt2", campaign_name: "SpinSpice – Broad",       operation_status: "DISABLE", spend: "180", roas: "1.2" },
];
