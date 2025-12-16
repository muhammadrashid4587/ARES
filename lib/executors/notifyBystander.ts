import type { NotifyBystanderAction } from "../responsePlan";

export async function executeNotifyBystander(
  action: NotifyBystanderAction
) {
  await new Promise((r) => setTimeout(r, 300)); // simulate latency

  return {
    actionType: action.type,
    success: true,
    message: `Bystander instructions delivered (${action.payload.bystanderInstructions.length} steps)`,
    executedAt: new Date().toISOString(),
  };
}
