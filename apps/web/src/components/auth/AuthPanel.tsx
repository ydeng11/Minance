"use client";

import Image from "next/image";
import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import { StatusMessage } from "@/components/feedback/StatusMessage";
import { useSession } from "@/lib/session";

const AUTH_TAB_BASE_CLASS = "rounded-full border px-4 py-2 text-sm font-medium transition";
const AUTH_TAB_ACTIVE_CLASS = "border-accent/35 bg-accent-soft text-accent";
const AUTH_TAB_INACTIVE_CLASS = "border-border-subtle bg-surface-field text-text-secondary hover:bg-surface-elevated hover:text-text-primary";
const AUTH_INPUT_CLASS =
  "w-full rounded-xl border border-border-subtle bg-surface-field px-3 py-2 text-text-primary outline-none transition focus:border-accent focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";

function getAuthTabClass(isSelected: boolean) {
  return `${AUTH_TAB_BASE_CLASS} ${isSelected ? AUTH_TAB_ACTIVE_CLASS : AUTH_TAB_INACTIVE_CLASS}`;
}

export function AuthPanel() {
  const { login, signup } = useSession();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Request failed");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-app-bg p-4 text-text-primary">
      <section
        className="w-full max-w-md rounded-3xl border border-border-subtle bg-surface-panel/90 p-8 shadow-dialog"
        data-testid="auth-panel"
      >
        <div className="flex items-center gap-3">
          <Image
            src="/iHelio.svg"
            alt=""
            width={42}
            height={32}
            className="h-8 w-auto"
            aria-hidden="true"
            priority
          />
          <h1 className="font-display text-3xl font-semibold tracking-tight text-text-primary">Minance</h1>
        </div>
        <p className="mt-2 text-sm text-text-secondary">Privacy-first money intelligence without bank linking.</p>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("login")}
            data-testid="auth-tab-login"
            className={getAuthTabClass(mode === "login")}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            data-testid="auth-tab-signup"
            className={getAuthTabClass(mode === "signup")}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 grid gap-3" data-testid={mode === "login" ? "login-form" : "signup-form"}>
          <label className="grid gap-1 text-sm text-text-secondary">
            Email
            <input
              data-testid="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={AUTH_INPUT_CLASS}
              required
            />
          </label>

          <label className="grid gap-1 text-sm text-text-secondary">
            Password
            <input
              data-testid="auth-password"
              type="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={AUTH_INPUT_CLASS}
              required
            />
          </label>

          <button
            type="submit"
            data-testid="auth-submit"
            disabled={isSubmitting}
            className="mt-1 rounded-full border border-accent/35 bg-accent px-4 py-2 text-sm font-semibold text-app-bg transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Working..." : mode === "login" ? "Login" : "Create account"}
          </button>
        </form>

        <div className="mt-3 min-h-5" data-testid="auth-message">
          {message ? (
            <StatusMessage tone="error">
              {message}
            </StatusMessage>
          ) : null}
        </div>
      </section>
    </main>
  );
}
