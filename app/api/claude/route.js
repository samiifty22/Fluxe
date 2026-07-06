import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    const { prompt, system } = await req.json();
    const msg = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      ...(system ? { system } : {}),
      messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content.map(b => b.text ?? "").join("").trim();
    if (msg.stop_reason === "max_tokens") {
      return Response.json({ error: "Claude's response was cut off (too long for the token limit). Try a smaller request or raise max_tokens." }, { status: 502 });
    }
    return Response.json({ text });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
