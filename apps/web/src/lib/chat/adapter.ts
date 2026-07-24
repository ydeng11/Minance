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
  /** Clarification request — agent needs more info */
  clarification?: {
    question: string;
    options?: string[];
  };
  /** Confirmation preview data */
  confirmationPreview?: Record<string, unknown>;
  /** Pending action key for confirmation flow */
  pendingActionKey?: string;
  /** Structured subscription data */
  subscriptions?: Array<{
    merchant: string;
    cadence: string;
    amount: number;
    nextDate?: string;
    status: string;
  }>;
  /** Structured card benefit data */
  cardBenefits?: Array<{
    cardName: string;
    benefitType: string;
    category?: string;
    rate: number;
    used: number;
    cap: number | null;
    remaining: number | null;
  }>;
  /** Structured budget comparison data */
  budgetComparison?: Array<{
    category: string;
    actual: number;
    target: number | null;
    difference: number;
  }>;
}

function toShortStringList(value: unknown, limit = 4): string[] {
  return Array.isArray(value) ? value.map((entry) => String(entry)).filter(Boolean).slice(0, limit) : [];
}

export function assistantQueryToMessage(query: AssistantQuery): AssistantMessageCard {
  const message: AssistantMessageCard = {
    id: query.id,
    question: query.question,
    answer: query.result.answer,
    keyPoints: toShortStringList(query.result.keyPoints),
    highlights: Array.isArray(query.result.highlights) ? query.result.highlights : [],
    provider: query.result.provider,
    model: query.result.model,
    drillDownUrl: query.result.drillDownUrl,
    createdAt: query.createdAt,
    state: "complete"
  };

  if (typeof query.result.summary === "string") {
    message.summary = query.result.summary;
  }

  if (typeof query.result.followUp === "string") {
    message.followUp = query.result.followUp;
  }

  // Clarification
  if (query.result.clarification) {
    message.clarification = query.result.clarification;
  }

  // Confirmation preview
  if (query.result.confirmationPreview) {
    message.confirmationPreview = query.result.confirmationPreview;
  }

  // Pending action key
  if (query.result.pendingActionKey) {
    message.pendingActionKey = query.result.pendingActionKey;
  }

  // Structured data
  if (query.result.subscriptions) {
    message.subscriptions = query.result.subscriptions;
  }
  if (query.result.cardBenefits) {
    message.cardBenefits = query.result.cardBenefits;
  }
  if (query.result.budgetComparison) {
    message.budgetComparison = query.result.budgetComparison;
  }

  return message;
}
