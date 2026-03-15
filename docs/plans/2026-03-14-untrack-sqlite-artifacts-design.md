# Untrack SQLite Artifacts Design

## Scope

Stop tracking runtime SQLite database files under `services/api/data/` while preserving the rest of the repository's SQLite-related docs, scripts, and tests.

## Goals

- Remove tracked SQLite database artifacts from git without deleting the local files.
- Prevent `services/api/data/*.sqlite*` files from being reintroduced into git status after local runtime changes.
- Keep all SQLite-related code, migration docs, and tests tracked.

## Non-Goals

- Remove or rewrite SQLite support in the application.
- Ignore every `*.sqlite*` file across the whole repository.
- Delete local database files from disk.

## Decisions

### 1. Target only the runtime database directory

The tracked SQLite artifacts currently live in `services/api/data/`. Restricting the cleanup to that directory avoids hiding future fixtures or intentional assets elsewhere in the repo.

### 2. Remove from the index, not from disk

The cleanup should use git index removal so developers keep their local database files while the repository stops tracking them.

### 3. Keep ignore rules explicit

Add a narrow `.gitignore` rule for `services/api/data/*.sqlite*` instead of a repo-wide `*.sqlite*` pattern. That keeps intent obvious and reduces accidental overreach.

## Architecture

- `.gitignore` will carry the new ignore rule for SQLite runtime artifacts in `services/api/data/`.
- Git index cleanup will untrack the currently committed runtime database and backup files under that directory.
- Verification will use git-native commands to confirm those files are ignored and no longer tracked.

## Data Flow

1. Git reads `.gitignore` and treats `services/api/data/*.sqlite*` as ignored paths.
2. `git rm --cached` removes the already tracked SQLite artifacts from the index.
3. The files stay on each developer's disk, but future local mutations stop appearing as tracked changes.

## Error Handling

- If no SQLite artifacts are currently tracked, the cleanup should leave the repo unchanged except for the ignore rule.
- If extra SQLite files appear outside `services/api/data/`, they remain unaffected and visible to git.

## Testing Strategy

- Add a small git-state regression test around the tracked SQLite artifacts list and ignore rule.
- Verify with `git ls-files`, `git check-ignore`, and `git status --ignored` in the isolated worktree after the change.

## Risks

- Accidentally ignoring too broadly could hide intentional future fixtures.
  Mitigation: keep the pattern limited to `services/api/data/*.sqlite*`.

- Removing tracked files from git can surprise collaborators if the path is still assumed to be versioned.
  Mitigation: document the cleanup in the design/plan and keep the removal limited to obvious runtime DB artifacts.
