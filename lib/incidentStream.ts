export type IncidentSseEventName =
  | "incident_created"
  | "execution_started"
  | "action_executed"
  | "execution_completed"
  | "error"
  | "execution_denied"
  | "operator_joined"
  | "operator_left"
  | "admin_override"
  | "abort_requested"
  | "force_escalation";

export type IncidentSseEvent = Readonly<{
  event: IncidentSseEventName;
  incidentId: string;
  timestamp: string;
  payload: unknown;
}>;

type Subscriber = Readonly<{
  enqueue: (event: IncidentSseEvent) => void;
}>;

type Registry = Map<string, Set<Subscriber>>;

const globalForAres = globalThis as typeof globalThis & {
  __aresIncidentStream?: Registry;
};

function getRegistry(): Registry {
  if (!globalForAres.__aresIncidentStream) {
    globalForAres.__aresIncidentStream = new Map();
  }
  return globalForAres.__aresIncidentStream;
}

export function subscribeToIncident(
  incidentId: string,
  subscriber: Subscriber
): () => void {
  const registry = getRegistry();
  const set = registry.get(incidentId) ?? new Set<Subscriber>();
  set.add(subscriber);
  registry.set(incidentId, set);

  return () => {
    const current = registry.get(incidentId);
    if (!current) return;
    current.delete(subscriber);
    if (current.size === 0) {
      registry.delete(incidentId);
    }
  };
}

export function publishIncidentEvent(event: IncidentSseEvent): void {
  const registry = getRegistry();
  const subs = registry.get(event.incidentId);
  if (!subs || subs.size === 0) return;

  for (const sub of subs) {
    try {
      sub.enqueue(event);
    } catch {
      // If a subscriber throws, ignore it (it will typically be cleaned up on disconnect).
    }
  }
}

export function formatSse(event: IncidentSseEvent): string {
  return `event: ${event.event}\n` + `data: ${JSON.stringify(event)}\n\n`;
}
