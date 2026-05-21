---
# minance2-b108
title: Optimize processed records editor columns
status: completed
type: task
priority: normal
created_at: 2026-05-21T13:36:44Z
updated_at: 2026-05-21T13:40:59Z
---

Improve the Import page Processed Records Editor so all columns remain visible/accessible and the headers/column presentation are clearer for review.\n\n- [x] Inspect current processed records markup and tests\n- [x] Refine table columns, headers, and mobile row presentation\n- [x] Validate with tests and browser

## Summary of Changes\n\nOptimized the Processed Records Editor table for the review panel by merging include/status into a Review column, tightening editable field widths, renaming Dir to Flow, and reducing the desktop table minimum width so all columns fit in the measured localhost editor panel without horizontal overflow. Added a className override for row account selects so desktop rows can stay compact while mobile cards remain full-width. Verified with focused web tests, browser measurement, screenshot QA, and just check.
