import { z } from 'zod';

export const CreateTeamSchema = z.object({
  name: z.string().min(2).max(50),
});

export type CreateTeamDto = z.infer<typeof CreateTeamSchema>;
