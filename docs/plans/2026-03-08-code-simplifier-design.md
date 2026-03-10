# Code Simplifier Design

## Scope

Create a personal Codex skill at `/Users/ihelio/.codex/skills/code-simplifier` that ports the intent of Anthropic's `code-simplifier` agent into Codex skill format.

The skill should trigger when the user asks to simplify, clean up, or refactor code for clarity and maintainability without changing behavior.

Out of scope:

- adding project-specific simplification scripts
- bundling references or assets that duplicate the main instructions
- broad automatic cleanup outside the files or code paths the user is actively changing

## Goals

The skill should help a future Codex instance:

- preserve exact behavior while simplifying implementation details
- read current repo guidance before changing code
- focus on recently modified code unless the user explicitly broadens scope
- prefer explicit, maintainable code over dense or clever code

## File Layout

Create:

- `/Users/ihelio/.codex/skills/code-simplifier/SKILL.md`
- `/Users/ihelio/.codex/skills/code-simplifier/agents/openai.yaml`

Do not create `references/`, `scripts/`, or `assets/` unless a later iteration shows they are necessary.

## Skill Content

### Frontmatter

Use `name: "code-simplifier"` and a discovery-oriented `description` that includes:

- simplify
- clean up
- refactor for readability
- reduce complexity
- improve maintainability
- preserve behavior
- recently modified or recently touched code

### Body

Keep the body concise and operational.

It should instruct the agent to:

1. Inspect current project guidance first, including files such as `AGENTS.md`, `CLAUDE.md`, lint config, formatting config, and the touched-file diff.
2. Limit the review and edits to recently modified code unless the user asks for a broader sweep.
3. Simplify structure, naming, duplication, and control flow without changing outputs or behavior.
4. Prefer clear, explicit code over compact or clever constructs.
5. Avoid nested ternaries when a straightforward conditional structure is clearer.
6. Skip speculative cleanup that expands scope or merges unrelated concerns.
7. Verify the result with the relevant project checks before claiming success.

## Guardrails

The skill must explicitly forbid:

- behavior changes
- hidden scope expansion
- simplifications that make debugging harder
- hardcoding conventions copied from another repository

Instead of baking in Anthropic-specific `CLAUDE.md` rules, the skill should tell the agent to discover the current repository's standards first.

## Metadata

Create `agents/openai.yaml` with:

- `display_name: "Code Simplifier"`
- a short UI description focused on safe simplification
- a `default_prompt` that explicitly mentions `$code-simplifier`

Avoid optional icon and brand metadata because the user did not request them.

## Validation

Validation should include:

1. proving the skill does not already exist before creation
2. creating the skill folder with the local initializer
3. replacing template content with the final skill text
4. running `quick_validate.py` against the finished skill
5. inspecting the generated files directly before reporting completion
