# tsx-typescript-source-standard Specification

## Purpose
Define TypeScript extension standards for managed source scopes (`.tsx` for UI-rendering frontend files, `.ts` for non-UI modules) and block unmanaged JavaScript-family files.
## Requirements
### Requirement: Managed source files MUST use TypeScript extensions
The project SHALL enforce TypeScript-based source extensions in managed scopes. UI-rendering source in `apps/web` (pages, components, layouts, hooks that return JSX) MUST use `.tsx`. Non-UI TypeScript modules in managed scopes MUST use `.ts`.

#### Scenario: Frontend UI file uses TSX
- **WHEN** a contributor adds or renames a UI component/page/layout file under `apps/web`
- **THEN** the file extension MUST be `.tsx`

#### Scenario: Service or utility module uses TS
- **WHEN** a contributor adds or renames a non-UI module under `services/api`, `packages/domain`, `scripts`, or `e2e`
- **THEN** the file extension MUST be `.ts`

### Requirement: New JavaScript-family files in managed scopes MUST be blocked
The repository SHALL block new `.js`, `.jsx`, `.mjs`, or `.cjs` files in managed scopes unless the file path is in a documented exception allowlist.

#### Scenario: Unauthorized JS file is introduced
- **WHEN** a pull request adds a `.js`, `.jsx`, `.mjs`, or `.cjs` file in a managed scope and that path is not allowlisted
- **THEN** CI MUST fail with a message identifying the violating path

#### Scenario: Allowlisted exception file is introduced
- **WHEN** a pull request adds a JavaScript-family file that matches an approved exception path
- **THEN** CI MUST permit the file and report the matching allowlist rule

### Requirement: Existing JavaScript files MUST be migrated by scoped waves
The migration SHALL define scoped conversion waves and MUST track completion per scope until no unmanaged JavaScript files remain.

#### Scenario: Migration wave completes for a scope
- **WHEN** a scope migration wave is marked complete
- **THEN** the inventory for that scope MUST show zero unmanaged `.js/.jsx/.mjs/.cjs` files

#### Scenario: Wave completion is attempted with remaining JS files
- **WHEN** a scope wave is proposed as complete but inventory still reports unmanaged JavaScript files
- **THEN** the wave MUST remain open and list the remaining files as follow-up items
