import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db/prisma";

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

export async function GET() {
  const incidents = await prisma.incident.findMany({
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

  const rows = incidents
    .map((i) => {
      const latestType = i.events[0]?.type ?? null;
      const status = statusFromLatestEventType(latestType);
      const isActive = status === "pending" || status === "executing";

      return {
        incidentId: i.id,
        emergencyType: i.emergencyType,
        location: i.location,
        status,
        createdAt: i.createdAt.toISOString(),
        isActive
      };
    })
    .sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .map(({ isActive, ...rest }) => rest);

  return NextResponse.json({ incidents: rows });
}
