import { z } from "zod";

// Section 1: 기본 정보
const Section1Schema = z.object({
  experienceTier: z.number().int().min(1).max(5).optional(),
  backgroundType: z
    .enum(["cs_major", "non_major", "bootcamp", "working_dev", "pm_designer"])
    .optional(),
});

// Section 2: 기술 스택
const Section2Schema = z.object({
  techStackList: z.array(z.string()).optional(),
  skillRatings: z.record(z.string(), z.number().int().min(1).max(5)).optional(),
  topStrengths: z.array(z.string()).max(2).optional(),
});

// Section 3: 프로젝트 경험
const Section3Schema = z.object({
  projectCount: z.number().int().min(0).optional(),
  actualRoles: z.array(z.string()).optional(),
  gitCollabLevel: z.number().int().min(0).max(4).optional(),
});

// Section 4: 협업 스타일
const Section4Schema = z.object({
  workArchetype: z
    .enum(["initiator", "architect", "executor", "coordinator", "documenter"])
    .optional(),
  workStyleVector: z.array(z.number().min(0).max(100)).length(3).optional(),
  desiredRoles: z.array(z.string()).max(2).optional(),
});

// Section 5: 가용 시간
const Section5Schema = z.object({
  weeklyHours: z.number().int().optional(),
  freeText: z.string().max(500).optional(),
});

// Section 6: 포트폴리오
const Section6Schema = z.object({
  githubUrl: z.string().url().optional().or(z.literal("")),
  selfIntro: z.string().max(500).optional(),
});

export const SurveyAnswersSchema = Section1Schema.merge(Section2Schema)
  .merge(Section3Schema)
  .merge(Section4Schema)
  .merge(Section5Schema)
  .merge(Section6Schema);

export type SurveyAnswers = z.infer<typeof SurveyAnswersSchema>;
