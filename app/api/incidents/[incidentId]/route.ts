import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db/prisma";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { incidentId: string } }
) {
  const incident = await prisma.incident.findUnique({
    where: { id: params.incidentId },
    include: {
      executions: {
        orderBy: { executedAt: "asc" }
      }
    }
  });

  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  return NextResponse.json({
    incidentId: incident.id,
    executionResults:
      incident.executions.length === 0
        ? null
        : incident.executions.map((e) => ({
            actionType: e.actionType,
            success: e.success,
            message: e.message,
            executedAt: e.executedAt.toISOString()
          }))
  });
}

