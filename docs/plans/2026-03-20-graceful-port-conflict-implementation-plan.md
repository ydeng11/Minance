# Graceful Port Conflict Handling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the combined startup flows auto-select open web and API ports with warnings, while keeping the web rewrite pointed at the resolved API port.

**Architecture:** Add a small root-level orchestration script that resolves open ports starting from `3000` and `3001`, prints warnings when defaults are occupied, and launches both child processes with coordinated environment values. Update the `just` recipes to call that script so the documented startup path becomes graceful without changing the direct single-service commands.

**Tech Stack:** TypeScript, Node.js `net` and `child_process`, `tsx`, `just`, pnpm, Node test runner.

---

### Task 1: Add failing coverage for the orchestration script

**Files:**
- Create: `scripts/run-with-open-ports.test.ts`
- Modify: `package.json`

**Step 1: Write the failing test**

Create a CLI-style test that:

- occupies port `3000`
- occupies port `3001`
- runs `tsx scripts/run-with-open-ports.ts dev --dry-run`
- expects JSON output showing the web port moved to `3002`
- expects JSON output showing the API port moved to `3003`
- expects warning messages mentioning the reassignments
- expects the generated web environment to include `MINANCE_API_ORIGIN=http://127.0.0.1:3003`

Also add a second test showing that when the preferred ports are free, the dry-run output keeps `3000` and `3001` with no warnings.

**Step 2: Run the test to verify it fails**

Run:

```bash
env NODE_ENV=test pnpm exec tsx --test scripts/run-with-open-ports.test.ts
```

Expected: FAIL because `scripts/run-with-open-ports.ts` does not exist yet.

**Step 3: Wire the test into the root suite**

Update `package.json` so the root test flow includes `scripts/run-with-open-ports.test.ts`.

**Step 4: Commit**

```bash
git add package.json scripts/run-with-open-ports.test.ts
git commit -m "test: add startup port orchestration coverage"
```

### Task 2: Implement the orchestration script

**Files:**
- Create: `scripts/run-with-open-ports.ts`

**Step 1: Write the minimal implementation**

Implement:

- a helper that checks whether a port can be bound
- a helper that increments from the preferred port until a free port is found
- a dry-run mode that prints a JSON plan for tests
- `dev` and `start` command builders that:
  - start the API with the resolved `PORT`
  - start the web with the resolved `--port`
  - pass `MINANCE_API_ORIGIN=http://127.0.0.1:<resolved-api-port>` to the web process
- warning output when a preferred port was occupied
- signal forwarding and sibling shutdown when running the real child processes

**Step 2: Run the focused test to verify it passes**

Run:

```bash
env NODE_ENV=test pnpm exec tsx --test scripts/run-with-open-ports.test.ts
```

Expected: PASS.

**Step 3: Commit**

```bash
git add scripts/run-with-open-ports.ts scripts/run-with-open-ports.test.ts package.json
git commit -m "fix: orchestrate startup with open ports"
```

### Task 3: Route the `just` recipes through the new orchestration script

**Files:**
- Modify: `justfile`

**Step 1: Write the minimal integration change**

Update:

- `dev` so it still runs `pnpm install`, then launches `tsx scripts/run-with-open-ports.ts dev`
- `start` so it launches `tsx scripts/run-with-open-ports.ts start`

Leave `dev-web`, `dev-api`, `start-web`, and `start-api` unchanged.

**Step 2: Run the focused test again**

Run:

```bash
env NODE_ENV=test pnpm exec tsx --test scripts/run-with-open-ports.test.ts
```

Expected: PASS.

**Step 3: Manually verify the startup behavior**

Run:

```bash
node -e 'require("node:http").createServer((_, res) => res.end("busy")).listen(3000); setInterval(() => {}, 1 << 30)'
```

Run in a second terminal:

```bash
node -e 'require("node:http").createServer((_, res) => res.end("busy")).listen(3001); setInterval(() => {}, 1 << 30)'
```

Then run:

```bash
just dev
```

Expected:

- warning output for both reassigned ports
- the API starts on the next open port
- the web process starts on the next open port
- web requests to `/v1/*` still target the resolved API origin

**Step 4: Commit**

```bash
git add justfile
git commit -m "fix: use open-port startup wrapper in just recipes"
```

### Task 4: Run the required checks and land the change

**Files:**
- Modify: `.beans/minance2-1818--implement-graceful-port-conflict-handling.md`

**Step 1: Run verification**

Run:

```bash
env NODE_ENV=test pnpm exec tsx --test scripts/run-with-open-ports.test.ts
pnpm check
```

Expected: PASS.

**Step 2: Update the bean summary**

Record:

- the chosen auto-increment strategy
- the new orchestration script
- the `just` integration
- the verification commands and results

**Step 3: Commit**

```bash
git add .beans/minance2-1818--implement-graceful-port-conflict-handling.md
git commit -m "chore: document graceful port conflict handling"
```
