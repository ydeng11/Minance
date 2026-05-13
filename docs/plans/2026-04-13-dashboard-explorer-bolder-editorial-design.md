# Dashboard And Explorer Editorial Redesign

**Goal**

Break the current AI-dashboard aesthetic on Minance’s most visible analytics surfaces by giving the dashboard and explorer a more editorial finance identity with a tactical edge.

**Direction**

The redesign should feel premium, sharp, and composed rather than glassy or generic. Typography becomes the primary personality signal, layout becomes more asymmetric, and accent color becomes selective instead of the default answer for every KPI badge and panel.

This is not a playful consumer-fintech makeover and not a dense enterprise cockpit. The target is an editorial finance dashboard that still feels useful and action-oriented.

**Problems To Solve**

- The dashboard KPI row is four visually identical metric cards.
- The dashboard trend, top categories, and top merchants all use the same dark-panel recipe and read like cloned widgets.
- Explorer summary cards repeat the same shell and sparkline treatment, making the surface feel templated.
- Merchant, anomaly, and trend panels rely on the same rounded dark-card pattern and emerald-accent defaults.
- The app still uses generic typography, which weakens memorability and visual hierarchy.

**Scope**

- Introduce distinct display and body fonts through `next/font`.
- Redesign the dashboard KPI area, trend section, category list, merchant list, and transactions handoff.
- Redesign the explorer summary band, trend chart shell, merchant analysis, and anomalies surfaces.
- Preserve existing data, navigation, interactions, and drill-down behavior.

**Dashboard Design**

- `Net Flow` becomes the dashboard hero, with larger type and a short contextual explanation instead of behaving like just another KPI card.
- `Spent`, `Income`, and `Recurring Spend` become supporting panels with different internal layouts so the row no longer repeats the same metric template four times.
- The trend chart becomes the visual anchor of the page, with stronger framing and clearer month emphasis.
- Categories and merchants should no longer look like twin sections. Categories should feel ranked and operational; merchants should feel curated and identity-led.
- The ledger handoff becomes a narrower editorial transition strip rather than a generic CTA block.

**Explorer Design**

- The summary band should read as a composed metrics surface instead of four clone cards with near-identical structures.
- Net flow gets the strongest hierarchy; recurring spend becomes the quietest panel.
- The trend chart shell gets more authority and detail structure, closer to an analysis board than a decorative chart container.
- Merchant analysis and anomalies should become visually distinct from each other rather than two interchangeable dark panels.

**Typography**

- Use a refined editorial display face for high-emphasis headlines and hero figures.
- Use a clean but less-generic sans face for body copy and controls.
- Apply the new typography structurally at the app root so the redesign does not depend on ad hoc one-off font classes.

**Testing Strategy**

- Add source-level tests for the font hookup and the new dashboard/explorer layout contracts.
- Keep existing `data-testid` hooks stable where possible to avoid unnecessary regression churn.
- Update or add focused Playwright coverage only where the structure meaningfully changes.
- Finish with `just check` and `just build-web`.

**Guardrails**

- No route changes, API changes, or interaction rewrites.
- No app-wide restyle of transactions, import, settings, or forms in this pass.
- Do not reintroduce generic “bold” AI tricks such as glow-heavy glassmorphism, neon accents, or decorative gradient text.
