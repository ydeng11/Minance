# pnpm-workspace-standard Specification

## Purpose
Define and enforce pnpm as the repository-wide package manager standard, including lockfile authority and command usage in docs and automation.
## Requirements
### Requirement: pnpm MUST be the canonical package manager
The workspace SHALL define pnpm as the canonical package manager for install, dependency updates, script execution, and CI workflows.

#### Scenario: Developer follows onboarding instructions
- **WHEN** a developer runs dependency and script commands from project documentation
- **THEN** commands MUST use pnpm equivalents and MUST NOT require npm commands

#### Scenario: CI installs dependencies
- **WHEN** CI executes dependency installation for any workspace job
- **THEN** CI MUST use pnpm install and pnpm-aware caching

### Requirement: Lockfile authority MUST be pnpm-only
The repository SHALL treat `pnpm-lock.yaml` as the only authoritative lockfile and MUST reject npm lockfiles in version control.

#### Scenario: pnpm lockfile updated
- **WHEN** dependencies change in a pull request
- **THEN** `pnpm-lock.yaml` MUST reflect the change and pass installation checks

#### Scenario: npm lockfile appears
- **WHEN** `package-lock.json` is added or modified in a pull request
- **THEN** CI MUST fail and instruct contributors to use pnpm

### Requirement: npm and npx usage MUST be removed from maintained automation/docs
Maintained repository automation and contributor documentation SHALL reference pnpm commands only, except in clearly marked historical notes.

#### Scenario: Workflow file still uses npm
- **WHEN** CI/workflow validation scans repository workflow files
- **THEN** any active `npm` or `npx` command usage MUST fail validation

#### Scenario: Historical note references npm
- **WHEN** documentation includes a historical or migration-context note about npm
- **THEN** the note MUST be clearly labeled non-authoritative and accompanied by pnpm canonical commands
