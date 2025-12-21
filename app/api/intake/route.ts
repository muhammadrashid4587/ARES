import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { triageEmergency, type EmergencyType } from "../../../lib/triage";
import { buildResponsePlan } from "../../../lib/responsePlan";
import { prisma } from "../../../lib/db/prisma";
import { publishIncidentEvent } from "../../../lib/incidentStream";
import { executeAction, type ExecutionResult } from "../../../lib/executors";
import { canExecute, getOperatorFromRequest } from "../../../lib/auth/operator";


export const runtime = "nodejs";

export async function POST(request: Request) {
  const operator = getOperatorFromRequest(request);

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

  async function emit(type: string, payload: Prisma.InputJsonValue) {
    const created = await prisma.incidentEvent.create({
      data: {
        incidentId,
        type,
        payload,
        operatorId: operator.id,
        operatorRole: operator.role
      }
    });

    publishIncidentEvent({
      event: type as any,
      incidentId,
      timestamp: created.timestamp.toISOString(),
      payload: created.payload
    });
  }

  await prisma.incident.create({
    data: {
      id: incidentId,
      emergencyType: payload.emergencyType,
      location: payload.location ?? "",
      urgency: decision.urgency,
      dispatchDrone: decision.dispatchDrone,
      estimatedMinutesSaved: decision.estimatedMinutesSaved,
      bystanderInstructions: [...decision.bystanderInstructions],
      responsePlan,
      jobId: null,
      createdByOperatorId: operator.id,
      createdByRole: operator.role,
      ownerOperatorId: operator.id
    }
  });

  await emit("incident_created", {
    emergencyType: payload.emergencyType,
    location: payload.location ?? "",
    operator,
    triage: {
      urgency: decision.urgency,
      dispatchDrone: decision.dispatchDrone,
      estimatedMinutesSaved: decision.estimatedMinutesSaved
    }
  });
  
  const requestedExecute = payload.execute === true;
  const shouldExecute = requestedExecute && canExecute(operator.role);
  let execution: ReadonlyArray<ExecutionResult> | null = null;

  let jobId = null;

  if (requestedExecute && !shouldExecute) {
    await prisma.auditLogEntry.create({
      data: {
        incidentId,
        operatorId: operator.id,
        operatorRole: operator.role,
        actionType: "EXECUTION_REQUEST_DENIED",
        payloadSummary: {
          reason: "VIEWER cannot execute",
          requested: true
        },
        success: false
      }
    });

    await emit("execution_denied", {
      operator,
      reason: "VIEWER cannot execute"
    });
  }

  if (shouldExecute) {
    jobId = crypto.randomUUID();

    await prisma.incident.update({
      where: { id: incidentId },
      data: { jobId }
    });

    await prisma.auditLogEntry.create({
      data: {
        incidentId,
        operatorId: operator.id,
        operatorRole: operator.role,
        actionType: "EXECUTION_STARTED",
        payloadSummary: { jobId },
        success: true
      }
    });

    await emit("execution_started", { jobId, operator });

    // Execute asynchronously so clients can attach to the SSE stream immediately.
    void (async () => {
      try {
        for (const action of responsePlan.actions) {
          const latest = await prisma.incident.findUnique({
            where: { id: incidentId },
            select: { abortRequestedAt: true, abortRequestedBy: true }
          });

          if (latest?.abortRequestedAt) {
            await prisma.auditLogEntry.create({
              data: {
                incidentId,
                operatorId: operator.id,
                operatorRole: operator.role,
                actionType: "EXECUTION_ABORTED",
                payloadSummary: {
                  abortRequestedAt: latest.abortRequestedAt.toISOString(),
                  abortRequestedBy: latest.abortRequestedBy
                },
                success: false
              }
            });

            await emit("error", {
              operator,
              message: "Execution aborted by admin",
              abortRequestedBy: latest.abortRequestedBy
            });
            return;
          }

          const result = await executeAction(action);

          await prisma.executionEvent.create({
            data: {
              incidentId,
              actionType: result.actionType,
              success: result.success,
              message: result.message,
              executedAt: new Date(result.executedAt),
              operatorId: operator.id,
              operatorRole: operator.role
            }
          });

          await prisma.auditLogEntry.create({
            data: {
              incidentId,
              operatorId: operator.id,
              operatorRole: operator.role,
              actionType: result.actionType,
              payloadSummary: {
                message: result.message
              },
              success: result.success
            }
          });

          await emit("action_executed", {
            actionType: result.actionType,
            success: result.success,
            message: result.message,
            executedAt: result.executedAt,
            operator
          });
        }

        await prisma.auditLogEntry.create({
          data: {
            incidentId,
            operatorId: operator.id,
            operatorRole: operator.role,
            actionType: "EXECUTION_COMPLETED",
            payloadSummary: { jobId },
            success: true
          }
        });

        await emit("execution_completed", { jobId, operator });
      } catch (err: any) {
        await prisma.auditLogEntry.create({
          data: {
            incidentId,
            operatorId: operator.id,
            operatorRole: operator.role,
            actionType: "EXECUTION_ERROR",
            payloadSummary: { message: err?.message ?? "Unknown error" },
            success: false
          }
        });

        await emit("error", { operator, message: err?.message ?? "Unknown error" });
      }
    })();

    // Response returns immediately; execution results are available via SSE + DB.
    execution = null;
  }
  
  return NextResponse.json({
    success: true,
    incidentId,
    triage: {
      urgency: decision.urgency,
      dispatchDrone: decision.dispatchDrone,
      estimatedMinutesSaved: decision.estimatedMinutesSaved,
      bystanderInstructions: [...decision.bystanderInstructions]
    },
    responsePlan,
    jobId,
    execution
  });
  
  
  
}
