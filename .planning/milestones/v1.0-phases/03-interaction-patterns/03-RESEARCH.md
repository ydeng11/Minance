# Phase 3: Interaction Patterns — Research

**Date:** 2026-04-04

## Toast (INTX-03, INTX-05)

- **Sonner** — minimal API (`toast.success`, `toast.error`, `toast.promise`), supports action buttons for undo, theme-friendly for dark UI, widely used with Next.js App Router via client `Toaster` in layout/providers.

## Command palette (INTX-06)

- **cmdk** — unstyled primitives; pair with existing Tailwind tokens for a Minance-styled dialog; register navigation links and actions mirroring sidebar routes.

## Validation (INTX-01, INTX-02)

- Reuse existing Zod/validation in `form.ts`; add blur handlers and ensure invalid submit does not wipe controlled fields (already mostly controlled inputs).

## Optimistic updates (INTX-04)

- Prefer local React state rollback: snapshot previous list/entity on mutate, revert on `ApiError`.
