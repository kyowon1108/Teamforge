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

// ---------------------------------------------------------------------------
// KickoffSession — Batch A 의사결정 입력
// ---------------------------------------------------------------------------

// kickoff_sessions.out_of_scope — 이번에 안 하는 것 (string[])
export const OutOfScopeSchema = z.array(z.string().min(1).max(200)).max(10);

// kickoff_sessions.success_criteria — 데모 때 반드시 보여줄 것 (string[3])
export const SuccessCriteriaSchema = z
  .array(z.string().min(1).max(200))
  .min(1)
  .max(3);

// kickoff_sessions.collab_rules — 협업 규칙 4개
export const CollabRulesSchema = z.object({
  version: z.number().default(1),
  branchStrategy: z.string().max(300),   // 브랜치 전략 (예: "main 직접 push 금지, feature/xxx 브랜치 사용")
  prRule: z.string().max(300),            // PR 규칙 (예: "1인 이상 리뷰 후 merge")
  issueRule: z.string().max(300),         // Issue 규칙 (예: "작업 시작 전 Issue 먼저 생성")
  meetingCycle: z.string().max(300),      // 회의 주기 (예: "매주 월요일 오후 9시")
});

// ---------------------------------------------------------------------------
// KickoffParticipant — Batch B 팀원 우려 / 역할 수락
// ---------------------------------------------------------------------------

export const ConcernTypeSchema = z.enum([
  "stack_unfamiliar",    // 이 스택 자신 없음
  "role_burden",         // 이 역할 부담
  "schedule_tight",      // 일정 무리
  "skill_gap",           // 기술 격차
  "environment_issue",   // 개발 환경 문제
  "git_unfamiliar",      // Git 협업 미숙
  "other",
]);

export const MemberConcernSchema = z.object({
  type: ConcernTypeSchema,
  detail: z.string().max(500).optional(), // 추가 설명
  createdAt: z.string(),                  // ISO 8601
});

export const MemberConcernsSchema = z.array(MemberConcernSchema).max(10);

// ---------------------------------------------------------------------------
// KickoffArtifact — Batch C AI 생성 산출물
// ---------------------------------------------------------------------------

// first_issues
export const FirstIssueSchema = z.object({
  title: z.string().max(200),
  description: z.string().max(1000),
  category: z.enum(["mvp", "infra", "design", "docs"]),
  assigneeUserId: z.string().uuid().nullable(),
  estimatedHours: z.number().optional(),
});

export const FirstIssuesArtifactSchema = z.object({
  version: z.number().default(1),
  issues: z.array(FirstIssueSchema).min(1).max(5),
});

// first_agenda
export const AgendaItemSchema = z.object({
  order: z.number(),
  title: z.string().max(200),
  durationMinutes: z.number(),
  description: z.string().max(500).optional(),
  owner: z.string().max(100).optional(),
});

export const FirstAgendaArtifactSchema = z.object({
  version: z.number().default(1),
  meetingTitle: z.string().max(200),
  totalMinutes: z.number(),
  items: z.array(AgendaItemSchema).min(1).max(10),
});

// mini_adrs
export const MiniAdrSchema = z.object({
  title: z.string().max(200),
  decision: z.string().max(500),
  rationale: z.string().max(500),
  alternatives: z.array(z.string().max(200)).max(3),
});

export const MiniAdrsArtifactSchema = z.object({
  version: z.number().default(1),
  adrs: z.array(MiniAdrSchema).min(1).max(3),
});

// 통합 artifact content — artifactType에 따라 분기 검증
export const ArtifactContentSchema = z.union([
  FirstIssuesArtifactSchema,
  FirstAgendaArtifactSchema,
  MiniAdrsArtifactSchema,
]);

export type OutOfScope = z.infer<typeof OutOfScopeSchema>;
export type SuccessCriteria = z.infer<typeof SuccessCriteriaSchema>;
export type CollabRules = z.infer<typeof CollabRulesSchema>;
export type ConcernType = z.infer<typeof ConcernTypeSchema>;
export type MemberConcern = z.infer<typeof MemberConcernSchema>;
export type MemberConcerns = z.infer<typeof MemberConcernsSchema>;
export type FirstIssue = z.infer<typeof FirstIssueSchema>;
export type FirstIssuesArtifact = z.infer<typeof FirstIssuesArtifactSchema>;
export type FirstAgendaArtifact = z.infer<typeof FirstAgendaArtifactSchema>;
export type MiniAdrsArtifact = z.infer<typeof MiniAdrsArtifactSchema>;
