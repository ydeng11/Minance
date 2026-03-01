"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import { useSession } from "@/lib/session";

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
    <main className="grid min-h-screen place-items-center bg-neutral-950 p-4">
      <section className="w-full max-w-md rounded-3xl border border-neutral-900 bg-neutral-950/80 p-8 shadow-2xl shadow-emerald-950/10" data-testid="auth-panel">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-100">Minance</h1>
        <p className="mt-2 text-sm text-neutral-400">Privacy-first money intelligence without bank linking.</p>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("login")}
            data-testid="auth-tab-login"
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              mode === "login"
                ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-100"
                : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            data-testid="auth-tab-signup"
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              mode === "signup"
                ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-100"
                : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 grid gap-3" data-testid={mode === "login" ? "login-form" : "signup-form"}>
          <label className="grid gap-1 text-sm text-neutral-300">
            Email
            <input
              data-testid="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              required
            />
          </label>

          <label className="grid gap-1 text-sm text-neutral-300">
            Password
            <input
              data-testid="auth-password"
              type="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              required
            />
          </label>

          <button
            type="submit"
            data-testid="auth-submit"
            disabled={isSubmitting}
            className="mt-1 rounded-full border border-emerald-500/50 bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:from-emerald-400 hover:to-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Working..." : mode === "login" ? "Login" : "Create account"}
          </button>
        </form>

        <p className="mt-3 min-h-5 text-sm text-red-400" data-testid="auth-message">{message}</p>
      </section>
    </main>
  );
}
