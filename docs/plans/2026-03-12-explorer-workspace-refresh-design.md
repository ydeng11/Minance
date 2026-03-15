# Explorer Workspace Refresh Design

## Goal
Upgrade Explorer into a premium, full-width analytics workspace that feels spacious, readable, and interactive while staying inside Minance's current dark dashboard language.

## Problem
The current Explorer experience still feels squeezed even after the first upgrade. The left filter rail permanently consumes too much width, the hero cards are visually cramped, the mid-page grid creates dead air, and several modules expose raw transactional strings that feel spreadsheet-like instead of product-quality. Comparison-off states also read like broken features rather than useful analytics.

## Design Principles
- Keep the existing dark shell, but use layered surfaces and subtle separators to avoid a wall-of-text effect.
- Treat Explorer like a workspace, not a report page.
- Prioritize width for the highest-signal visualizations.
- Make filters visible without letting controls dominate the canvas.
- Keep category and account analysis in-place as expanded dashboard states instead of separate-feeling destinations.
- Improve scannability with better labels, stronger hierarchy, and richer empty states.

## Recommended Approach
Use a combined Linear- and Notion-style layout:
- Persistent slim app navigation on the left
- Explorer command bar across the top of the content area
- Inline quick-filter chips below the command bar
- Floating advanced-filter panel triggered by `+ Filter`
- A responsive 12-column dashboard grid below

This approach best solves the width problem while keeping common controls immediately accessible and advanced controls available on demand.

## Workspace Layout

### Command Bar
Explorer starts with a single horizontal control row that contains:
- Search
- Date range
- Account scope
- Perspective switch
- Compare toggle
- Sort or export actions
- AI entry point aligned with the current view

This bar replaces the heavy always-open left filter rail as the primary filtering surface.

### Quick Filters
Below the command bar, Explorer shows compact active chips and quick toggles such as:
- Status
- Verified or review state
- Selected category
- Selected account
- Active compare state

Each chip is removable in place so users can see and clear scope without reopening a panel.

### Advanced Filters
Clicking `+ Filter` opens a floating filter panel with the less common controls:
- Merchant text
- Amount range
- Direction
- Transaction type
- Tags
- Review status
- Category granularity

The panel includes reset and apply actions. This preserves control depth without sacrificing horizontal space.

## Visual Hierarchy

### Page Surfaces
To avoid dashboard fatigue in dark mode:
- The page background stays near-black
- Command and filter surfaces sit one step lighter
- Cards sit another step lighter with subtle borders and soft internal contrast

This produces visible structure without breaking the current dark brand language.

### Hero Cards
The summary row becomes a wide four-card band spanning the content area. Each card should:
- Use larger primary value typography
- Reserve secondary space for useful context only
- Show comparison as a compact badge when enabled
- Show a sparkline and a subtle compare CTA when comparison is off

Negative net flow should use a soft warning treatment so deficits are discoverable at a glance.

### Main Grid
Explorer shifts to a clearer dashboard rhythm:
- Top row: hero summary cards
- Middle row: wide trend panel on the left, compact complementary panel on the right
- Deep-dive row: merchants and anomalies split into balanced columns
- Perspective-specific expanded rows beneath the overview grid

The heatmap should receive more breathing room and support an expanded state.

## Richer Card Content

### Merchant Presentation
Top Merchants should stop showing raw bank strings as the main label. Instead:
- Show a cleaned, human-readable merchant name as the primary label
- Keep the raw import string as subdued caption text or tooltip content
- Add a small monogram, favicon, or logo-style chip to improve scanning

This change alone makes the Explorer feel much more polished.

### Anomalies
Anomalies should move away from a long vertical list and become compact insight cards:
- Short, readable headline
- Merchant and category context
- Amount and date
- Reason badge or severity styling

When no anomalies exist, the panel should still feel intentional by showing a stability or healthy-pattern message rather than a dead empty block.

### Comparison-Off States
If compare mode is off, cards and comparison panels should not say "No comparison" or "No delta." Instead they should:
- Show recent trend context, ideally a small sparkline
- Offer a nearby `Compare to previous period` action
- Preserve the overall visual weight of the layout

## Sub-Workspace Model
Category and account analysis should feel like expanded states of the current dashboard, not separate pages.

### Category Expansion
Clicking a category bar, donut segment, or chip should:
- Keep the user on Explorer
- Filter related modules in place
- Expand category-specific context below or within the current grid
- Preserve breadcrumbs or active chips so the current scope is obvious

### Account Expansion
Clicking an account card or account filter should:
- Recompose the same workspace around that account
- Update trend, merchants, anomalies, and related summaries without a route change

### View All Behavior
`View all` actions should animate within the same Explorer layout instead of navigating to a separate-feeling page. The desired feel is "expand this workspace" rather than "leave this report."

## Interaction Design
- Quick filters update the workspace immediately
- Advanced filters apply as a batch from the floating panel
- Category and account interactions drive in-place drill-down
- Merchant interactions should support filter, transactions drill-down, and future contextual AI actions
- The AI action should live closer to the specific visualization or filtered state it explains

## Data Considerations
This is primarily a UI refresh, but two analytics additions are justified if needed to support the design cleanly:
- A small recent sparkline series for summary cards when compare mode is off
- Sufficient merchant source text to support primary display name plus raw-caption presentation

If the backend already exposes enough information, prefer client-side composition over broad API expansion.

## Testing Strategy

### Frontend
- Add pure tests for merchant pretty-name formatting and comparison-off presentation helpers
- Add UI tests for quick filters, advanced filter panel state, and in-place sub-workspace expansion

### End-to-End
- Verify the new command bar layout on desktop
- Open and apply advanced filters
- Click a category and confirm merchants and anomalies update in place
- Confirm comparison-off cards show trend context rather than empty language
- Verify expanded states remain within Explorer rather than triggering a route transition

## Non-Goals
- Reworking the global app shell outside Explorer integration points
- Building a fully customizable BI dashboard system
- Introducing a lighter visual theme or departing from the existing dark product language

## Recommendation
Implement this as a focused Explorer workspace refresh: keep the existing data model where it is strong, add only the minimal analytics support needed for richer UI states, and concentrate the work on layout, hierarchy, readability, and in-place exploration.
