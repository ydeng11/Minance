# Explorer Review Filter Removal Design

## Goal
Remove review-status filtering from Explorer entirely so the page no longer exposes, persists, or restores a `review` filter.

## Problem
Explorer still carries review-status behavior across multiple layers:
- visible controls in the advanced filters sheet and legacy sidebar component
- active filter chips in the Explorer page shell
- filter parsing and URL serialization in shared Explorer state
- saved-view hydration from persisted filter payloads

Hiding the control alone would leave hidden behavior behind in URLs and saved views. That would make Explorer harder to reason about and could create confusing state when older views are restored.

## Recommended Approach
Delete `review` from the Explorer filter model and remove every Explorer UI affordance that reads or writes it. Treat any legacy `review` value in query params or saved views as ignored input rather than an error.

This keeps the removal complete for new Explorer state while preserving backward compatibility for already-saved views and bookmarked URLs.

## Scope

### Explorer Filter State
- Remove the `ExplorerReviewFilter` type.
- Remove `review` from `ExplorerFilterState`.
- Stop parsing `review` from search params.
- Stop serializing `review` into Explorer URLs.
- Stop validating or restoring `review` in saved Explorer views.

### Explorer UI
- Remove the review-status select from the advanced filters sheet.
- Remove the review-status select from the legacy Explorer sidebar component.
- Remove the active filter chip that renders `Reviewed` or `Needs Review`.
- Update clear/reset logic and active-filter counting so they no longer reference review state.

### Compatibility
- Old Explorer saved views may still contain a `review` key.
- Old Explorer URLs may still include `review=...`.
- Explorer should ignore those legacy values and continue loading the rest of the filter state normally.

## Testing Strategy

### Unit Tests
- Add Explorer filter tests proving legacy `review` query params are ignored.
- Add Explorer filter tests proving saved-view hydration ignores legacy `review` fields.

### End-to-End
- Update the Explorer Playwright coverage so the advanced filters sheet no longer expects a review control.
- Assert the page does not surface a review-status label in Explorer filters.

## Non-Goals
- Removing review-status filtering from Transactions or any non-Explorer flow
- Migrating existing saved-view payloads in storage
- Changing unrelated Explorer filtering behavior
