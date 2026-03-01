import type { AssistantQuery } from "@/lib/api/types";

export interface AssistantMessageCard {
  id: string;
  question: string;
  answer: string;
  highlights: string[];
  provider: string;
  model: string;
  drillDownUrl: string;
  createdAt: string;
}

export function assistantQueryToMessage(query: AssistantQuery): AssistantMessageCard {
  return {
    id: query.id,
    question: query.question,
    answer: query.result.answer,
    highlights: Array.isArray(query.result.highlights) ? query.result.highlights : [],
    provider: query.result.provider,
    model: query.result.model,
    drillDownUrl: query.result.drillDownUrl,
    createdAt: query.createdAt
  };
}
