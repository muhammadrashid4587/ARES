"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useIncidentStream, type IncidentStreamEvent } from "../../../../lib/hooks/useIncidentStream";

type IncidentStatus = "pending" | "executing" | "completed" | "failed";
type Operator = Readonly<{ id: string; role: "VIEWER" | "OPERATOR" | "ADMIN" }>;

type IncidentMeta = Readonly<{
  incidentId: string;
  emergencyType: string;
  location: string;
  status: IncidentStatus;
  createdAt: string;
}>;

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function banner(status: IncidentStatus): { label: string; color: string } {
  switch (status) {
    case "executing":
      return { label: "🟢 Executing", color: "#0a7" };
    case "completed":
      return { label: "🔵 Completed", color: "#06c" };
    case "failed":
      return { label: "🔴 Failed", color: "#c00" };
    case "pending":
    default:
      return { label: "🟡 Pending", color: "#b80" };
  }
}

function isTerminalEvent(e: IncidentStreamEvent): boolean {
  return e.event === "execution_completed" || e.event === "error";
}

function statusFromEvents(meta: IncidentMeta | null, events: ReadonlyArray<IncidentStreamEvent>): IncidentStatus {
  // Prefer live stream-derived status.
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    if (ev.event === "execution_completed") return "completed";
    if (ev.event === "error") return "failed";
    if (ev.event === "execution_started" || ev.event === "action_executed") return "executing";
  }
  return meta?.status ?? "pending";
}

function activeOperatorsFromEvents(events: ReadonlyArray<IncidentStreamEvent>): ReadonlyArray<Operator> {
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    if (ev.event === "operator_joined" || ev.event === "operator_left") {
      const list = (ev.payload as any)?.activeOperators as Operator[] | undefined;
      if (Array.isArray(list)) return list;
    }
  }
  return [];
}

export default function CommandCenterIncidentPage({
  params
}: {
  params: { incidentId: string };
}) {
  const incidentId = params.incidentId;

  const [meta, setMeta] = useState<IncidentMeta | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  const { events, connectionStatus } = useIncidentStream(incidentId);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}/meta`, {
        cache: "no-store"
      });
      const data = (await res.json()) as IncidentMeta;
      if (!cancelled) setMeta(data);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [incidentId]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const derivedStatus = useMemo(() => statusFromEvents(meta, events), [meta, events]);
  const bannerInfo = banner(derivedStatus);
  const activeOperators = useMemo(() => activeOperatorsFromEvents(events), [events]);

  const createdAtMs = meta ? new Date(meta.createdAt).getTime() : null;
  const elapsed = createdAtMs ? formatElapsed(now - createdAtMs) : "--:--:--";

  return (
    <main style={{ padding: 16, display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Incident {incidentId}</h1>
          <div style={{ marginTop: 6 }}>
            <Link href="/command-center">← Back to Command Center</Link>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, color: bannerInfo.color, fontSize: 20 }}>{bannerInfo.label}</div>
          <div style={{ color: "#666", fontSize: 12 }}>Elapsed: {elapsed}</div>
          <div style={{ color: "#666", fontSize: 12 }}>
            SSE: {connectionStatus === "reconnecting" ? "Reconnecting…" : connectionStatus}
          </div>
        </div>
      </div>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div><strong>Emergency type:</strong> {meta?.emergencyType ?? "…"}</div>
          <div><strong>Location:</strong> {meta?.location ?? "…"}</div>
          <div><strong>Created:</strong> {meta ? new Date(meta.createdAt).toLocaleString() : "…"}</div>
          <div>
            <strong>Active operators:</strong>{" "}
            {activeOperators.length === 0
              ? "—"
              : activeOperators.map((o) => `${o.id} (${o.role})`).join(", ")}
          </div>
        </div>
      </section>

      <section>
        <h2 style={{ marginTop: 0 }}>Execution timeline</h2>

        {events.length === 0 ? (
          <p>Waiting for events…</p>
        ) : (
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            {events.map((e) => {
              const ts = new Date(e.timestamp).toLocaleTimeString();
              const terminal = isTerminalEvent(e);
              const title =
                e.event === "action_executed"
                  ? `action_executed (${(e.payload as any)?.actionType ?? ""})`
                  : e.event;

              const message =
                e.event === "action_executed" ? (e.payload as any)?.message : undefined;

              const success =
                e.event === "action_executed" ? (e.payload as any)?.success : undefined;

              return (
                <li
                  key={`${e.event}-${e.timestamp}-${JSON.stringify(e.payload)}`}
                  style={{
                    borderLeft: "3px solid #ddd",
                    paddingLeft: 12,
                    opacity: 1,
                    transform: "translateY(0)",
                    transition: "opacity 200ms ease, transform 200ms ease"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ fontWeight: 700 }}>
                      {title}{" "}
                      {typeof success === "boolean" ? (
                        <span style={{ color: success ? "#0a7" : "#c00" }}>
                          {success ? "(success)" : "(failed)"}
                        </span>
                      ) : null}
                      {terminal ? <span style={{ color: "#666" }}> (terminal)</span> : null}
                    </div>
                    <div style={{ color: "#666", fontSize: 12 }}>{ts}</div>
                  </div>

                  {message ? <div style={{ color: "#333", marginTop: 4 }}>{message}</div> : null}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}
