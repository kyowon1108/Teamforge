import { z } from "zod";

export const TeamRoleSchema = z.enum(["leader", "member", "observer"]);

export type TeamRole = z.infer<typeof TeamRoleSchema>;
