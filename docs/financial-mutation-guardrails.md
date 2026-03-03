# Financial Mutation Safety Guardrails

This document defines the safety behavior for financial write operations in the self-host API (`services/api`).

## Scope

- Transaction writes:
  - `POST /v1/transactions`
  - `PUT /v1/transactions/:id`
  - `DELETE /v1/transactions/:id`
  - `POST /v1/transactions/:id/restore`
- Category writes:
  - `PUT /v1/category-strategy`
  - `POST /v1/categories`
  - `POST /v1/category-rules`

## Idempotency

- Supported via request header: `Idempotency-Key`.
- Keys are scoped to `user + mutation route scope`.
- Repeating the same request with the same key returns the original response shape and status.
- Reusing a key with a different payload returns `400` with an invalid idempotency key error.
- Idempotency outcomes are recorded in `audit_events` as `mutation.idempotency.recorded`.

## Delete Safety (Soft Delete + Undo)

- `DELETE /v1/transactions/:id` is a soft delete:
  - Marks the transaction as deleted instead of physically removing it.
  - Writes audit event `transaction.delete.soft`.
- Soft-deleted transactions are excluded from:
  - `GET /v1/transactions`
  - Analytics rollups and overview calculations
  - Data bounds metadata
- Undo is supported by:
  - `POST /v1/transactions/:id/restore`
  - Writes audit event `transaction.restore`.

## Audit Trail Expectations

- Every mutation is auditable through `audit_events`.
- Guardrail metadata includes:
  - idempotency key
  - mutation scope
  - request fingerprint
  - response status and payload (for replay)
- Transaction lifecycle events include create, update, soft delete, and restore.
