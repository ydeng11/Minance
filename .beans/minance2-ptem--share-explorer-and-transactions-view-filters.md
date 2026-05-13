---
# minance2-ptem
title: Share Explorer and Transactions View filters
status: completed
type: task
priority: normal
created_at: 2026-05-12T04:36:21Z
updated_at: 2026-05-12T04:58:35Z
---

Implement the shared shell View filter mechanism for Explorer and Transactions.\n\n- [ ] Add shared View filter UI core\n- [ ] Adapt Explorer to shared View filter UI\n- [ ] Move Transactions filters into shell View\n- [ ] Remove inline Transactions filter panel\n- [ ] Update tests\n- [ ] Run Code Simplifier pass\n- [ ] Verify browser and checks\n- [ ] Summarize changes



Completed:
- Added shared shell View filter UI core.
- Adapted Explorer to the shared View filter UI while preserving Compare and direction.
- Moved Transactions filters into the shell View with multi-account filtering and hidden Compare.
- Removed the inline Transactions filter panel render.
- Updated frontend tests.
- Ran Code Simplifier pass.
- Verified with pnpm --filter @minance/web test, just check, and in-app browser.


- Removed legacy TransactionsCommandBar and TransactionsAdvancedFilters components after moving filters into shell View.
- Verified final web build with just build-web.
