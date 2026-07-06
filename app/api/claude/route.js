import Anthropic from "@anthropic-ai/sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveCredentials } from "@/lib/integrations";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    const { apiKey } = await resolveCredentials(session?.user?.tenantId, "anthropic");
    if (!apiKey) return Response.json({ error: "ANTHROPIC_API_KEY not configured — add your Claude key in Settings" }, { status: 500 });

    const client = new Anthropic({ apiKey });
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
