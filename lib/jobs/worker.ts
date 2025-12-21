import { executeResponsePlan } from "../executors/executeResponsePlan";
import { updateJob } from "./registry.ts";

export async function runJob(jobId: string) {
  updateJob(jobId, {
    status: "RUNNING",
    startedAt: new Date().toISOString(),
  });

  try {
    const { responsePlan } = require("./registry").getJob(jobId);

    const results = await executeResponsePlan(responsePlan);

    updateJob(jobId, {
      status: "COMPLETED",
      results: [...results],
      completedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    updateJob(jobId, {
      status: "FAILED",
      error: err?.message ?? "Unknown error",
      completedAt: new Date().toISOString(),
    });
  }
}
