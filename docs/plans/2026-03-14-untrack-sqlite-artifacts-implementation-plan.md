# Untrack SQLite Artifacts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stop tracking runtime SQLite database files under `services/api/data/` while keeping local files on disk and preserving the rest of the repo's SQLite-related assets.

**Architecture:** Add a narrow ignore rule for `services/api/data/*.sqlite*`, then remove the currently tracked runtime database artifacts from the git index only. Use git-state assertions to verify those paths are ignored and no longer tracked, without broadening the change to other SQLite-named files in docs, scripts, or tests.

**Tech Stack:** Git, `.gitignore`, shell verification commands, Node test runner where useful, pnpm.

---

### Task 1: Lock the targeted git-state expectation

**Files:**
- Create: `scripts/untrack-sqlite-artifacts.test.mjs`
- Modify: `package.json`

**Step 1: Write the failing test**

Create a small test that asserts:

- `services/api/data/minance.sqlite`
- `services/api/data/minance.sqlite.bak.20260306-221455`
- `services/api/data/minance.sqlite.bak.20260307-085144`

are not tracked by git and are ignored by the repo configuration.

**Step 2: Run test to verify it fails**

Run:

```bash
node --test scripts/untrack-sqlite-artifacts.test.mjs
```

Expected: FAIL because those SQLite artifacts are still tracked in the current branch baseline.

**Step 3: Write minimal implementation**

- add the test file
- if useful, add a dedicated root script entry for running this regression

**Step 4: Run test to verify it still fails for the right reason**

Run:

```bash
node --test scripts/untrack-sqlite-artifacts.test.mjs
```

Expected: FAIL specifically because the SQLite artifacts are still tracked or not ignored yet.

**Step 5: Commit**

```bash
git add scripts/untrack-sqlite-artifacts.test.mjs package.json
git commit -m "test: lock sqlite artifact untracking behavior"
```

### Task 2: Add the ignore rule and untrack the runtime artifacts

**Files:**
- Modify: `.gitignore`
- Remove from index: `services/api/data/minance.sqlite`
- Remove from index: `services/api/data/minance.sqlite.bak.20260306-221455`
- Remove from index: `services/api/data/minance.sqlite.bak.20260307-085144`

**Step 1: Implement the minimal cleanup**

- add a narrow ignore rule for `services/api/data/*.sqlite*`
- remove the tracked SQLite runtime artifacts from the git index only

**Step 2: Run the regression test**

Run:

```bash
node --test scripts/untrack-sqlite-artifacts.test.mjs
```

Expected: PASS.

**Step 3: Verify with git commands**

Run:

```bash
git ls-files 'services/api/data/*.sqlite*'
git check-ignore -v services/api/data/minance.sqlite services/api/data/minance.sqlite.bak.20260306-221455 services/api/data/minance.sqlite.bak.20260307-085144
git status --ignored --short services/api/data
```

Expected:

- `git ls-files` returns no tracked SQLite runtime artifacts under `services/api/data/`
- `git check-ignore -v` points at the new `.gitignore` rule
- `git status --ignored` shows the local files as ignored, not tracked

**Step 4: Commit**

```bash
git add .gitignore scripts/untrack-sqlite-artifacts.test.mjs package.json
git add -u services/api/data/minance.sqlite services/api/data/minance.sqlite.bak.20260306-221455 services/api/data/minance.sqlite.bak.20260307-085144
git commit -m "chore: stop tracking sqlite runtime artifacts"
```

### Task 3: Final focused verification

**Files:**
- No new code changes expected

**Step 1: Re-run the regression test**

Run:

```bash
node --test scripts/untrack-sqlite-artifacts.test.mjs
```

Expected: PASS.

**Step 2: Re-run the git-state verification**

Run:

```bash
git ls-files 'services/api/data/*.sqlite*'
git check-ignore -v services/api/data/minance.sqlite services/api/data/minance.sqlite.bak.20260306-221455 services/api/data/minance.sqlite.bak.20260307-085144
git status --short
```

Expected:

- no tracked runtime SQLite artifacts remain
- the worktree reflects only the intended `.gitignore`, test, and index-removal changes

**Step 3: Commit if needed**

```bash
git status --short
```

Confirm the branch is clean after the final verification.
