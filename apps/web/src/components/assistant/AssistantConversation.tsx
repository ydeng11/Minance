"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Loader2, Send, User, X } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/hooks/useApi";
import type { AssistantMessageCard } from "@/lib/chat/adapter";
import {
  appendAssistantQuery,
  clearStoredAssistantConversationId,
  getStoredAssistantConversationId,
  submitAssistantQuestion
} from "@/lib/chat/conversation";

interface AssistantConversationProps {
  mode?: "page" | "panel";
  focusToken?: number;
  onClose?: () => void;
}

function getAssistantConversationStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function AssistantConversation({ mode = "page", focusToken = 0, onClose }: AssistantConversationProps) {
  const api = useApi();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const responsesRef = useRef<HTMLDivElement | null>(null);
  const isPageMode = mode === "page";

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AssistantMessageCard[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setConversationId(getStoredAssistantConversationId(getAssistantConversationStorage()));
  }, []);

  useEffect(() => {
    if (focusToken <= 0) {
      return;
    }
    inputRef.current?.focus();
  }, [focusToken]);

  useEffect(() => {
    if (!responsesRef.current) {
      return;
    }
    responsesRef.current.scrollTop = responsesRef.current.scrollHeight;
  }, [messages]);

  const emptyState = useMemo(
    () => (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center opacity-70">
        <Bot className="h-12 w-12 text-emerald-500" />
        <p className="max-w-md text-sm text-neutral-400">
          I&apos;m Minance AI. I can analyze transactions, find anomalies, and explain spending changes.
        </p>
      </div>
    ),
    []
  );

  async function askAssistant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();
    if (!question) {
      setMessage("Enter a question first.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const result = await submitAssistantQuestion({
        question,
        assistant: api.assistant,
        storage: getAssistantConversationStorage(),
        conversationId
      });
      setConversationId(result.conversationId);
      setMessages((prev) => appendAssistantQuery(prev, result.query));
      setInput("");
      setMessage("Assistant response ready.");
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Assistant request failed.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  function resetConversation() {
    clearStoredAssistantConversationId(getAssistantConversationStorage());
    setConversationId(null);
    setMessages([]);
    setMessage("Started a new conversation.");
    inputRef.current?.focus();
  }

  return (
    <div className={isPageMode ? "flex h-[calc(100vh-11rem)] flex-col" : "flex h-full flex-col"} data-testid={isPageMode ? "chat-page" : "assistant-sidebar-content"}>
      {isPageMode ? (
        <header className="flex items-start justify-between gap-4 pb-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">AI Assistant</h2>
            <p className="mt-1 text-neutral-400">Ask questions about your spending patterns.</p>
          </div>
          <button
            type="button"
            onClick={resetConversation}
            disabled={isLoading}
            data-testid="assistant-new-conversation"
            className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            New conversation
          </button>
        </header>
      ) : (
        <header className="flex items-center justify-between border-b border-neutral-900 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-neutral-100">AI Assistant</h2>
            <p className="text-xs text-neutral-400">Ask questions about your spending patterns.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetConversation}
              disabled={isLoading}
              data-testid="assistant-new-conversation"
              className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 transition hover:bg-neutral-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              New conversation
            </button>
            <button
              type="button"
              onClick={onClose}
              data-testid="assistant-close"
              className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-2 text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>
      )}

      {message ? (
        <p className={isPageMode ? "mb-3 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-300" : "mx-4 mt-3 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-300"} data-testid="global-message">
          {message}
        </p>
      ) : null}

      <section className={isPageMode ? "flex flex-1 flex-col overflow-hidden rounded-2xl border border-neutral-900 bg-neutral-950/70" : "mx-4 my-3 flex flex-1 flex-col overflow-hidden rounded-2xl border border-neutral-900 bg-neutral-950/70"}>
        <div ref={responsesRef} className="flex-1 overflow-y-auto p-4" data-testid="assistant-responses">
          {messages.length === 0 ? (
            emptyState
          ) : (
            <div className="space-y-5">
              {messages.map((entry) => (
                <article key={entry.id} className="space-y-3 rounded-xl border border-neutral-900 bg-neutral-950 p-4">
                  <div className="flex justify-end gap-3">
                    <div className="max-w-[90%] rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50">
                      {entry.question}
                    </div>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-emerald-400 bg-emerald-500 text-neutral-950">
                      <User className="h-4 w-4" />
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-700 bg-neutral-900 text-emerald-400">
                      <Bot className="h-4 w-4" />
                    </span>
                    <div className="w-full rounded-2xl border border-neutral-700/50 bg-neutral-900/70 px-4 py-3 text-sm text-neutral-200">
                      <p>{entry.answer}</p>
                      {entry.highlights.length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {entry.highlights.map((item) => (
                            <span key={item} className="rounded-full bg-neutral-800 px-2 py-1 text-[11px] text-neutral-300">
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                        <span data-testid="assistant-provider-model">{entry.provider}/{entry.model}</span>
                        <span>·</span>
                        <Link href={entry.drillDownUrl} className="text-emerald-400 hover:text-emerald-300">
                          Drill-down
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={askAssistant} className="border-t border-neutral-900 bg-neutral-950/90 p-4">
          <div className="relative">
            <label htmlFor="assistant-question-input" className="sr-only">
              Ask the assistant a question
            </label>
            <input
              id="assistant-question-input"
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="How much did I spend on dining last month?"
              data-testid="assistant-question"
              className="w-full rounded-full border border-neutral-800 bg-neutral-950 py-3 pl-4 pr-12 text-sm text-neutral-100 outline-none transition focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              data-testid="assistant-ask"
              aria-label="Send question to assistant"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-emerald-500 p-2 text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
