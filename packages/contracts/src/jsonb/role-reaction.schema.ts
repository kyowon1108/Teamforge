import { z } from 'zod';

export const RoleReactionSchema = z.enum(['ok', 'burden', 'prefer_other']);
export type RoleReaction = z.infer<typeof RoleReactionSchema>;

export const RoleReactionNoteSchema = z.string().max(100);
export type RoleReactionNote = z.infer<typeof RoleReactionNoteSchema>;
