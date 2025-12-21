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
    newOwnerOperatorId?: string;
    reason?: string;
  };

  if (body.confirm !== true) {
    return NextResponse.json(
      { error: "Confirmation required" },
      { status: 400 }
    );
  }

  const newOwner = body.newOwnerOperatorId?.trim();
  if (!newOwner) {
    return NextResponse.json(
      { error: "newOwnerOperatorId is required" },
      { status: 400 }
    );
  }

  const incidentId = params.incidentId;

  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    select: { id: true, ownerOperatorId: true, createdByOperatorId: true }
  });

  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  const previousOwner = incident.ownerOperatorId ?? incident.createdByOperatorId ?? null;

  await prisma.incident.update({
    where: { id: incidentId },
    data: {
      ownerOperatorId: newOwner
    }
  });

  await prisma.auditLogEntry.create({
    data: {
      incidentId,
      operatorId: operator.id,
      operatorRole: operator.role,
      actionType: "OVERRIDE_OWNER",
      payloadSummary: {
        previousOwner,
        newOwner,
        reason: body.reason ?? null
      } as Prisma.InputJsonValue,
      success: true
    }
  });

  const created = await prisma.incidentEvent.create({
    data: {
      incidentId,
      type: "admin_override",
      payload: {
        operator,
        kind: "override_owner",
        previousOwner,
        newOwner,
        reason: body.reason ?? null
      } as Prisma.InputJsonValue,
      operatorId: operator.id,
      operatorRole: operator.role
    }
  });

  publishIncidentEvent({
    event: "admin_override" as any,
    incidentId,
    timestamp: created.timestamp.toISOString(),
    payload: created.payload
  });

  return NextResponse.json({ success: true });
}
