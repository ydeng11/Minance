---
# minance2-34x7
title: Improve assistant chat interface
status: completed
type: feature
priority: normal
created_at: 2026-03-21T04:07:00Z
updated_at: 2026-03-21T20:22:33Z
---

Polish the assistant chat UX so messages send immediately, the waiting state feels alive, prompt placeholders rotate from a curated set, and AI responses are easier to scan and more visually structured.

- [x] Explore project context
- [x] Ask clarifying question
- [x] Propose approaches and recommendation
- [x] Present design and get approval
- [x] Write design doc
- [x] Create implementation plan

## Summary of Changes

- Added optimistic assistant turns so submitted questions appear immediately with an inline thinking state and animated random emoji.
- Rotated assistant prompt placeholders from a curated list and reset them on submit/reset cycles.
- Added structured assistant response fields and UI rendering for summary, key points, follow-up text, and improved highlight chips.
- Updated the live tool-calling agent prompt/parser and persisted the richer assistant result fields through the API.
- Simplified the assistant chat implementation with small readability helpers after the feature landed.
