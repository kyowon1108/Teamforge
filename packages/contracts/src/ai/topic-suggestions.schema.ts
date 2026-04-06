import { z } from "zod";

export const TopicSuggestionSchema = z.object({
  title: z.string().min(1).max(100),
  rationale: z.string().min(1).max(300),
  tags: z.array(z.string().max(30)).max(5),
});

export const TopicSuggestionsSchema = z.object({
  topics: z.array(TopicSuggestionSchema).min(1).max(5),
});

export type TopicSuggestion = z.infer<typeof TopicSuggestionSchema>;
export type TopicSuggestions = z.infer<typeof TopicSuggestionsSchema>;
