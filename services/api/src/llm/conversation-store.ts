// services/api/src/llm/conversation-store.ts

/**
 * Represents a message in a tool-calling conversation.
 * This type supports the OpenAI-style message format with optional tool calls.
 */
export interface ToolCallingMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

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

export class InMemoryConversationStore implements ConversationStore {
  private sessions = new Map<string, ConversationSession>();

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
}

// Singleton instance for default use
export const defaultConversationStore = new InMemoryConversationStore();