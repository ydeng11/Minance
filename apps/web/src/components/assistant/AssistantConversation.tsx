"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Loader2, Send, User, X } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/hooks/useApi";
import { StatusMessage } from "@/components/feedback/StatusMessage";
import { cn } from "@/lib/utils";
import type { AssistantMessageCard } from "@/lib/chat/adapter";
import {
  clearStoredAssistantConversationState,
  createPendingAssistantMessage,
  createAssistantTranscriptExpiry,
  getStoredAssistantTranscriptSnapshot,
  getStoredAssistantConversationId,
  persistAssistantTranscriptSnapshot,
  replaceAssistantMessage,
  submitAssistantQuestion
} from "@/lib/chat/conversation";
import { pickAssistantPromptPlaceholder, pickAssistantThinkingEmoji } from "@/lib/chat/display";

interface AssistantConversationProps {
  mode?: "page" | "panel";
  focusToken?: number;
  onClose?: () => void;
}

const MESSAGE_LIMIT = 25;
const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const SECONDARY_BUTTON_BASE_CLASS =
  "rounded-md border border-border-subtle bg-surface-field text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50";
const SECONDARY_BUTTON_CLASS = cn(SECONDARY_BUTTON_BASE_CLASS, "px-3 py-2 text-sm", FOCUS_RING_CLASS);
const PANEL_SECONDARY_BUTTON_CLASS = cn(SECONDARY_BUTTON_BASE_CLASS, "px-3 py-2 text-xs", FOCUS_RING_CLASS);
const PANEL_ICON_BUTTON_CLASS = cn(
  "rounded-md border border-border-subtle bg-surface-field px-2 py-2 text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary",
  FOCUS_RING_CLASS
);
const ASSISTANT_SECTION_CLASS =
  "flex flex-1 flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-panel/85 shadow-panel";
const MESSAGE_CARD_CLASS = "space-y-3 rounded-xl border border-border-subtle bg-surface-panel p-4";
const ASSISTANT_BUBBLE_CLASS =
  "w-full rounded-2xl border border-border-subtle bg-surface-field/80 px-4 py-3 text-sm text-text-primary";

function getAssistantConversationStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

function createPendingMessageId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? `pending_${crypto.randomUUID()}` : `pending_${Date.now()}`;
}

function getAssistantRequestError(error: unknown) {
  return error instanceof ApiError ? error.message : "Assistant request failed.";
}

function renderAssistantBody(entry: AssistantMessageCard) {
  if (entry.state === "pending") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <span className="inline-flex h-7 w-7 animate-bounce items-center justify-center rounded-full bg-surface-elevated text-base">
            {entry.pendingEmoji || "🧠"}
          </span>
          <span className="animate-pulse">Thinking...</span>
        </div>
        <div className="space-y-2">
          <div className="h-2.5 w-5/6 rounded-full bg-surface-elevated" />
          <div className="h-2.5 w-2/3 rounded-full bg-surface-field" />
        </div>
      </div>
    );
  }

  if (entry.state === "error") {
    return (
      <div className="rounded-2xl border border-danger/35 bg-danger-soft/80 px-3 py-3 text-sm text-danger">
        {entry.answer}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm leading-6 text-text-primary">
        {entry.summary || entry.answer}
      </p>
      {entry.keyPoints.length ? (
        <ul className="space-y-2 text-sm text-text-primary">
          {entry.keyPoints.map((item) => (
            <li key={item} className="flex gap-2 leading-6">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {entry.followUp ? (
        <p className="rounded-2xl border border-accent/25 bg-accent-soft/70 px-3 py-2 text-xs leading-5 text-accent">
          {entry.followUp}
        </p>
      ) : null}
    </div>
  );
}

function renderAssistantFooter(entry: AssistantMessageCard) {
  if (entry.state !== "complete") {
    return null;
  }

  return (
    <>
      {entry.highlights.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {entry.highlights.map((item) => (
            <span key={item} className="rounded-full border border-accent/25 bg-accent-soft/70 px-2 py-1 text-[11px] text-accent">
              {item}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-text-secondary">
        <span data-testid="assistant-provider-model">{entry.provider}/{entry.model}</span>
        <span>·</span>
        <Link href={entry.drillDownUrl} className="text-accent transition hover:text-text-primary">
          Drill-down
        </Link>
      </div>
    </>
  );
}

export function AssistantConversation({ mode = "page", focusToken = 0, onClose }: AssistantConversationProps) {
  const api = useApi();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const responsesRef = useRef<HTMLDivElement | null>(null);
  const isPageMode = mode === "page";

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AssistantMessageCard[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [transcriptExpiresAt, setTranscriptExpiresAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [placeholder, setPlaceholder] = useState(() => pickAssistantPromptPlaceholder());

  useEffect(() => {
    const storage = getAssistantConversationStorage();
    const snapshot = getStoredAssistantTranscriptSnapshot(storage);
    setConversationId(snapshot?.conversationId ?? getStoredAssistantConversationId(storage));
    setMessages(snapshot?.messages ?? []);
    setTranscriptExpiresAt(snapshot?.expiresAt ?? null);
  }, []);

  useEffect(() => {
    if (focusToken <= 0) {
      return;
    }

    if (transcriptExpiresAt && Date.parse(transcriptExpiresAt) <= Date.now()) {
      clearConversationState();
    }
    inputRef.current?.focus();
  }, [focusToken, transcriptExpiresAt]);

  useEffect(() => {
    if (!transcriptExpiresAt) {
      return;
    }

    const timeoutMs = Date.parse(transcriptExpiresAt) - Date.now();
    if (timeoutMs <= 0) {
      clearConversationState();
      return;
    }

    const timeout = window.setTimeout(() => {
      clearConversationState();
    }, timeoutMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [transcriptExpiresAt]);

  useEffect(() => {
    if (!responsesRef.current) {
      return;
    }
    responsesRef.current.scrollTop = responsesRef.current.scrollHeight;
  }, [messages]);

  const emptyState = useMemo(
    () => (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center opacity-70">
        <Bot className="h-12 w-12 text-accent" aria-hidden="true" />
        <p className="max-w-md text-sm text-text-secondary">
          I&apos;m Minance AI. I can analyze transactions, find anomalies, and explain spending changes.
        </p>
      </div>
    ),
    []
  );

  async function askAssistant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) {
      return;
    }

    const question = input.trim();
    if (!question) {
      setMessage("Enter a question first.");
      return;
    }

    const pendingId = createPendingMessageId();
    const pendingMessage = createPendingAssistantMessage(question, {
      id: pendingId,
      emoji: pickAssistantThinkingEmoji()
    });

    setIsLoading(true);
    setMessage("");
    setInput("");
    setPlaceholder(pickAssistantPromptPlaceholder());
    setMessages((prev) => [...prev, pendingMessage].slice(-MESSAGE_LIMIT));

    try {
      const result = await submitAssistantQuestion({
        question,
        assistant: api.assistant,
        storage: getAssistantConversationStorage(),
        conversationId
      });
      const nextExpiresAt = createAssistantTranscriptExpiry();
      setConversationId(result.conversationId);
      setTranscriptExpiresAt(nextExpiresAt);
      setMessages((prev) => {
        const nextMessages = replaceAssistantMessage(prev, pendingId, result.query);
        persistAssistantTranscriptSnapshot(getAssistantConversationStorage(), {
          conversationId: result.conversationId,
          messages: nextMessages,
          expiresAt: nextExpiresAt
        });
        return nextMessages;
      });
    } catch (error) {
      const errorMessage = getAssistantRequestError(error);
      setMessage(errorMessage);
      setMessages((prev) =>
        replaceAssistantMessage(prev, pendingId, {
          ...pendingMessage,
          state: "error",
          answer: errorMessage
        })
      );
    } finally {
      setIsLoading(false);
    }
  }

  function clearConversationState(nextMessage = "") {
    clearStoredAssistantConversationState(getAssistantConversationStorage());
    setConversationId(null);
    setMessages([]);
    setTranscriptExpiresAt(null);
    setMessage(nextMessage);
  }

  function resetConversation() {
    clearConversationState("Started a new conversation.");
    setInput("");
    setPlaceholder(pickAssistantPromptPlaceholder());
    inputRef.current?.focus();
  }

  return (
    <div className={isPageMode ? "flex h-[calc(100vh-11rem)] flex-col" : "flex h-full flex-col"} data-testid={isPageMode ? "chat-page" : "assistant-sidebar-content"}>
      {isPageMode ? (
        <header className="flex items-start justify-between gap-4 pb-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">AI Assistant</h2>
            <p className="mt-1 text-text-secondary">Ask questions about your spending patterns.</p>
          </div>
          <button
            type="button"
            onClick={resetConversation}
            disabled={isLoading}
            data-testid="assistant-new-conversation"
            className={SECONDARY_BUTTON_CLASS}
          >
            New conversation
          </button>
        </header>
      ) : (
        <header className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-text-primary">AI Assistant</h2>
            <p className="text-xs text-text-secondary">Ask questions about your spending patterns.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetConversation}
              disabled={isLoading}
              data-testid="assistant-new-conversation"
              className={PANEL_SECONDARY_BUTTON_CLASS}
            >
              New conversation
            </button>
            <button
              type="button"
              onClick={onClose}
              data-testid="assistant-close"
              className={PANEL_ICON_BUTTON_CLASS}
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>
      )}

      {message ? (
        <StatusMessage className={isPageMode ? "mb-3" : "mx-4 mt-3"}>
          {message}
        </StatusMessage>
      ) : null}

      <section className={cn(ASSISTANT_SECTION_CLASS, !isPageMode && "mx-4 my-3")}>
        <div ref={responsesRef} className="flex-1 overflow-y-auto p-4" data-testid="assistant-responses">
          {messages.length === 0 ? (
            emptyState
          ) : (
            <div className="space-y-5">
              {messages.map((entry) => (
                <article key={entry.id} className={MESSAGE_CARD_CLASS}>
                  <div className="flex justify-end gap-3">
                    <div className="max-w-[90%] rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">
                      {entry.question}
                    </div>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-accent/35 bg-accent text-app-bg">
                      <User className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle bg-surface-field text-accent">
                      <Bot className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className={ASSISTANT_BUBBLE_CLASS}>
                      {renderAssistantBody(entry)}
                      {renderAssistantFooter(entry)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={askAssistant} className="border-t border-border-subtle bg-surface-panel/90 p-4">
          <div className="relative">
            <label htmlFor="assistant-question-input" className="sr-only">
              Ask the assistant a question
            </label>
            <input
              id="assistant-question-input"
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={placeholder}
              disabled={isLoading}
              data-testid="assistant-question"
              className="w-full rounded-full border border-border-subtle bg-surface-field py-3 pl-4 pr-14 text-sm text-text-primary placeholder:text-text-secondary outline-none transition focus:border-accent focus-visible:ring-2 focus-visible:ring-focus-ring"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              data-testid="assistant-ask"
              aria-label="Send question to assistant"
              className={cn(
                "absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-app-bg transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-surface-elevated disabled:text-text-secondary",
                FOCUS_RING_CLASS
              )}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
