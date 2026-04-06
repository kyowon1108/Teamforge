import { z } from 'zod';
import { TeamRoleSchema } from '@teamforge/contracts';

export const JoinTeamSchema = z.object({
  inviteCode: z.string().length(6),
  role: TeamRoleSchema.exclude(['leader']),
});

export type JoinTeamDto = z.infer<typeof JoinTeamSchema>;
