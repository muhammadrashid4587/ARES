/**
 * ⚠️ FROZEN CORE MODULE
 * Do not modify without explicit architectural reason.
 * Stable as of ares-v0-intake-triage.
 */


export type EmergencyType =
  | "Cardiac Arrest"
  | "Severe Bleeding"
  | "Unconscious Individual";

export type Urgency = "critical" | "high";

export type TriageInput = Readonly<{
  emergencyType: EmergencyType;
  location?: string;
}>;

export type TriageDecision = Readonly<{
  emergencyType: EmergencyType;
  urgency: Urgency;
  dispatchDrone: boolean;
  estimatedMinutesSaved: number;
  bystanderInstructions: ReadonlyArray<string>;
}>;

export function triageEmergency(input: TriageInput): TriageDecision {
  switch (input.emergencyType) {
    case "Cardiac Arrest":
      return {
        emergencyType: input.emergencyType,
        urgency: "critical",
        dispatchDrone: true,
        estimatedMinutesSaved: 6,
        bystanderInstructions: [
          "Call local emergency services immediately.",
          "Start chest compressions (CPR) if trained; follow dispatcher guidance.",
          "If an AED is available, turn it on and follow its prompts."
        ]
      };

    case "Severe Bleeding":
      return {
        emergencyType: input.emergencyType,
        urgency: "critical",
        dispatchDrone: true,
        estimatedMinutesSaved: 5,
        bystanderInstructions: [
          "Call local emergency services immediately.",
          "Apply firm, direct pressure to the wound with a clean cloth or bandage.",
          "If bleeding soaks through, add more material—do not remove the first layer."
        ]
      };

    case "Unconscious Individual":
      return {
        emergencyType: input.emergencyType,
        urgency: "high",
        dispatchDrone: false,
        estimatedMinutesSaved: 2,
        bystanderInstructions: [
          "Call local emergency services.",
          "Check responsiveness and breathing; follow dispatcher guidance.",
          "If breathing normally, place in the recovery position and monitor."
        ]
      };
  }
}
