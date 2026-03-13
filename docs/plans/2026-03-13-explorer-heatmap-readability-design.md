# Explorer Heatmap Readability Design

## Goal
Make the Explorer spending heatmap immediately readable without requiring users to decode weekday index numbers.

## Problem
The current heatmap places JavaScript weekday numbers (`0-6`) inside each cell. Users have to know that `0 = Sunday` and `6 = Saturday` before the chart becomes meaningful. That adds friction and makes the card feel cryptic even though the underlying data is useful.

## Recommended Approach
Use a color-first reading model:
- remove weekday index text from the heatmap cells
- add a single weekday header row above the grid
- add a compact `Low` to `High` legend in the card header
- keep hover text so a user can still inspect an exact day bucket amount

This preserves the current data contract and layout footprint while making the card readable at a glance.

## Scope

### In Scope
- Explorer `SpendingHeatmap` presentation
- weekday headers for the existing 7-column grid
- stepped color palette for low/medium/high intensity
- legend and clearer hover copy
- focused Playwright coverage for readability

### Out of Scope
- changing the backend heatmap shape
- adding click-to-filter behavior
- expanding the heatmap beyond the current 49-cell footprint

## UX Rules
- columns represent weekdays, labeled once across the top
- rows represent weeks
- empty cells should be read as little or no spend
- brighter cells should be read as heavier spend
- cell labels should not repeat weekday numbers or letters inside every square

## Testing Strategy
- add Explorer Playwright coverage that asserts weekday headers and legend are visible
- assert heatmap cells no longer render raw weekday index text
