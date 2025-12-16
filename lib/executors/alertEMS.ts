import type { AlertEmsAction } from "../responsePlan";

export async function executeAlertEMS(
  action: AlertEmsAction
) {
  await new Promise((r) => setTimeout(r, 400)); // call routing delay

  return {
    actionType: action.type,
    success: true,
    message: `EMS alerted for incident ${action.payload.incidentId}`,
    executedAt: new Date().toISOString(),
  };
}
