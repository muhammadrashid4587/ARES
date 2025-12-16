import { buildResponsePlan } from "../responsePlan.ts";
import { executeResponsePlan } from "./executeResponsePlan.ts";

const plan = buildResponsePlan("test-incident", {
  dispatchDrone: true,
  bystanderInstructions: ["Step 1", "Step 2"],
});

executeResponsePlan(plan).then((results) => {
  console.log("EXECUTION RESULTS:");
  console.log(results);
});
