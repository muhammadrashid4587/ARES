import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db/prisma";

export const runtime = "nodejs";

type IncidentStatus = "pending" | "executing" | "completed" | "failed";

function statusFromLatestEventType(latestType: string | null): IncidentStatus {
  switch (latestType) {
    case "execution_completed":
      return "completed";
    case "error":
      return "failed";
    case "execution_started":
    case "action_executed":
      return "executing";
    case "incident_created":
    default:
      return "pending";
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { incidentId: string } }
) {
  const incident = await prisma.incident.findUnique({
    where: { id: params.incidentId },
    select: {
      id: true,
      emergencyType: true,
      location: true,
      createdAt: true,
      events: {
        orderBy: { timestamp: "desc" },
        take: 1,
        select: { type: true }
      }
    }
  });

  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  const latestType = incident.events[0]?.type ?? null;
  const status = statusFromLatestEventType(latestType);

  return NextResponse.json({
    incidentId: incident.id,
    emergencyType: incident.emergencyType,
    location: incident.location,
    status,
    createdAt: incident.createdAt.toISOString()
  });
}
