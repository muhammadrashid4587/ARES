import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db/prisma";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { incidentId: string } }
) {
  const incidentId = params.incidentId;

  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    select: { id: true }
  });

  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  const entries = await prisma.auditLogEntry.findMany({
    where: { incidentId },
    orderBy: { timestamp: "asc" }
  });

  return NextResponse.json({
    incidentId,
    audit: entries.map((e) => ({
      timestamp: e.timestamp.toISOString(),
      operatorId: e.operatorId,
      operatorRole: e.operatorRole,
      actionType: e.actionType,
      payloadSummary: e.payloadSummary,
      success: e.success
    }))
  });
}
