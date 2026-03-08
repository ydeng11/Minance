# AI-Led Taxonomy Design

## Scope

This document defines the pre-launch category, group, tagging, and review design for Minance Next.

Out of scope:

- backward compatibility with the current coarse/granular strategy model
- end-user data migration from a launched production system
- final prompt wording for every AI workflow

Because the product is not launched yet, this design assumes a clean cutover to a simpler canonical model instead of carrying long-term compatibility baggage.

## Product Goal

Minance should make transaction import and exploration feel mostly hands-free for the average user while still letting power users shape the system for their own needs.

The app should:

- import transactions with minimal manual setup
- use AI and historical corrections to reduce repeated categorization work
- keep reporting stable enough to power trustworthy dashboards and drill-downs
- let advanced users customize the taxonomy without forcing that complexity into normal transaction entry

## Design Principles

1. Import should classify, not configure
2. Users should correct mistakes, not perform full categorization work
3. The app needs one canonical taxonomy for consistent reporting
4. Tags are optional overlays, not a backup taxonomy
5. Reporting policy must live in the taxonomy, not in free-form tags
6. AI can make provisional decisions, but those decisions must remain reviewable

## Canonical Model

### Group

Tier 1 becomes a user-editable parent grouping object called a group.

Each group stores:

- `id`
- `key`
- `name`
- `emoji`
- `order`
- `reporting_mode`

`reporting_mode` initially supports:

- `include`
- `exclude`

Examples:

- `Essential` => `include`
- `Discretionary` => `include`
- `Income` => `include`
- `Excluded` => `exclude`
- `Unassigned` => `exclude`

Groups are editable by power users in settings:

- create
- rename
- reorder
- delete
- change reporting mode

Deleting a group requires moving its categories first or choosing a replacement group.

### Category

Category is the primary classification unit for users and AI.

Each category stores:

- `id`
- `name`
- `emoji`
- `group_id`
- `type`
- optional `aliases`
- optional `budget`

Each category belongs to exactly one group.

Users and AI assign categories only. They do not assign groups directly during normal transaction entry.

### Transaction

Each transaction stores:

- `category_id`
- `semantic_type`
- `tags`
- `category_confidence`
- `group_resolution`
- `needs_category_review`
- `needs_taxonomy_review`
- existing amount/date/merchant/account fields

`group_resolution` stores how the group was determined:

- `taxonomy`
- `ai_fallback`
- `manual`

The transaction does not need a separately user-edited tier-1 field. The group is derived from the category relationship unless AI fallback is temporarily required.

## Groups, Categories, and Tags

### Group

Group answers:

- how should this transaction family roll up in reporting?
- should this category be excluded from spend and income analysis by default?

### Category

Category answers:

- what is this transaction actually for?

Examples:

- `Dining`
- `Groceries`
- `Salary`
- `Credit Card Payment`
- `Internal Transfer`

### Tags

Tags answer:

- what else is true about this transaction?

Good tag examples:

- `reimbursable`
- `business`
- `shared`
- `travel_2026`
- `subscription`

Bad tag examples if groups exist:

- `essential`
- `income`
- `shopping`
- `food`

Tags remain optional, multi-label, and orthogonal to taxonomy.

## Deriving the Group

Normal path:

1. User or AI assigns a category
2. The app looks up that category's `group_id`
3. The app derives the parent group from the taxonomy

This is a lookup, not a second classification pass.

## Fallback When the Relationship Is Missing

When category-to-group mapping is missing:

1. Try taxonomy lookup first
2. If taxonomy lookup fails, ask AI for the most likely group
3. Apply the suggested group provisionally
4. Set `group_resolution=ai_fallback`
5. Set `needs_taxonomy_review=true`

If AI is not confident enough to make a safe group decision:

- place the category or transaction in `Unassigned`
- set `needs_taxonomy_review=true`

This keeps import moving while preserving a review trail.

## AI-Led Import Flow

### Inputs

The import pipeline uses:

- normalized transaction fields
- explicit user rules
- merchant memory
- corrected historical transactions
- existing category taxonomy
- existing tag vocabulary or recent user tags

### Outputs

AI should infer:

- `category`
- `semantic_type`
- optional `tags`
- provisional `group` only when taxonomy lookup is missing

### Resolution Order

1. deterministic rules
2. merchant memory / learned corrections
3. AI category prediction
4. taxonomy-derived group
5. AI fallback group only if taxonomy relationship is missing
6. `Unassigned` if confidence remains too weak

### Review Triggers

Set `needs_category_review=true` when:

- category confidence is low
- category evidence is contradictory

Set `needs_taxonomy_review=true` when:

- the chosen category lacks a canonical group relationship
- AI had to provisionally decide the group

## Review UX

Review should be split into two concerns.

### Transaction Review

For rows with low category confidence or conflicting signals:

- show suggested category
- show confidence and short reason
- let the user correct category, tags, and other row-level fields

### Taxonomy Review

For categories or rows using provisional group assignment:

- show category
- show current provisional group
- show why taxonomy fallback was needed
- let the user confirm or move the category once at the taxonomy level

Users should not have to assign groups row-by-row during import.

## Settings UX

### Baseline User

Baseline users mostly see:

- categories
- dashboards
- category/group filters in exploration

They should not be asked to understand the full taxonomy model during normal entry.

### Power User

Power users can:

- create, rename, delete, and reorder groups
- set `reporting_mode`
- move categories between groups
- create categories and aliases
- manage rules and review unresolved taxonomy decisions

When moving a category into or out of an excluded group, the app should warn that reporting totals will change.

## Transaction UX

Normal transaction entry should show:

- category
- optional tags under advanced controls

It should not require:

- manual group assignment
- group creation
- taxonomy administration

If a category is corrected, the group updates automatically from taxonomy.

## Exploration UX

The app should provide two main analysis lenses:

- `By category`
- `By group`

Default behavior:

- high-level dashboards favor groups
- drill-downs favor categories
- excluded groups are omitted from spend and income rollups by default
- users can explicitly include excluded groups in advanced views if needed

Tags remain a secondary filter for custom workflows.

## Baseline Taxonomy

Recommended default groups:

- `Essential`
- `Discretionary`
- `Income`
- `Excluded`
- `Unassigned`

Recommended `Excluded` categories:

- `Internal Transfer`
- `Credit Card Payment`
- `Brokerage Transfer`
- `Savings Transfer`
- `Balance Adjustment`

Recommended `Unassigned` categories:

- `Uncategorized`
- `Needs Review`

## Learning Loop

The learning system should get stronger from user corrections.

Corrections feed:

- merchant memory
- explicit user rules
- corrected exemplars
- accepted AI fallback category/group mappings

After repeated corrections, the app can suggest:

- "Always map this merchant to this category?"
- "Move this category into this group for future imports?"

The user should confirm those changes once, not repeat them per row.

## Cutover Strategy

This is a pre-launch refactor, not a production migration.

The recommended rollout is:

1. replace the current parallel coarse/granular strategy model with canonical groups + categories
2. add review flags for taxonomy fallback
3. teach imports and AI to use taxonomy-first, AI-fallback-second resolution
4. update analytics to use group reporting policy directly
5. update UI flows so taxonomy work stays in settings and review queues instead of normal import/entry

The goal is a cleaner shipped model, not long-term compatibility with an internal pre-launch structure.

## Summary

The canonical design is:

- AI-led import and categorization
- category as the only primary assignment
- group as a user-editable parent reporting layer
- tags as orthogonal overlays
- taxonomy-first resolution with AI fallback and explicit review when the relationship is missing

This gives average users a hands-free import experience while preserving the flexibility power users need to shape the system over time.
