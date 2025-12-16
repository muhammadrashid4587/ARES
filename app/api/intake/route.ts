import { NextResponse } from "next/server";
import { triageEmergency, type EmergencyType } from "../../../lib/triage";
import { buildResponsePlan } from "../../../lib/responsePlan";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    emergencyType: EmergencyType;
    location?: string;
  };

  console.log("/api/intake POST payload:", payload);

  const decision = triageEmergency({
    emergencyType: payload.emergencyType,
    location: payload.location
  });

  const incidentId = crypto.randomUUID();
  const responsePlan = buildResponsePlan(incidentId, decision);


  return NextResponse.json({
    success: true,
    incidentId,
    triage: {
      urgency: decision.urgency,
      dispatchDrone: decision.dispatchDrone,
      estimatedMinutesSaved: decision.estimatedMinutesSaved,
      bystanderInstructions: [...decision.bystanderInstructions]
    },
    responsePlan
  });
}
