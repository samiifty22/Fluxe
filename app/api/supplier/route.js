import Anthropic from "@anthropic-ai/sdk";

// ── Real CJ Dropshipping API ──────────────────────────────────────────────────
async function searchCJ(keyword) {
  // Step 1: Get CJ access token
  const authRes = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.CJ_EMAIL, password: process.env.CJ_API_KEY }),
  });
  const auth = await authRes.json();
  if (!auth.data?.accessToken) throw new Error("CJ auth failed");
  const token = auth.data.accessToken;

  // Step 2: Search products
  const res = await fetch(`https://developers.cjdropshipping.com/api2.0/v1/product/query?productNameEn=${encodeURIComponent(keyword)}&pageNum=1&pageSize=5`, {
    headers: { "CJ-Access-Token": token },
  });
  const data = await res.json();
  return (data.data?.list ?? []).map(p => ({
    name: p.productNameEn,
    price: parseFloat(p.sellPrice),
    stock: p.productStock ?? 999,
    ship: p.productWeight < 0.5 ? "3–5 days (US)" : "5–8 days",
    moq: 1,
    rating: 4.6,
    badge: p.countryCode === "US" ? "🇺🇸 US Stock" : "🏭 Factory",
    imageUrl: p.productImage,
    cjId: p.pid,
  }));
}

// AI models occasionally emit near-valid JSON (trailing decimal points like "39.",
// trailing commas, or stray prose/code fences around the array) — repair before parsing.
function parseAIJson(raw) {
  let s = String(raw ?? "").trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = s.search(/[[{]/);
  const open = s[start];
  const close = open === "[" ? "]" : "}";
  const end = s.lastIndexOf(close);
  if (start === -1 || end === -1 || end < start) throw new Error("No JSON found in AI response");
  s = s.slice(start, end + 1);
  s = s.replace(/(\d)\.(?=\s*[,\]}])/g, "$1.0").replace(/,\s*([\]}])/g, "$1");
  return JSON.parse(s);
}

// ── Claude Fallback ──────────────────────────────────────────────────────────
async function searchWithClaude(keyword) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: `You are a dropshipping supplier database. Generate realistic supplier data for: "${keyword}"
Return ONLY a JSON array of 4 suppliers. No preamble.
[{"name":"","price":0,"stock":0,"ship":"","moq":1,"rating":0,"badge":"🇺🇸 US Stock or 🏭 Factory","sellPrice":0}]
Make prices realistic (sourcing $5–20). Include 2 US warehouse and 2 factory suppliers.`,
    }],
  });
  const text = msg.content.map(b => b.text ?? "").join("").trim();
  if (msg.stop_reason === "max_tokens") throw new Error("Claude's response was cut off (too long for the token limit)");
  return parseAIJson(text);
}

export async function POST(req) {
  try {
    const { keyword } = await req.json();
    let suppliers, source;

    if (process.env.CJ_API_KEY && process.env.CJ_EMAIL) {
      try {
        suppliers = await searchCJ(keyword);
        source = "CJ Dropshipping (Live)";
      } catch (e) {
        suppliers = await searchWithClaude(keyword);
        source = "AI Generated (add CJ_API_KEY for live data)";
      }
    } else {
      suppliers = await searchWithClaude(keyword);
      source = "AI Generated (add CJ_API_KEY for live data)";
    }

    return Response.json({ suppliers, source });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
