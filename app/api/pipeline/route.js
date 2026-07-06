import prisma from "@/lib/prisma";

const STAGE_ORDER = ["research", "supplier", "creative", "adlaunch", "store", "fulfillment"];

function toClient(row) {
  return {
    id: row.id,
    name: row.name,
    sellPrice: row.sellPrice,
    sourcingCost: row.sourcingCost,
    margin: row.margin,
    addedAt: row.addedAt.toISOString(),
    currentStage: row.currentStage,
    stages: JSON.parse(row.stages),
  };
}

// GET → return all pipeline items
export async function GET() {
  try {
    const rows = await prisma.pipelineItem.findMany({ orderBy: { addedAt: "desc" } });
    return Response.json({ items: rows.map(toClient) });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// POST → add item or update stage
export async function POST(req) {
  try {
    const body = await req.json();

    if (body.action === "add") {
      const p = body.product ?? {};
      const stages = {
        research:    { status: "done",    data: p,     completedAt: new Date().toISOString() },
        supplier:    { status: "pending", data: null },
        creative:    { status: "pending", data: null },
        adlaunch:    { status: "pending", data: null },
        store:       { status: "pending", data: null },
        fulfillment: { status: "pending", data: null },
      };
      const row = await prisma.pipelineItem.create({
        data: {
          name: p.name ?? "Untitled product",
          sellPrice: p.sellPrice ?? null,
          sourcingCost: p.sourcingCost ?? null,
          margin: p.margin ?? null,
          currentStage: "supplier",
          stages: JSON.stringify(stages),
        },
      });
      return Response.json({ item: toClient(row) });
    }

    if (body.action === "update") {
      const existing = await prisma.pipelineItem.findUnique({ where: { id: body.id } });
      if (!existing) return Response.json({ error: "Item not found" }, { status: 404 });

      const stages = JSON.parse(existing.stages);
      stages[body.stage] = {
        status: body.status,
        data: body.data ?? null,
        completedAt: body.status === "done" ? new Date().toISOString() : null,
      };

      let currentStage = existing.currentStage;
      const curr = STAGE_ORDER.indexOf(body.stage);
      if (body.status === "done" && curr < STAGE_ORDER.length - 1) currentStage = STAGE_ORDER[curr + 1];
      if (body.status === "done" && curr === STAGE_ORDER.length - 1) currentStage = "complete";

      const row = await prisma.pipelineItem.update({
        where: { id: body.id },
        data: { stages: JSON.stringify(stages), currentStage },
      });
      return Response.json({ item: toClient(row) });
    }

    if (body.action === "remove") {
      await prisma.pipelineItem.delete({ where: { id: body.id } }).catch(() => {});
      return Response.json({ success: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
