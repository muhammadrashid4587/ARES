import { NextResponse } from "next/server";

import type { Prisma } from "@prisma/client";
import { prisma } from "../../../../../../lib/db/prisma";
import { canOverride, getOperatorFromRequest } from "../../../../../../lib/auth/operator";
import { publishIncidentEvent } from "../../../../../../lib/incidentStream";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: { incidentId: string } }
) {
  const operator = getOperatorFromRequest(request);
  if (!canOverride(operator.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    confirm?: boolean;
    reason?: string;
  };

  if (body.confirm !== true) {
    return NextResponse.json(
      { error: "Confirmation required" },
      { status: 400 }
    );
  }

  const incidentId = params.incidentId;

  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    select: { id: true }
  });

  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  const now = new Date();

  await prisma.incident.update({
    where: { id: incidentId },
    data: {
      abortRequestedAt: now,
      abortRequestedBy: operator.id
    }
  });

  await prisma.auditLogEntry.create({
    data: {
      incidentId,
      operatorId: operator.id,
      operatorRole: operator.role,
      actionType: "ABORT_REQUESTED",
      payloadSummary: {
        reason: body.reason ?? null
      } as Prisma.InputJsonValue,
      success: true
    }
  });

  const created = await prisma.incidentEvent.create({
    data: {
      incidentId,
      type: "abort_requested",
      payload: {
        operator,
        reason: body.reason ?? null
      } as Prisma.InputJsonValue,
      operatorId: operator.id,
      operatorRole: operator.role
    }
  });

  publishIncidentEvent({
    event: "abort_requested" as any,
    incidentId,
    timestamp: created.timestamp.toISOString(),
    payload: created.payload
  });

  return NextResponse.json({ success: true });
}
