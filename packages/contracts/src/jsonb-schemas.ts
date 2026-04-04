import { z } from "zod";

// teams.selected_stack
export const SelectedStackSchema = z.object({
  version: z.number(),
  steps: z.array(
    z.object({
      step: z.number(),
      question: z.string(),
      selectedOption: z.string(),
      confirmedAt: z.string(),
    })
  ),
});

// teams.sprint_config
export const SprintConfigSchema = z.object({
  version: z.number(),
  sprintLengthDays: z.number(),
  startDate: z.string(),
  goals: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      targetPercent: z.number(),
    })
  ),
});

// skill_assessments.resume_data
export const ResumeDataSchema = z.object({
  version: z.number(),
  techFromResume: z.array(z.string()),
  projectsFromResume: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      techs: z.array(z.string()),
    })
  ),
  rolesFromResume: z.array(z.string()),
  parsedAt: z.string(),
});

// skill_assessments.github_data
export const GithubDataSchema = z.object({
  version: z.number(),
  languageStats: z.record(z.number()),
  commitFrequency: z.number(),
  repoCount: z.number(),
  collectedAt: z.string(),
});

// skill_assessments.answers (survey answers)
export const SurveyAnswersSchema = z.object({
  // Section 1
  experienceTier: z.number().min(1).max(5).optional(),
  backgroundType: z.string().optional(),
  // Section 2
  techStackList: z.array(z.string()).optional(),
  skillRatings: z.record(z.number().min(1).max(5)).optional(),
  topStrengths: z.array(z.string()).max(2).optional(),
  // Section 3
  projectCount: z.number().optional(),
  actualRoles: z.array(z.string()).optional(),
  gitCollabLevel: z.number().min(0).max(4).optional(),
  // Section 4
  workArchetype: z.string().optional(),
  workStyleVector: z.array(z.number().min(0).max(100)).max(3).optional(),
  desiredRoles: z.array(z.string()).max(2).optional(),
  // Section 5
  weeklyHours: z.number().optional(),
  freeText: z.string().optional(),
  // Section 6 (optional)
  resumeJobId: z.string().optional(),
  githubUrl: z.string().url().optional().or(z.literal("")),
});

export type SelectedStack = z.infer<typeof SelectedStackSchema>;
export type SprintConfig = z.infer<typeof SprintConfigSchema>;
export type ResumeData = z.infer<typeof ResumeDataSchema>;
export type GithubData = z.infer<typeof GithubDataSchema>;
export type SurveyAnswers = z.infer<typeof SurveyAnswersSchema>;
