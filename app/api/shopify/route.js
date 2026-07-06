// ── Shopify Store Manager API ─────────────────────────────────────────────────
const SHOPIFY_URL = () => `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-01`;
const SHOPIFY_HEADERS = () => ({
  "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
  "Content-Type": "application/json",
});

// GET → list all products
export async function GET() {
  try {
    if (!process.env.SHOPIFY_ACCESS_TOKEN) {
      return Response.json({ products: MOCK_PRODUCTS, source: "Mock (add SHOPIFY_ACCESS_TOKEN)" });
    }
    const res = await fetch(`${SHOPIFY_URL()}/products.json?limit=50`, { headers: SHOPIFY_HEADERS() });
    const data = await res.json();
    const products = (data.products ?? []).map(p => ({
      id: p.id,
      name: p.title,
      sku: p.variants[0]?.sku ?? "—",
      vars: p.variants.length,
      price: parseFloat(p.variants[0]?.price ?? 0),
      stock: p.variants.reduce((s, v) => s + (v.inventory_quantity ?? 0), 0),
      status: p.status,
      handle: p.handle,
    }));
    return Response.json({ products, source: "Shopify (Live)" });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// POST → create a new product listing
export async function POST(req) {
  try {
    const { name, description, price, comparePrice, images, variants, tags } = await req.json();

    if (!process.env.SHOPIFY_ACCESS_TOKEN) {
      // Simulate success in dev mode
      return Response.json({
        product: { id: `mock_${Date.now()}`, name, price, status: "active", handle: name.toLowerCase().replace(/\s+/g, "-") },
        source: "Simulated (add SHOPIFY_ACCESS_TOKEN to go live)",
      });
    }

    const body = {
      product: {
        title: name,
        body_html: description,
        tags: tags ?? "",
        variants: variants ?? [{ price: String(price), compare_at_price: String(comparePrice ?? ""), inventory_management: "shopify", inventory_quantity: 100 }],
        images: images?.map(src => ({ src })) ?? [],
        status: "active",
      },
    };

    const res = await fetch(`${SHOPIFY_URL()}/products.json`, {
      method: "POST",
      headers: SHOPIFY_HEADERS(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.errors) throw new Error(JSON.stringify(data.errors));

    return Response.json({ product: data.product, source: "Shopify (Live)" });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

const MOCK_PRODUCTS = [
  { id: 1, name: "SpinSpice 360° Rotating Spice Rack", sku: "SPN-001", vars: 3, price: 39, stock: 142, status: "active" },
  { id: 2, name: "Pet Water Bottle – Portable Travel",  sku: "PET-002", vars: 4, price: 28, stock: 280, status: "active" },
  { id: 3, name: "Sunset Glow Lamp",                   sku: "SGL-003", vars: 2, price: 34, stock: 67,  status: "active" },
  { id: 4, name: "Portable Mini Blender",              sku: "BLD-004", vars: 1, price: 44, stock: 38,  status: "draft"  },
  { id: 5, name: "3-in-1 Wireless Charging Dock",      sku: "CHG-005", vars: 2, price: 52, stock: 91,  status: "active" },
];
