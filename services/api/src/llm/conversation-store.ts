// services/api/src/llm/conversation-store.ts

import type { ToolCallingMessage } from "./client.ts";

export interface ConversationSession {
  id: string;
  userId: string;
  messages: ToolCallingMessage[];
  resultCache: Map<string, unknown>;
  createdAt: string;
  expiresAt: string;
}

export interface ConversationStore {
  get(id: string): Promise<ConversationSession | null>;
  set(id: string, session: ConversationSession): Promise<void>;
  delete(id: string): Promise<void>;
}

// Cleanup interval for expired sessions (runs every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

export class InMemoryConversationStore implements ConversationStore {
  private sessions = new Map<string, ConversationSession>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Start periodic cleanup
    this.cleanupTimer = setInterval(() => this.cleanupExpired(), CLEANUP_INTERVAL_MS);
  }

  private cleanupExpired(): void {
    const now = new Date();
    for (const [id, session] of this.sessions) {
      if (new Date(session.expiresAt) < now) {
        this.sessions.delete(id);
      }
    }
  }

  async get(id: string): Promise<ConversationSession | null> {
    const session = this.sessions.get(id);
    if (!session) {
      return null;
    }

    // Check expiration
    if (new Date(session.expiresAt) < new Date()) {
      this.sessions.delete(id);
      return null;
    }

    return session;
  }

  async set(id: string, session: ConversationSession): Promise<void> {
    this.sessions.set(id, session);
  }

  async delete(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  /** Stop the cleanup timer (for testing/shutdown) */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Singleton instance for default use
export const defaultConversationStore = new InMemoryConversationStore();