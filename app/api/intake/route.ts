import { NextResponse } from "next/server";
import { triageEmergency, type EmergencyType } from "../../../lib/triage";
import { buildResponsePlan } from "../../../lib/responsePlan";
import { executeResponsePlan } from "../../../lib/executors/executeResponsePlan";


export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    emergencyType: EmergencyType;
    location?: string;
    execute?: boolean;
  };



  console.log("/api/intake POST payload:", payload);

  const decision = triageEmergency({
    emergencyType: payload.emergencyType,
    location: payload.location
  });

  const incidentId = crypto.randomUUID();
  const responsePlan = buildResponsePlan(incidentId, decision);
  
  const shouldExecute = payload.execute === true;
  let executionResults = null;

  if (shouldExecute) {
    executionResults = await executeResponsePlan(responsePlan);
  }

  return NextResponse.json({
    success: true,
    incidentId,
    triage: {
      urgency: decision.urgency,
      dispatchDrone: decision.dispatchDrone,
      estimatedMinutesSaved: decision.estimatedMinutesSaved,
      bystanderInstructions: [...decision.bystanderInstructions],
    },
    responsePlan,
    execution: executionResults, // ← THIS LINE WAS MISSING
  });
  
  
}
