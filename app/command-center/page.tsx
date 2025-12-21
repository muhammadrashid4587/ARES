"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type IncidentStatus = "pending" | "executing" | "completed" | "failed";

type IncidentListItem = Readonly<{
  incidentId: string;
  emergencyType: string;
  location: string;
  status: IncidentStatus;
  createdAt: string;
}>;

function shortId(id: string): string {
  return id.length <= 8 ? id : `${id.slice(0, 8)}…`;
}

export default function CommandCenterPage() {
  const [incidents, setIncidents] = useState<ReadonlyArray<IncidentListItem>>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/incidents", { cache: "no-store" });
    const data = (await res.json()) as { incidents: IncidentListItem[] };
    setIncidents(data.incidents);
    setIsLoading(false);
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 16, padding: 16 }}>
      <section>
        <h1 style={{ margin: 0 }}>ARES Command Center</h1>
        <p style={{ marginTop: 8, marginBottom: 16 }}>Live incidents and execution observability.</p>

        {isLoading ? <p>Loading incidents…</p> : null}

        <div>
          {incidents.length === 0 ? <p>No incidents yet.</p> : null}

          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
            {incidents.map((i) => (
              <li
                key={i.incidentId}
                style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{i.emergencyType}</div>
                    <div style={{ color: "#444" }}>{i.location}</div>
                    <div style={{ color: "#666", fontSize: 12 }}>
                      {shortId(i.incidentId)} • {new Date(i.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 600 }}>{i.status}</div>
                    <Link href={`/command-center/incidents/${i.incidentId}`}>Open</Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section style={{ border: "1px dashed #ddd", borderRadius: 8, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Incident view</h2>
        <p>Select an incident from the left to view the live execution timeline.</p>
      </section>
    </main>
  );
}
