// 팀 컨텍스트 계약 — 팀장이 팀 생성 시 입력하는 팀 단위 운영/목표 데이터
//
// 설계 결정 (KF-036~KF-040):
// - 모든 boolean 필드는 nullable (default 없음). legacy 팀의 "미입력" 의미를 명시적으로 보존한다.
// - Enum 값 문자열은 Prisma enum과 정확히 일치해야 한다 (단일 소스 of truth = 이 파일).
// - domainHints는 최대 2개까지. 빈 배열은 "선택 안 함"을 의미한다.

import { z } from 'zod';

export const TeamTypeSchema = z.enum([
  'HACKATHON',
  'CAPSTONE',
  'BOOTCAMP',
  'SIDE_PROJECT',
  'STARTUP',
]);
export type TeamType = z.infer<typeof TeamTypeSchema>;

export const ProjectDurationSchema = z.enum([
  'UNDER_1_DAY',
  'ONE_TO_FOUR_WEEKS',
  'ONE_TO_THREE_MONTHS',
  'OVER_THREE_MONTHS',
]);
export type ProjectDuration = z.infer<typeof ProjectDurationSchema>;

export const CompletionTargetSchema = z.enum([
  'DEMO',
  'MVP',
  'PRODUCTION',
]);
export type CompletionTarget = z.infer<typeof CompletionTargetSchema>;

export const DOMAIN_HINT_VALUES = [
  'FINTECH',
  'HEALTHCARE',
  'EDUCATION',
  'SOCIAL',
  'AI_ML',
  'INFRA_TOOLING',
  'ECOMMERCE',
  'PUBLIC',
  'GAME',
  'OTHER',
] as const;
export const DomainHintSchema = z.enum(DOMAIN_HINT_VALUES);
export type DomainHint = z.infer<typeof DomainHintSchema>;

/** 팀 컨텍스트 — 팀장이 팀 생성 시 입력하는 팀 단위 운영/목표 데이터 */
export const TeamContextSchema = z.object({
  teamType: TeamTypeSchema.nullable().optional(),
  projectDuration: ProjectDurationSchema.nullable().optional(),
  completionTarget: CompletionTargetSchema.nullable().optional(),
  hasNonDeveloper: z.boolean().nullable().optional(),
  usesVibeCoding: z.boolean().nullable().optional(),
  hasSkillGap: z.boolean().nullable().optional(),
  domainHints: z.array(DomainHintSchema).max(2).optional(),
});
export type TeamContext = z.infer<typeof TeamContextSchema>;
