---
# minance2-1818
title: Implement graceful port conflict handling
status: in-progress
type: bug
priority: normal
created_at: 2026-03-21T03:05:59Z
updated_at: 2026-03-21T03:16:16Z
---

Implement graceful handling when dev/start ports are already occupied.

- [x] Decide the desired port-conflict behavior
- [ ] Add failing coverage for the chosen behavior
- [ ] Implement graceful port-conflict handling
- [ ] Verify the startup behavior and run required checks
- [ ] Summarize and land the change

## Design Notes

- Approved approach: add a small TypeScript startup wrapper that auto-increments from ports 3000 and 3001, prints warnings, and feeds the resolved API origin into the web process.
- Design doc: docs/plans/2026-03-20-graceful-port-conflict-design.md
- Implementation plan: docs/plans/2026-03-20-graceful-port-conflict-implementation-plan.md
