import type { AresAction } from "../responsePlan.ts";
import { executeNotifyBystander } from "./notifyBystander.ts";
import { executeDispatchDrone } from "./dispatchDrone.ts";
import { executeAlertEMS } from "./alertEMS.ts";

export type ExecutionResult = Readonly<{
  actionType: AresAction["type"];
  success: boolean;
  message: string;
  executedAt: string;
}>;

function assertNever(x: never): never {
  throw new Error(`Unhandled action: ${JSON.stringify(x)}`);
}

export async function executeAction(
  action: AresAction
): Promise<ExecutionResult> {
  switch (action.type) {
    case "NOTIFY_BYSTANDER":
      return executeNotifyBystander(action);
    case "DISPATCH_DRONE":
      return executeDispatchDrone(action);
    case "ALERT_EMS":
      return executeAlertEMS(action);
    default:
      return assertNever(action);
  }
}
