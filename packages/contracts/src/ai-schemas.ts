import { z } from "zod";

// Agent 1 — Onboarding Assistant output
export const Agent1OutputSchema = z.object({
  answerMarkdown: z.string().max(500),
  glossary: z
    .array(z.object({ term: z.string(), definition: z.string() }))
    .optional(),
  followUpQuestion: z.string().optional(),
  unresolvedTerms: z.array(z.string()).optional(),
  confidence: z.enum(["high", "medium", "low"]),
});

// Skill vector (6-dim)
export const SkillVectorSchema = z.object({
  backend: z.number().min(0).max(5),
  frontend: z.number().min(0).max(5),
  database: z.number().min(0).max(5),
  devops: z.number().min(0).max(5),
  aiMl: z.number().min(0).max(5),
  design: z.number().min(0).max(5),
  _isEstimated: z.boolean().optional(),
});

export type Agent1Output = z.infer<typeof Agent1OutputSchema>;
export type SkillVector = z.infer<typeof SkillVectorSchema>;
