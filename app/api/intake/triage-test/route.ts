/**
 * ⚠️ FROZEN CORE MODULE
 * Do not modify without explicit architectural reason.
 * Stable as of ares-v0-intake-triage.
 */


import { NextResponse } from "next/server";
import { triageEmergency } from "@/lib/triage";

export async function GET() {
  const result = triageEmergency({
    emergencyType: "Cardiac Arrest",
    location: "Philadelphia",
  });

  return NextResponse.json(result);
}
