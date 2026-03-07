# Legacy Loader User Password Design

## Summary

Extend the legacy API import flow so migrated data can be attached to a specific login account created or updated from explicit CLI inputs.

The target workflow is:

```bash
pnpm seed:legacy-api -- --user-email dev@minance.local --user-password 12345678
```

This should provision the target auth account for the imported data without depending on the dev seed email configured in `.env.local`.

## Goals

- Allow the legacy API loader to accept an explicit target email and password.
- Create the target user if it does not exist.
- Update the target user's password on rerun when an explicit password is provided.
- Keep existing `--user-email` behavior working when no password is provided.
- Keep the change scoped to the legacy API import workflow.

## Non-Goals

- Changing normal signup or login behavior.
- Changing the separate SQLite migration path in `services/api/src/migration.ts`.
- Changing unrelated dev seed behavior beyond avoiding account conflicts.

## Preferred Approach

Extend the existing legacy API loader flow that already owns user resolution for imports.

Today:
- `scripts/load-legacy-api.ts` accepts `--user-email`.
- `services/api/src/legacy-api-loader.ts` resolves that email to a user ID.
- If the email does not exist, it creates a user with `DEV_TEST_ACCOUNT_PASSWORD`.

New behavior:
- Add `--user-password` to the CLI.
- Pass `userPassword` into `seedFromLegacyApiToStore()`.
- Extend the user-resolution helper to create or update the target user with the explicit password.
- Preserve the current fallback to `DEV_TEST_ACCOUNT_PASSWORD` when an email is provided without a password.

This keeps the logic local to the migration path and avoids coupling migration account provisioning to whichever dev seed account is configured in the environment.

## Alternatives Considered

### 1. Keep using only `DEV_TEST_ACCOUNT_PASSWORD`

Pros:
- Smallest code change.

Cons:
- Migration behavior remains coupled to unrelated dev seed config.
- Reruns are brittle when the desired migrated account differs from the seeded dev account.

### 2. Add a generic shared auth helper first

Pros:
- Cleaner long-term reuse if more migration paths need account provisioning.

Cons:
- Larger surface area than this task needs.
- Adds refactoring risk in auth-sensitive code for little immediate gain.

## Approved Behavior

- `--user-email` plus `--user-password` is the explicit migration account mode.
- If the target email does not exist, the loader creates it with the provided password.
- If the target email already exists and a password is provided, the loader updates that user's password before importing data.
- If `--user-password` is passed without `--user-email`, the CLI fails fast with a clear error.
- If `--user-email` is passed without `--user-password`, the loader keeps the current fallback to `DEV_TEST_ACCOUNT_PASSWORD`.
- Password validation reuses the existing minimum length rule of 8 characters.

## Error Handling

- Reject `--user-password` without `--user-email`.
- Reject passwords shorter than 8 characters.
- Keep import failures separate from user provisioning failures so the user gets a direct error message.

## Testing Strategy

- Add a loader-level test proving email plus password creates a loginable user.
- Add a loader-level test proving rerunning with the same email and a new explicit password updates credentials.
- Add CLI validation coverage for `--user-password` without `--user-email`.
- Verify the legacy loader’s existing import tests still pass.
