"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type IncidentStreamEventName =
  | "incident_created"
  | "execution_started"
  | "action_executed"
  | "execution_completed"
  | "execution_denied"
  | "operator_joined"
  | "operator_left"
  | "admin_override"
  | "abort_requested"
  | "force_escalation"
  | "error";

export type IncidentStreamEvent = Readonly<{
  event: IncidentStreamEventName;
  incidentId: string;
  timestamp: string;
  payload: unknown;
}>;

type UseIncidentStreamState = Readonly<{
  events: ReadonlyArray<IncidentStreamEvent>;
  connectionStatus: "connecting" | "open" | "reconnecting" | "closed";
}>;

function toKey(e: IncidentStreamEvent): string {
  return `${e.event}|${e.incidentId}|${e.timestamp}|${JSON.stringify(e.payload)}`;
}

function isTerminal(e: IncidentStreamEvent): boolean {
  return e.event === "execution_completed" || e.event === "error";
}

export function useIncidentStream(incidentId: string | undefined): UseIncidentStreamState {
  const [events, setEvents] = useState<ReadonlyArray<IncidentStreamEvent>>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    UseIncidentStreamState["connectionStatus"]
  >(incidentId ? "connecting" : "closed");

  const seen = useRef<Set<string>>(new Set());
  const sourceRef = useRef<EventSource | null>(null);
  const retryRef = useRef<number | null>(null);
  const terminalRef = useRef<boolean>(false);

  useEffect(() => {
    // reset whenever incident changes
    setEvents([]);
    setConnectionStatus(incidentId ? "connecting" : "closed");
    seen.current = new Set();
    terminalRef.current = false;

    if (!incidentId) return;

    const url = `/api/incidents/${encodeURIComponent(incidentId)}/stream`;

    function cleanup() {
      if (retryRef.current) {
        window.clearTimeout(retryRef.current);
        retryRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.close();
        sourceRef.current = null;
      }
    }

    function connect(attempt: number) {
      cleanup();
      if (terminalRef.current) {
        setConnectionStatus("closed");
        return;
      }

      setConnectionStatus(attempt === 0 ? "connecting" : "reconnecting");

      const es = new EventSource(url);
      sourceRef.current = es;

      es.onopen = () => {
        setConnectionStatus("open");
      };

      const onEvent = (ev: MessageEvent) => {
        try {
          const parsed = JSON.parse(ev.data) as IncidentStreamEvent;
          const key = toKey(parsed);
          if (seen.current.has(key)) return;
          seen.current.add(key);

          setEvents((prev) => {
            const next = [...prev, parsed].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
            return next;
          });

          if (isTerminal(parsed)) {
            terminalRef.current = true;
            es.close();
            setConnectionStatus("closed");
          }
        } catch {
          // ignore malformed events
        }
      };

      es.addEventListener("incident_created", onEvent);
      es.addEventListener("execution_started", onEvent);
      es.addEventListener("action_executed", onEvent);
      es.addEventListener("execution_completed", onEvent);
      es.addEventListener("execution_denied", onEvent);
      es.addEventListener("operator_joined", onEvent);
      es.addEventListener("operator_left", onEvent);
      es.addEventListener("admin_override", onEvent);
      es.addEventListener("abort_requested", onEvent);
      es.addEventListener("force_escalation", onEvent);
      es.addEventListener("error", onEvent);

      es.onerror = () => {
        if (terminalRef.current) return;

        // If the server closes the stream after completion, browsers often call onerror.
        // We only reconnect if we haven't received a terminal event.
        const delayMs = Math.min(2000 * (attempt + 1), 15000);
        retryRef.current = window.setTimeout(() => connect(attempt + 1), delayMs);
      };
    }

    connect(0);

    return () => cleanup();
  }, [incidentId]);

  return useMemo(
    () => ({
      events,
      connectionStatus
    }),
    [events, connectionStatus]
  );
}
