# Code Simplifier Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a personal Codex `code-simplifier` skill in `~/.codex/skills` that mirrors Anthropic's code simplifier intent while adapting the workflow to Codex and local repository guidance.

**Architecture:** Build a small skill directory with a concise `SKILL.md` and `agents/openai.yaml`, avoid extra bundled resources, and validate the result with the local skill utility scripts. Use a lightweight RED/GREEN flow by proving the skill is absent before creation, then validating the finished folder after creation.

**Tech Stack:** Markdown, YAML, Python helper scripts (`init_skill.py`, `quick_validate.py`), Codex CLI, local filesystem.

---

### Task 1: Capture the RED baseline and scaffold the skill directory

**Files:**
- Create: `/Users/ihelio/.codex/skills/code-simplifier/`
- Create: `/Users/ihelio/.codex/skills/code-simplifier/SKILL.md`
- Create: `/Users/ihelio/.codex/skills/code-simplifier/agents/openai.yaml`
- Test: `/Users/ihelio/.codex/skills/code-simplifier`

**Step 1: Capture the failing baseline**

Run:

```bash
test -d /Users/ihelio/.codex/skills/code-simplifier && echo present || echo absent
```

Expected: `absent`

**Step 2: Initialize the skill directory**

Run:

```bash
python3 /Users/ihelio/.codex/skills/.system/skill-creator/scripts/init_skill.py code-simplifier --path /Users/ihelio/.codex/skills --interface display_name="Code Simplifier" --interface short_description="Simplify code without changing behavior" --interface default_prompt='Use $code-simplifier to simplify this recently modified code without changing what it does.'
```

Expected: the initializer creates the skill directory, template `SKILL.md`, and `agents/openai.yaml`.

**Step 3: Verify the scaffold exists**

Run:

```bash
find /Users/ihelio/.codex/skills/code-simplifier -maxdepth 2 -type f | sort
```

Expected: `SKILL.md` and `agents/openai.yaml` are present.

**Step 4: Commit**

```bash
git add docs/plans/2026-03-08-code-simplifier-design.md docs/plans/2026-03-08-code-simplifier-implementation-plan.md
git commit -m "docs: add code simplifier skill design and plan"
```

### Task 2: Replace the scaffold with the final skill content

**Files:**
- Modify: `/Users/ihelio/.codex/skills/code-simplifier/SKILL.md`
- Modify: `/Users/ihelio/.codex/skills/code-simplifier/agents/openai.yaml`
- Test: `/Users/ihelio/.codex/skills/code-simplifier/SKILL.md`

**Step 1: Write the final `SKILL.md`**

Replace the template with:

- a `name` of `code-simplifier`
- a discovery-focused `description`
- a short workflow that reads repo guidance first
- simplification heuristics that favor clarity over brevity
- guardrails against behavior changes and scope creep
- a validation reminder to run relevant checks before claiming success

**Step 2: Verify the skill metadata is aligned**

Check:

```bash
sed -n '1,160p' /Users/ihelio/.codex/skills/code-simplifier/SKILL.md
sed -n '1,120p' /Users/ihelio/.codex/skills/code-simplifier/agents/openai.yaml
```

Expected: the UI metadata matches the final skill name and purpose, and the prompt explicitly mentions `$code-simplifier`.

**Step 3: Keep the skill lean**

Run:

```bash
wc -l /Users/ihelio/.codex/skills/code-simplifier/SKILL.md
```

Expected: concise body well under the 500-line guideline.

**Step 4: Commit**

```bash
git add /Users/ihelio/.codex/skills/code-simplifier/SKILL.md /Users/ihelio/.codex/skills/code-simplifier/agents/openai.yaml
git commit -m "feat: add code simplifier personal skill"
```

### Task 3: Validate the finished skill and perform the GREEN check

**Files:**
- Test: `/Users/ihelio/.codex/skills/code-simplifier`

**Step 1: Run the skill validator**

Run:

```bash
python3 /Users/ihelio/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/ihelio/.codex/skills/code-simplifier
```

Expected: validation passes with no frontmatter or naming errors.

**Step 2: Re-check that the skill now exists**

Run:

```bash
test -d /Users/ihelio/.codex/skills/code-simplifier && echo present || echo absent
```

Expected: `present`

**Step 3: Inspect the final file list**

Run:

```bash
find /Users/ihelio/.codex/skills/code-simplifier -maxdepth 2 -type f | sort
```

Expected: only `SKILL.md` and `agents/openai.yaml` are present unless validation tooling added nothing else.

**Step 4: Commit**

```bash
git add /Users/ihelio/.codex/skills/code-simplifier
git commit -m "chore: validate code simplifier skill"
```
