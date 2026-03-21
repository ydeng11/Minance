import type { AssistantQuery } from "@/lib/api/types";

export interface AssistantMessageCard {
  id: string;
  question: string;
  answer: string;
  summary?: string;
  keyPoints: string[];
  followUp?: string;
  highlights: string[];
  provider: string;
  model: string;
  drillDownUrl: string;
  createdAt: string;
  state: "pending" | "complete" | "error";
  pendingEmoji?: string;
}

function toShortStringList(value: unknown, limit = 4): string[] {
  return Array.isArray(value) ? value.map((entry) => String(entry)).filter(Boolean).slice(0, limit) : [];
}

export function assistantQueryToMessage(query: AssistantQuery): AssistantMessageCard {
  return {
    id: query.id,
    question: query.question,
    answer: query.result.answer,
    summary: typeof query.result.summary === "string" ? query.result.summary : undefined,
    keyPoints: toShortStringList(query.result.keyPoints),
    followUp: typeof query.result.followUp === "string" ? query.result.followUp : undefined,
    highlights: Array.isArray(query.result.highlights) ? query.result.highlights : [],
    provider: query.result.provider,
    model: query.result.model,
    drillDownUrl: query.result.drillDownUrl,
    createdAt: query.createdAt,
    state: "complete"
  };
}
