import { z } from "zod";

export const SurveyMetadataSchema = z.object({
  draftStep: z.number().int().min(1).max(6).optional(),
  autosavedAt: z.string().datetime().optional(),
  lastEditedByRole: z.enum(["leader", "member"]).optional()
});

export type SurveyMetadata = z.infer<typeof SurveyMetadataSchema>;
