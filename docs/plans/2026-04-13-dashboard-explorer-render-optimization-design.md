# Dashboard And Explorer Render Optimization Design

**Goal**

Reduce avoidable dashboard and explorer render work without changing behavior or visuals.

**Scope**

- Optimize the dashboard trend-bar derivation in [page.tsx](/Users/ihelio/code/minance2/apps/web/src/app/page.tsx:1) so the net normalization work is computed once per render instead of once per bar.
- Optimize the explorer summary band in [ExplorerSummaryBand.tsx](/Users/ihelio/code/minance2/apps/web/src/app/explorer/components/ExplorerSummaryBand.tsx:1) so sparkline arrays are derived once instead of remapped inside the card loop.
- Keep the pass limited to low-risk render derivation helpers. No API changes, no visual redesign, and no memoization sweep across the app.

**Approach**

Create small pure presentation helpers for the two audited hotspots:

- Add a dashboard helper that takes the overview trend and selected range, chooses the visible slice, computes the normalization baseline once, and returns the same bar shape the dashboard already renders.
- Extend the explorer presentation layer with a helper that converts `summary.sparkline` into keyed `spend`, `income`, and `net` series in one pass.

This keeps the optimization testable outside React and avoids introducing component-level complexity just to remove a small amount of repeated work.

**Testing Strategy**

- Add a unit test for the dashboard helper covering range slicing and normalized bar heights.
- Add a unit test for the explorer helper covering keyed sparkline extraction.
- Add a source-level regression test proving the dashboard page calls the helper instead of recomputing `Math.max(...trend.map(...))` inside the mapped loop.
- Finish with focused frontend tests, repo checks, and a production build.

**Files Expected To Change**

- Create: `apps/web/src/app/dashboardPresentation.ts`
- Create: `apps/web/src/app/dashboardPresentation.test.ts`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/explorer/presentation.ts`
- Modify: `apps/web/src/app/explorer/presentation.test.ts`
- Create or modify: a small source-level dashboard performance regression test under `apps/web/src/app`

**Risks And Guardrails**

- Keep all output shapes stable so existing rendering code stays intact.
- Do not broaden the pass into styling or accessibility cleanup.
- Prefer pure helpers over additional hooks or memo wrappers unless a test demonstrates they are necessary.
