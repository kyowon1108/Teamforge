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
  techStackList: z.array(z.string().max(50)).max(30).optional(),
  skillRatings: z
    .record(z.string().max(50), z.number().int().min(1).max(5))
    .refine((v) => Object.keys(v).length <= 30, { message: 'skillRatings 키는 최대 30개' })
    .optional(),
  topStrengths: z.array(z.string()).max(2).optional(),
});

// Section 3: 프로젝트 경험
const Section3Schema = z.object({
  projectCount: z.number().int().min(0).optional(),
  actualRoles: z.array(z.string().max(50)).max(10).optional(),
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

// Section 7: 시스템 블록 자신감 (Layer B — Capability)
export const SYSTEM_BLOCKS = [
  'ui', 'api', 'db', 'auth', 'devops', 'testing', 'docs', 'pm', 'data', 'ai_feat', 'realtime',
] as const;
export type SystemBlock = (typeof SYSTEM_BLOCKS)[number];

export const BlockConfidenceLevel = z.enum(['lead', 'contribute', 'learn', 'cant']);
export type BlockConfidence = z.infer<typeof BlockConfidenceLevel>;

const Section7Schema = z.object({
  blockConfidence: z.record(z.enum(SYSTEM_BLOCKS), BlockConfidenceLevel).optional(),
});

// Section 8: 협업 체크리스트 (Layer C — Collaboration)
const Section8Schema = z.object({
  collabChecklist: z.object({
    prReview: z.boolean(),
    issueTracking: z.boolean(),
    meetingNotes: z.boolean(),
    codeReading: z.boolean(),
    asyncResponse: z.boolean(),
    conflictResolution: z.boolean(),
  }).optional(),
});

// Section 9: AI 활용 프로파일 (Layer E — AI)
export const AI_PREFERENCE_OPTIONS = [
  'ideation', 'code_draft', 'debugging', 'docs', 'review', 'learning',
] as const;

const Section9Schema = z.object({
  aiProfile: z.object({
    preferences: z.array(z.enum(AI_PREFERENCE_OPTIONS)).min(1),
    verificationLevel: z.number().int().min(1).max(3),
    pairComfort: z.boolean(),
    selfLeadBlocks: z.array(z.enum(SYSTEM_BLOCKS)),
  }).optional(),
});

export const SurveyAnswersSchema = Section1Schema.merge(Section2Schema)
  .merge(Section3Schema)
  .merge(Section4Schema)
  .merge(Section5Schema)
  .merge(Section6Schema)
  .merge(Section7Schema)
  .merge(Section8Schema)
  .merge(Section9Schema);

export type SurveyAnswers = z.infer<typeof SurveyAnswersSchema>;
