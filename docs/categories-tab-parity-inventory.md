# Categories Tab Parity Inventory (`minance2-xdy.1`)

Captured on **March 1, 2026 (America/New_York)** using Playwright CLI against local Minance Next.

## Capture environment

- App runtime: `npm run dev` (`http://localhost:3000` web, `http://localhost:3001` API)
- Account used: `dev@minance.local`
- Playwright artifacts:
  - `output/playwright/parity/minance2-xdy.1/dashboard-post-login.snapshot.yml`
  - `output/playwright/parity/minance2-xdy.1/categories-tab.snapshot.yml`
  - `output/playwright/parity/minance2-xdy.1/categories-tab.png`
  - `output/playwright/parity/minance2-xdy.1/network.log`
  - `output/playwright/parity/minance2-xdy.1/console.log`

## Actual behavior observed in current Next UI

1. User can navigate to `/categories` from the left nav.
2. Page renders a static "Strategy buckets" preview card set (`Essential`, `Extra`, `Neutral`).
3. No interactive category CRUD/mapping controls are present.
4. No category API traffic is triggered when opening `/categories`.
5. Network log only shows auth/analytics routes and RSC page fetch for `/categories`.

## Expected interaction inventory for parity (from legacy Categories implementation)

Reference implementation source: `src/main/webui/src/components/dndComponent/*` and related API/query hooks.

### Primary layout and controls

- Two-panel board:
  - Left: raw/unlinked categories
  - Right: selected Minance category and linked categories
- Search input filters both panel lists by category text.
- Minance category dropdown supports:
  - selecting existing category
  - "Add New Category" dialog open
- Save-state badge states:
  - `Saving...`
  - `Saved`
  - `Error`
- Delete selected Minance category action.

### Raw/linked list behaviors

- Each category row has:
  - drag handle
  - optional checkbox (for multi-select)
  - quick-link action from raw side
- Test-id contract for row identity:
  - raw row: `raw-category-<slug>`
  - linked row: `linked-category-<slug>`
  - checkbox: `checkbox-category-<slug>`

### Multi-select and batch operations

- Select-all on each side.
- Clear selection action.
- Batch link selected raw categories.
- Batch unlink selected linked categories.
- Selection count displayed in each panel header.
- Multi-drag: dragging one selected item moves all selected items.

### Drag-and-drop semantics

- Drag raw -> linked creates mapping inclusion for selected Minance category.
- Drag linked -> raw removes mapping for selected Minance category.
- Drag over task/column updates visual state before drop.
- Drop commits change and triggers debounced auto-save.

### Auto-save and recovery

- Save is debounced (400ms).
- Save payload represents the full linked set for selected Minance category.
- On failed save:
  - error badge and destructive toast shown
  - client rolls back to last successful assignment snapshot

### Add/Delete Minance category flow

- Add dialog submits category name.
- On success:
  - dialog closes
  - category list query invalidated/refetched
  - success toast
- Delete category sends delete request and invalidates linked/all categories queries.

## API contract expectations (legacy parity model)

Legacy resource base path: `/1.0/minance/mapping_category`

### Read operations

- `GET /minanceCategory/retrieveAll`
  - Response: `[{ MCategoryId: string, category: string }]`
- `GET /unlinkedCategories/retrieveAll`
  - Response: `[{ name: string }]`
- `GET /retrieve/{minance-category}`
  - Response: `[{ name: string }]`

### Write operations

- `POST /create/{category}`
  - Creates Minance category
  - Duplicate category returns API error via `RecordAlreadyExistingException`
- `DELETE /delete`
  - Request body includes at least `category` (legacy client sends `{ MCategoryId, category }`)
- `POST /linkCategory`
  - Request body:
    ```json
    {
      "listRawCategories": ["Groceries", "Dining"],
      "minanceCategory": "Food"
    }
    ```
  - Replaces linked set for one Minance category via add/remove delta.
  - Server validation requires non-empty `listRawCategories` and existing `minanceCategory`.

## Gaps vs current `/v1` Next stack

Current Next categories page (`apps/web/src/app/categories/page.tsx`) is a placeholder and does not expose parity interactions.

Current `/v1` API supports only:

- `GET /v1/categories`
- `POST /v1/categories`
- `POST /v1/category-rules`

Missing for parity with Categories tab behavior:

- Linked/unlinked category mapping endpoints
- Category mapping mutation endpoint with replace-set semantics
- Category delete/update endpoints with referential safety handling
- UI board and interaction layer (drag/drop, multi-select, save status, add/edit/delete modal flows)

## Implementation-ready acceptance criteria

1. Categories tab renders two interactive lists (raw/unlinked and linked) with search/filter and stable test ids.
2. Selecting Minance category updates linked list and supports add/delete category flows.
3. Single-action link and drag/drop both mutate mappings and persist via debounced save.
4. Multi-select supports select-all, clear, batch link, batch unlink, and multi-drag.
5. Save status visibly cycles through saving/saved/error; failed writes rollback to previous persisted snapshot.
6. Category API contract includes retrieval of linked/unlinked sets and replace-set mapping write for selected Minance category.
7. Validation errors are surfaced to users with non-silent error UI.

