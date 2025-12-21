import type { Operator } from "./auth/operator";

export type PresenceSnapshot = ReadonlyArray<Operator>;

type Registry = Map<string, Map<string, Operator>>; // incidentId -> operatorId -> Operator

const globalForAres = globalThis as typeof globalThis & {
  __aresIncidentPresence?: Registry;
};

function getRegistry(): Registry {
  if (!globalForAres.__aresIncidentPresence) {
    globalForAres.__aresIncidentPresence = new Map();
  }
  return globalForAres.__aresIncidentPresence;
}

export function joinIncidentPresence(
  incidentId: string,
  operator: Operator
): PresenceSnapshot {
  const registry = getRegistry();
  const map = registry.get(incidentId) ?? new Map<string, Operator>();
  map.set(operator.id, operator);
  registry.set(incidentId, map);
  return [...map.values()];
}

export function leaveIncidentPresence(
  incidentId: string,
  operatorId: string
): PresenceSnapshot {
  const registry = getRegistry();
  const map = registry.get(incidentId);
  if (!map) return [];

  map.delete(operatorId);
  if (map.size === 0) {
    registry.delete(incidentId);
    return [];
  }

  return [...map.values()];
}

export function getIncidentPresence(incidentId: string): PresenceSnapshot {
  const registry = getRegistry();
  const map = registry.get(incidentId);
  if (!map) return [];
  return [...map.values()];
}
