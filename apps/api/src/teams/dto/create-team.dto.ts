import { z } from 'zod';
import { TeamContextSchema } from '@teamforge/contracts';

export const CreateTeamSchema = z
  .object({
    name: z.string().min(2).max(50),
  })
  .merge(TeamContextSchema);

export type CreateTeamDto = z.infer<typeof CreateTeamSchema>;
