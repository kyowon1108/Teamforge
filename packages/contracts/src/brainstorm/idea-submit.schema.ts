import { z } from 'zod';

export const IdeaSubmitBodySchema = z.object({
  title: z.string().min(1).max(30),
  description: z.string().min(1).max(100),
});
export type IdeaSubmitBody = z.infer<typeof IdeaSubmitBodySchema>;

export const BuildOnBodySchema = z.object({
  title: z.string().min(1).max(30),
  description: z.string().min(1).max(100),
});
export type BuildOnBody = z.infer<typeof BuildOnBodySchema>;

export const IdeaReactBodySchema = z.object({
  type: z.enum(['like', 'comment']),
  content: z.string().max(50).optional(),
});
export type IdeaReactBody = z.infer<typeof IdeaReactBodySchema>;

export const MergeIdeasBodySchema = z.object({
  parentIds: z.array(z.string()).min(2).max(5),
  title: z.string().min(1).max(30),
  description: z.string().min(1).max(100),
});
export type MergeIdeasBody = z.infer<typeof MergeIdeasBodySchema>;
