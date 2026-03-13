# Explorer Summary Clarity Design

## Goal
Clarify the Explorer overview so selected-range totals, recent seven-day microtrends, and comparison context each have a distinct UI job.

## Problem
Explorer currently blends together three different kinds of time context:
- The hero-card primary numbers reflect the active Explorer filter range.
- The hero-card sparkline content reflects only the most recent seven days of the filtered scope.
- The main trend chart is labeled as a six-month view even when the active filter is `Last 12 months`, `Last 90 days`, `All time`, or a custom date window.

This creates avoidable confusion:
- users can read the microtrend as if it explains the primary total
- the right-side comparison panel duplicates information already visible in the hero cards
- the trend chart appears inconsistent with the selected range
- large currency values can crowd the hero-card icon and context area

## Recommended Approach
Restructure the Explorer overview so each layer communicates one thing clearly:

### Hero Cards
Each hero card should become a two-zone card.

Top section:
- metric label
- primary value for the active Explorer range
- supporting icon

Footer section:
- a clearly separated context band with its own label and visual hierarchy
- when comparison is off, show `Last 7 days` plus a small sparkline and helper copy such as `within current filters`
- when comparison is on, show previous-period comparison context instead of the seven-day sparkline

This keeps the selected-range total as the dominant message while still preserving short-term movement context.

### Comparison Handling
Remove the standalone right-side comparison panel in its current form.

Reasoning:
- when comparison is off, it repeats the same recent-movement story already shown in the hero cards
- when comparison is on, it repeats spend/income/net deltas already present in the hero cards

If the product later needs a dedicated comparison module, it should be repurposed to show a unique insight rather than the same metrics in a second location.

### Trend Chart
The main `Spending Trend` chart should always reflect the active filter horizon rather than an internal six-month cap.

That means:
- use the full filtered trend series returned by analytics
- replace hard-coded `Last 6 months` labeling with the active range label
- update descriptive copy so the chart reads as the main range-level time series, not a second “recent” view

### Large Number Handling
Hero-card values should scale down when the formatted number grows long enough to compete with the icon or context band.

The goal is not tiny typography by default. Instead:
- keep the current larger size for short values
- step down to smaller sizes for longer currency strings
- preserve alignment and breathing room rather than letting the icon column get pushed away

## Scope

### In Scope
- Explorer hero-card layout and labeling
- comparison-off and comparison-on summary-card behavior
- removal of the redundant comparison panel from the overview row
- active-range labeling for the Explorer trend chart
- responsive value sizing for large summary amounts
- unit and end-to-end coverage for the updated copy and layout behavior

### Out of Scope
- changing the backend sparkline window away from seven days
- inventing a new dedicated comparison visualization
- changing category/account perspective analytics beyond any shared layout plumbing
- redesigning the dashboard page outside Explorer

## UI Rules

### Time Context Rules
- Primary values always describe the selected Explorer range.
- Seven-day sparklines must always be labeled explicitly as `Last 7 days`.
- Comparison copy must always be labeled explicitly as previous-period context.
- No UI element should pair `Current range` wording with seven-day sparkline content.

### Hierarchy Rules
- Main total first
- contextual band second
- full-range trend chart as the dominant visualization below the summary row

### Redundancy Rules
- one place for recent microtrend context
- one place for previous-period comparison context
- no duplicate spend/income/net delta modules unless they add a materially different view

## Testing Strategy

### Unit Tests
- verify summary presentation helpers return explicit seven-day labels for microtrend mode
- verify comparison mode returns previous-period language instead of sparkline labels
- verify large-value sizing helpers choose smaller typography buckets for long formatted values

### End-to-End Tests
- verify Explorer summary cards show explicit `Last 7 days` context when comparison is off
- verify the standalone comparison panel is absent
- verify the overview trend chart shows the active range label instead of `Last 6 months`
- verify comparison mode keeps delta context in the hero cards without reintroducing duplicate panels

## Non-Goals
- changing analytics math
- introducing new API endpoints
- revisiting merchant, category, anomaly, or heatmap presentation outside of layout fallout
