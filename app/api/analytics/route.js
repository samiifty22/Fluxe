// ── Analytics — Meta Insights + TikTok Analytics ─────────────────────────────
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "7d";

  const metaData   = await fetchMeta(range);
  const tiktokData = await fetchTikTok(range);

  // Merge into unified analytics
  const totalSpend   = metaData.spend   + tiktokData.spend;
  const totalRevenue = metaData.revenue + tiktokData.revenue;
  const totalOrders  = metaData.orders  + tiktokData.orders;
  const avgRoas      = totalSpend > 0 ? +(totalRevenue / totalSpend).toFixed(2) : 0;

  return Response.json({
    summary: { totalSpend, totalRevenue, totalOrders, avgRoas, avgCac: totalOrders > 0 ? +(totalSpend / totalOrders).toFixed(2) : 0 },
    meta:    metaData,
    tiktok:  tiktokData,
    daily:   mergeDailyData(metaData.daily, tiktokData.daily),
    source:  `${metaData.source} · ${tiktokData.source}`,
  });
}

async function fetchMeta(range) {
  if (!process.env.META_ACCESS_TOKEN) return { ...MOCK_META, daily: mockDaily(MOCK_META.spend, MOCK_META.revenue), source: "Mock (add META_ACCESS_TOKEN)" };
  try {
    const adAccountId = process.env.META_AD_ACCOUNT_ID;
    const datePreset  = range === "7d" ? "last_7d" : range === "30d" ? "last_30d" : "last_7d";
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${adAccountId}/insights?fields=spend,actions,ctr&time_increment=1&date_preset=${datePreset}&access_token=${process.env.META_ACCESS_TOKEN}`
    );
    const data = await res.json();
    const rows = data.data ?? [];
    const daily = rows.map(r => {
      const purchases = r.actions?.find(a => a.action_type === "purchase");
      return { date: r.date_start, spend: parseFloat(r.spend ?? 0), revenue: parseFloat(purchases?.value ?? 0), orders: parseInt(purchases?.value ?? 0) };
    });
    const spend   = daily.reduce((s, r) => s + r.spend, 0);
    const revenue = daily.reduce((s, r) => s + r.revenue, 0);
    const orders  = daily.reduce((s, r) => s + r.orders, 0);
    const lastCtr = rows[rows.length - 1]?.ctr ?? "0%";
    return { spend, revenue, orders, roas: spend > 0 ? +(revenue / spend).toFixed(2) : 0, ctr: lastCtr, daily, source: "Meta Insights (Live)" };
  } catch {
    return { ...MOCK_META, daily: mockDaily(MOCK_META.spend, MOCK_META.revenue), source: "Mock (Meta API error)" };
  }
}

async function fetchTikTok(range) {
  if (!process.env.TIKTOK_ACCESS_TOKEN) return { ...MOCK_TT, daily: mockDaily(MOCK_TT.spend, MOCK_TT.revenue), source: "Mock (add TIKTOK_ACCESS_TOKEN)" };
  try {
    const end   = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - (range === "7d" ? 7 : 30) * 86400000).toISOString().split("T")[0];
    const res   = await fetch(
      `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?advertiser_id=${process.env.TIKTOK_ADVERTISER_ID}&report_type=BASIC&data_level=AUCTION_ADVERTISER&dimensions=["stat_time_day"]&metrics=["spend","total_purchase_value","total_complete_purchase_count","ctr"]&start_date=${start}&end_date=${end}&page_size=30`,
      { headers: { "Access-Token": process.env.TIKTOK_ACCESS_TOKEN } }
    );
    const data = await res.json();
    const rows = data.data?.list ?? [];
    const daily = rows.map(r => ({
      date: r.dimensions?.stat_time_day,
      spend: parseFloat(r.metrics?.spend ?? 0),
      revenue: parseFloat(r.metrics?.total_purchase_value ?? 0),
      orders: parseInt(r.metrics?.total_complete_purchase_count ?? 0),
    }));
    const spend   = daily.reduce((s, r) => s + r.spend, 0);
    const revenue = daily.reduce((s, r) => s + r.revenue, 0);
    const orders  = daily.reduce((s, r) => s + r.orders, 0);
    return { spend, revenue, orders, roas: spend > 0 ? +(revenue / spend).toFixed(2) : 0, daily, source: "TikTok Analytics (Live)" };
  } catch {
    return { ...MOCK_TT, daily: mockDaily(MOCK_TT.spend, MOCK_TT.revenue), source: "Mock (TikTok API error)" };
  }
}

// Spreads a mock total evenly across the last 7 real calendar dates so the
// daily chart is at least internally consistent with the summary numbers
// shown alongside it (instead of an unrelated fixed array).
function mockDaily(totalSpend, totalRevenue) {
  const days = 7;
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
    out.push({ date, spend: +(totalSpend / days).toFixed(2), revenue: +(totalRevenue / days).toFixed(2), orders: 0 });
  }
  return out;
}

function mergeDailyData(metaDaily, ttDaily) {
  const byDate = new Map();
  for (const r of metaDaily ?? []) {
    if (!r.date) continue;
    const e = byDate.get(r.date) ?? { date: r.date, metaSpend: 0, metaRevenue: 0, ttSpend: 0, ttRevenue: 0 };
    e.metaSpend += r.spend; e.metaRevenue += r.revenue;
    byDate.set(r.date, e);
  }
  for (const r of ttDaily ?? []) {
    if (!r.date) continue;
    const e = byDate.get(r.date) ?? { date: r.date, metaSpend: 0, metaRevenue: 0, ttSpend: 0, ttRevenue: 0 };
    e.ttSpend += r.spend; e.ttRevenue += r.revenue;
    byDate.set(r.date, e);
  }
  return [...byDate.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => ({
      d: new Date(e.date).toLocaleDateString("en-US", { weekday: "short" }),
      meta: e.metaSpend > 0 ? +(e.metaRevenue / e.metaSpend).toFixed(2) : 0,
      tt: e.ttSpend > 0 ? +(e.ttRevenue / e.ttSpend).toFixed(2) : 0,
      rev: Math.round(e.metaRevenue + e.ttRevenue),
      spend: Math.round(e.metaSpend + e.ttSpend),
    }));
}

const MOCK_META = { spend: 1750, revenue: 5250, orders: 138, roas: 3.0, ctr: "1.8%" };
const MOCK_TT   = { spend: 1230, revenue: 3200, orders: 107, roas: 2.6, ctr: "2.2%" };
