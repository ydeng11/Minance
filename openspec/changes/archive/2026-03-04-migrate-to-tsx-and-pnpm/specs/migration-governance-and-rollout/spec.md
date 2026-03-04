## ADDED Requirements

### Requirement: Migration MUST be executed in documented phases with exit criteria
The migration SHALL define ordered phases with explicit scope, acceptance checks, and completion criteria before moving to the next phase.

#### Scenario: Phase starts
- **WHEN** a migration phase is initiated
- **THEN** the phase definition MUST declare scope boundaries, required checks, and expected deliverables

#### Scenario: Phase completion decision
- **WHEN** maintainers evaluate whether a phase is complete
- **THEN** all listed acceptance checks for that phase MUST pass

### Requirement: Quality gates MUST be run for each migration phase
Each phase SHALL require execution of relevant quality gates (typecheck, lint, test/build/e2e where applicable) before closure.

#### Scenario: Phase introduces code changes
- **WHEN** a migration phase modifies source, tooling, or CI configuration
- **THEN** the phase close-out record MUST include passing results for required quality gates

#### Scenario: Required gate fails
- **WHEN** any required quality gate fails during phase close-out
- **THEN** the phase MUST remain open until failures are resolved or exceptions are explicitly approved

### Requirement: Risks, exceptions, and follow-up work MUST be tracked in bd
Migration blockers, temporary exceptions, and deferred work discovered during rollout SHALL be captured as linked bd issues with clear ownership.

#### Scenario: New blocker discovered during migration
- **WHEN** a contributor identifies a blocker or exception during a migration phase
- **THEN** a bd issue MUST be created and linked to the active migration work before phase closure

#### Scenario: Phase has unresolved exceptions
- **WHEN** a phase completes with approved temporary exceptions
- **THEN** each exception MUST map to an open bd follow-up issue with target resolution criteria
