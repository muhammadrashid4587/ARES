import type { ResponsePlan } from "../responsePlan";
import type { ExecutionResult } from "../executors";

export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export type ExecutionJob = {
  id: string;
  status: JobStatus;
  responsePlan: ResponsePlan;
  results: ExecutionResult[] | null;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
};

const jobs = new Map<string, ExecutionJob>();

export function createJob(
  id: string,
  responsePlan: ResponsePlan
): ExecutionJob {
  const job: ExecutionJob = {
    id,
    status: "PENDING",
    responsePlan,
    results: null,
    createdAt: new Date().toISOString(),
  };

  jobs.set(id, job);
  return job;
}

export function getJob(id: string): ExecutionJob | undefined {
  return jobs.get(id);
}

export function updateJob(
  id: string,
  updates: Partial<ExecutionJob>
): void {
  const job = jobs.get(id);
  if (!job) return;
  Object.assign(job, updates);
}
