import type { DispatchDroneAction } from "../responsePlan";

export async function executeDispatchDrone(
  action: DispatchDroneAction
) {
  await new Promise((r) => setTimeout(r, 800)); // drone prep delay

  return {
    actionType: action.type,
    success: true,
    message: `Drone dispatched for incident ${action.payload.incidentId}`,
    executedAt: new Date().toISOString(),
  };
}
