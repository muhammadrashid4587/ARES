import { prisma } from "../../../../../lib/db/prisma";
import {
  formatSse,
  publishIncidentEvent,
  subscribeToIncident,
  type IncidentSseEvent
} from "../../../../../lib/incidentStream";
import { getOperatorFromRequest } from "../../../../../lib/auth/operator";
import {
  getIncidentPresence,
  joinIncidentPresence,
  leaveIncidentPresence
} from "../../../../../lib/incidentPresence";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { incidentId: string } }
) {
  const incidentId = params.incidentId;
  const operator = getOperatorFromRequest(request);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (event: IncidentSseEvent) => {
        controller.enqueue(encoder.encode(formatSse(event)));
      };

      // Replay existing events from DB first (late join support)
      const existing = await prisma.incidentEvent.findMany({
        where: { incidentId },
        orderBy: { timestamp: "asc" }
      });

      for (const e of existing) {
        send({
          event: e.type as IncidentSseEvent["event"],
          incidentId: e.incidentId,
          timestamp: e.timestamp.toISOString(),
          payload: e.payload
        });
      }

      const last = existing.length > 0 ? existing[existing.length - 1] : null;
      if (last && (last.type === "execution_completed" || last.type === "error")) {
        controller.close();
        return;
      }

      // Presence: join (ephemeral, not persisted)
      const activeAfterJoin = joinIncidentPresence(incidentId, operator);
      const joinedEvent: IncidentSseEvent = {
        event: "operator_joined",
        incidentId,
        timestamp: new Date().toISOString(),
        payload: {
          operator,
          activeOperators: activeAfterJoin
        }
      };
      publishIncidentEvent(joinedEvent);
      // Also send directly to this subscriber immediately
      send(joinedEvent);

      const unsubscribe = subscribeToIncident(incidentId, {
        enqueue: (event) => {
          send(event);

          if (event.event === "execution_completed" || event.event === "error") {
            try {
              controller.close();
            } finally {
              unsubscribe();
            }
          }
        }
      });

      // Clean up on client disconnect
      request.signal.addEventListener("abort", () => {
        try {
          unsubscribe();
        } finally {
          const activeAfterLeave = leaveIncidentPresence(incidentId, operator.id);
          const leftEvent: IncidentSseEvent = {
            event: "operator_left",
            incidentId,
            timestamp: new Date().toISOString(),
            payload: {
              operator,
              activeOperators: activeAfterLeave
            }
          };
          publishIncidentEvent(leftEvent);

          try {
            controller.close();
          } catch {
            // ignore
          }
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  });
}
