import { z } from "zod";

export const AnalysisJobStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed"
]);

export const AnalysisJobSchema = z.object({
  jobId: z.string().min(1),
  workflow: z.string().min(1),
  status: AnalysisJobStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  errorMessage: z.string().optional()
});

export type AnalysisJob = z.infer<typeof AnalysisJobSchema>;
export type AnalysisJobStatus = z.infer<typeof AnalysisJobStatusSchema>;
