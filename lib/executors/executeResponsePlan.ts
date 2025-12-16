import type { ResponsePlan } from "../responsePlan.ts";
import { executeAction } from "./index.ts";
import type { ExecutionResult } from "./index.ts";

export async function executeResponsePlan(
  plan: ResponsePlan
): Promise<ReadonlyArray<ExecutionResult>> {
  const results: ExecutionResult[] = [];

  for (const action of plan.actions) {
    const result = await executeAction(action);
    results.push(result);
  }

  return results;
}
