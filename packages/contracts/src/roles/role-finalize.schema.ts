import { z } from 'zod';

export const FINAL_ROLE_OPTIONS = [
  '프론트엔드',
  '백엔드',
  '풀스택',
  'PM/기획',
  'AI/데이터',
  'DevOps',
  'QA/테스트',
  '디자인',
  '기타',
] as const;

export type FinalRoleOption = (typeof FINAL_ROLE_OPTIONS)[number];

export const FinalizeRoleBodySchema = z.object({
  userId: z.string().uuid(),
  finalRole: z.enum(FINAL_ROLE_OPTIONS),
});

export type FinalizeRoleBody = z.infer<typeof FinalizeRoleBodySchema>;
