"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createApiClient, type RequestOptions } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import { TOKEN_STORAGE_KEY } from "@/lib/constants";
import type { Tokens, User } from "@/lib/api/types";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

interface SessionContextValue {
  status: SessionStatus;
  user: User | null;
  tokens: Tokens | null;
  request: <T>(path: string, options?: RequestOptions) => Promise<T>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function readStoredTokens(): Tokens | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Tokens;
  } catch {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return null;
  }
}

function persistTokens(tokens: Tokens | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (!tokens) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return;
  }
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [tokens, setTokensState] = useState<Tokens | null>(() => readStoredTokens());
  const [status, setStatus] = useState<SessionStatus>(tokens ? "loading" : "unauthenticated");
  const [user, setUser] = useState<User | null>(null);

  const setTokens = useCallback((nextTokens: Tokens | null) => {
    setTokensState(nextTokens);
    persistTokens(nextTokens);
  }, []);

  const onAuthFailure = useCallback(() => {
    setTokens(null);
    setUser(null);
    setStatus("unauthenticated");
  }, [setTokens]);

  const client = useMemo(
    () =>
      createApiClient({
        getTokens: () => tokens,
        setTokens,
        onAuthFailure
      }),
    [onAuthFailure, setTokens, tokens]
  );

  const refreshUser = useCallback(async () => {
    const me = await authApi.me(client.request);
    setUser(me.user);
    setStatus("authenticated");
  }, [client.request]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login(client.request, email, password);
      setTokens(result.tokens);
      setUser(result.user);
      setStatus("authenticated");
    },
    [client.request, setTokens]
  );

  const signup = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.signup(client.request, email, password);
      setTokens(result.tokens);
      setUser(result.user);
      setStatus("authenticated");
    },
    [client.request, setTokens]
  );

  const logout = useCallback(() => {
    setTokens(null);
    setUser(null);
    setStatus("unauthenticated");
  }, [setTokens]);

  useEffect(() => {
    if (!tokens) {
      return;
    }

    authApi
      .me(client.request)
      .then((result) => {
        setUser(result.user);
        setStatus("authenticated");
      })
      .catch(() => {
        onAuthFailure();
      });
  }, [client.request, onAuthFailure, tokens]);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      user,
      tokens,
      request: client.request,
      login,
      signup,
      logout,
      refreshUser
    }),
    [status, user, tokens, client.request, login, signup, logout, refreshUser]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}
