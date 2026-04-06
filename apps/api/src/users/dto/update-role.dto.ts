import { z } from 'zod';
import { TeamRoleSchema } from '@teamforge/contracts';

export const UpdateRoleSchema = z.object({
  role: TeamRoleSchema,
});

export type UpdateRoleDto = z.infer<typeof UpdateRoleSchema>;
