

"use client";

import { useState } from "react";

type EmergencyType =
  | "Cardiac Arrest"
  | "Severe Bleeding"
  | "Unconscious Individual";

export default function EmergencyIntakePage() {
  const [emergencyType, setEmergencyType] = useState<EmergencyType>(
    "Cardiac Arrest"
  );
  const [location, setLocation] = useState<string>("");
  const [isResponding, setIsResponding] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsResponding(true);

    const payload = {
      emergencyType,
      location
    };

    const res = await fetch("/api/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = (await res.json()) as { incidentId: string };
    console.log("Incident ID:", data.incidentId);
    setIsResponding(false);
  }

  return (
    <main>
      <h1>Emergency Intake</h1>

      <form onSubmit={onSubmit}>
        <div>
          <label htmlFor="emergencyType">Emergency type</label>
          <div>
            <select
              id="emergencyType"
              name="emergencyType"
              value={emergencyType}
              onChange={(e) => setEmergencyType(e.target.value as EmergencyType)}
            >
              <option value="Cardiac Arrest">Cardiac Arrest</option>
              <option value="Severe Bleeding">Severe Bleeding</option>
              <option value="Unconscious Individual">Unconscious Individual</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="location">Location</label>
          <div>
            <input
              id="location"
              name="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter location"
            />
          </div>
        </div>

        <button type="submit">Dispatch ARES</button>
      </form>

      {isResponding ? <p>ARES responding...</p> : null}
    </main>
  );
}
