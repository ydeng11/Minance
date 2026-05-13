# Flagship Polish Pass Design

## Goal

Bring the shared shell, dashboard, and explorer surfaces up to a flagship finish level after the structural audit fixes. This pass should not change the approved editorial direction or information architecture. It should remove the remaining "almost there" seams so the product feels intentional end to end.

## Quality Bar

This is a flagship polish pass, not a ship-ready triage pass.

That means the work should focus on:

- micro-detail refinements that are visible during normal product use
- stronger interaction feedback for pointer and keyboard users
- tighter consistency between the upgraded dashboard/explorer surfaces and the surrounding shell
- low-risk semantics and accessibility improvements that make the product feel complete

It should avoid:

- broad redesigns of untouched areas
- new information architecture
- large behavioral changes
- refactors that are not directly tied to finish quality

## Approved Scope

### 1. Shared Shell Refinement

Update the shared chrome so it matches the editorial dashboard and explorer direction instead of feeling like an older neutral/emerald layer. This includes the top shell header, desktop sidebar, mobile bottom navigation, and help menu.

The main improvements are:

- stronger hierarchy in the shell header
- more deliberate button states for `Help`, `View`, `AI Assistant`, and `Log out`
- calmer and more premium active/inactive navigation contrast
- consistent use of the tokenized shell language instead of mixed older styling

### 2. Dashboard and Explorer Micro-Detail Cleanup

Polish the dashboard hero and support cards, the dashboard controls, and the explorer summary cards so they feel finished under hover, focus, and keyboard use.

The main improvements are:

- descriptive accessible names for dashboard KPI buttons
- tighter copy rhythm and less redundant small-label noise
- better hover, pressed, and focus feedback on editorial cards
- more consistent contrast and spacing in explorer summary context bands

### 3. Sparkline Evaluation

Keep explorer sparklines only as supporting evidence, not decorative chrome. The goal is not to remove them wholesale, but to make them quieter and more integrated with the surrounding context bands.

The main improvements are:

- tone down visual weight where the sparkline competes with the metric
- align sparkline wrappers with the newer token system
- preserve existing test contracts and summary behavior

### 4. Low-Risk Semantics and Consistency Cleanup

Fix obvious quality gaps that still stand out after the redesign, especially where older components remain visually or semantically out of step.

The main improvements are:

- proper help menu panel semantics
- more descriptive `aria-label` strings where composite card content is currently ambiguous
- alignment of touched shell/help surfaces with the current token palette and focus treatment

## Non-Goals

- redesigning settings, accounts, or other untouched sections
- replacing the approved editorial dashboard/explorer structure
- changing routing or navigation structure
- introducing new analytics or product features

## Testing Strategy

Use a tight test-first polish pass:

1. Add failing source-level tests for the flagship polish contracts that are stable and worth locking down.
2. Implement minimal code changes to satisfy those contracts.
3. Re-run focused Playwright coverage for dashboard, explorer, and shell behavior.
4. Finish with `just check` and `just build-web`.

## Expected Outcome

After this pass, Minance should feel like one coherent product rather than a strong dashboard/explorer dropped into a slightly older shell. The remaining details should read as deliberate: better labels, better state feedback, better micro-hierarchy, and fewer visual seams.
