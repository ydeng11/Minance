# PR Review Findings: cursor/agent-skills-lock

## Issues Found

### 1. Dead CSS variables in globals.css

**Location:** `apps/web/src/app/globals.css` (lines 45-46, 69-70)

Both `--gradient-panel` and `--gradient-shell` are defined in globals.css but never referenced by any component. They were removed from components during the normalization sweep but the CSS variable definitions were left behind.

**Evidence:**
- `var(--gradient-panel)` — 0 usages in non-test files
- `var(--gradient-shell)` — 0 usages in non-test files
- Defined in globals.css for both dark and light themes

**Fix:** Remove the 4 CSS variable declarations from globals.css. Update `theme-foundation.test.ts` line 145 from `assert.match(globalsSource, /--gradient-panel:/)` to `assert.doesNotMatch(...)` or remove the assertion entirely.

---

## No Other Issues Found ✅

- **All 550 tests pass** (275 backend + 275 frontend)
- **No stale imports** — all training-related imports removed cleanly
- **No hardcoded palette colors** in source code (all migrated to semantic tokens)
- **No broken routes** — `/v1/ai/training-status` removed with all references
- **No broken types** — `AiTrainingStatus`, `TRAINING_DATA` strategy cleaned up
- **No dangling references** to `resolveTrainingCategory`, `getTrainingStatus`, `getTrainingPromptContext`
- **CommandPalette** was initially added with hardcoded colors but properly migrated to semantic tokens in a later commit
- **Recurring draft persistence** correctly extracted to `serializeRecurringRuleDraft` helper
- **View filter migration** properly replaced legacy ExplorerAdvancedFilters with SharedViewFilters
- **Accessibility fixes** all verified via contract tests

## Summary

Only 1 actionable issue: remove dead CSS variables `--gradient-panel` and `--gradient-shell` from globals.css.
