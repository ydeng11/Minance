# Operator Runbook: Transaction and Category Lifecycle

This runbook covers day-to-day operator procedures for managing categories and manual transactions in self-hosted Minance Next.

## 1. Preconditions

- API is reachable and healthy:
  - `GET /healthz` -> `200`
  - `GET /readyz` -> `200`
- Operator account can log in.
- You have a current backup snapshot (`scripts/selfhost-backup.sh`) before bulk edits.

## 2. Authentication Session

1. Login:

```bash
curl -sS -X POST http://localhost:3001/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"<password>"}'
```

2. Save `accessToken` from the response and include this header on protected endpoints:
   `Authorization: Bearer <accessToken>`

## 3. Category Lifecycle

### 3.1 List categories

```bash
curl -sS http://localhost:3001/v1/categories \
  -H "Authorization: Bearer <accessToken>"
```

### 3.2 Create category

```bash
curl -sS -X POST http://localhost:3001/v1/categories \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer <accessToken>" \
  -d '{
    "name":"Pet Care",
    "emoji":":paw_prints:",
    "coarseKey":"living"
  }'
```

Expected result:
- `201` with `category.id`.
- Audit event emitted: `category.create`.

Operational notes:
- `name` is required and must be at least 2 characters.
- Category creation currently supports add-only flow via API. Plan rollback before creation.

## 4. Manual Transaction Lifecycle

### 4.1 Create transaction

```bash
curl -sS -X POST http://localhost:3001/v1/transactions \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer <accessToken>" \
  -d '{
    "transaction_date":"2026-03-01",
    "description":"Vet visit",
    "merchant_raw":"Neighborhood Vet",
    "amount":"-92.40",
    "category_final":"Pet Care",
    "account_name":"Checking"
  }'
```

Expected result:
- `201` with `transaction.id`.
- Audit event emitted: `transaction.manual.create`.

### 4.2 Edit transaction

```bash
curl -sS -X PUT http://localhost:3001/v1/transactions/<transactionId> \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer <accessToken>" \
  -d '{
    "amount":"-89.40",
    "memo":"Applied coupon",
    "category_final":"Pet Care"
  }'
```

Expected result:
- `200` with updated transaction.
- Audit event emitted: `transaction.update`.

### 4.3 Delete transaction

```bash
curl -sS -X DELETE http://localhost:3001/v1/transactions/<transactionId> \
  -H "Authorization: Bearer <accessToken>"
```

Expected result:
- `204` empty response.
- Audit event emitted: `transaction.delete`.

## 5. Rollback Guidance

### 5.1 Single transaction rollback

- If a transaction was created or edited incorrectly:
  1. Capture current record via `GET /v1/transactions`.
  2. If wrong and unrecoverable, delete it (`DELETE /v1/transactions/:id`).
  3. Recreate using original values (`POST /v1/transactions`).

### 5.2 Category rollback

- Category API currently supports creation but not dedicated delete/update endpoints.
- Preferred rollback strategy:
  1. Create corrected replacement category.
  2. Reclassify impacted transactions to the replacement category via transaction updates.
  3. Keep old category for historical traceability until broader cleanup tooling is available.

### 5.3 Full data rollback (incident scope)

1. Stop write traffic.
2. Restore latest verified backup (`scripts/selfhost-restore.sh --apply`).
3. Validate login, transactions list, and categories list.
4. Re-open write traffic.

## 6. Troubleshooting Common Validation/Data Errors

| Symptom | Likely cause | Action |
|---|---|---|
| `400 Category name is required` | Missing/short `name` in category create payload | Send `name` with 2+ chars |
| `400 transaction_date is required` | Missing or invalid `transaction_date` | Use `YYYY-MM-DD` |
| `400 amount must be numeric` | Non-numeric `amount` value | Send numeric string/number |
| `400 description is required` | Missing transaction description | Populate `description` |
| `401 Unauthorized` | Missing/expired bearer token | Re-login and retry |
| `404 Transaction not found` | Wrong/deleted transaction id | Re-query transactions and retry |
| `429 Rate limit exceeded` | Burst traffic exceeded API limits | Back off and retry after `Retry-After` |

## 7. Post-Change Verification

- [ ] `GET /v1/categories` shows expected category set.
- [ ] `GET /v1/transactions` reflects expected values and counts.
- [ ] No unexpected `4xx`/`5xx` spikes in API logs.
- [ ] Backup snapshot taken after significant lifecycle changes.
