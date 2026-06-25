---
name: claude-pro-mode
description: Install Claude Pro Mode (Orchestrator-First methodology + cocky-but-competent persona) into the current project and the user's global Claude config. Use when the user says "install claude pro mode", "set up the methodology", "wire the pre-flight hook", or "install the persona".
tools: Bash, Read, Write, Edit
---

# Claude Pro Mode — Installer

Install both halves of Claude Pro Mode:

1. **Orchestrator-First methodology** (per project): AGENTS.md rules, doc_path_audit tool, SessionStart hook, settings patch
2. **Pro persona** (per user, global): output style + optional CLAUDE.md block

The methodology is project-scoped. The persona is user-scoped. You can install
either independently — ask the user which they want if it's unclear.

## Workflow

### Step 0 — Confirm scope with the user

Default to installing BOTH. If the user only asks for one half, install only that half.

- "install pro mode" / "install claude pro mode" → both
- "install the orchestrator" / "wire the hook" → methodology only
- "install the persona" / "install the pro voice" → persona only

### Step 1 — Locate the source repo

```bash
ls ~/projects/claude-pro-mode/ 2>/dev/null || \
ls ~/claude-pro-mode/ 2>/dev/null || \
ls ~/projects/orchestrator-first/ 2>/dev/null || \
echo "not found locally"
```

If not found, clone it:
```bash
git clone https://github.com/prashantpandey-creator/claude-pro-mode ~/claude-pro-mode
```

Set `REPO` to the resolved path.

---

## Part A — Methodology (project-scoped)

### A1. Detect current project

```bash
pwd
ls -la .claude/ 2>/dev/null || echo "no .claude dir yet"
ls -la tools/ 2>/dev/null || echo "no tools dir yet"
cat .claude/settings.local.json 2>/dev/null || echo "no settings.local.json yet"
```

Set `PROJECT_ROOT` to the current working directory.

### A2. Create directory structure

```bash
mkdir -p .claude/rules .claude/hooks tools/doc_path_audit tools/_template
```

### A3. Copy AGENTS.md

```bash
cp "$REPO/AGENTS.md" .claude/rules/AGENTS.md
```

If the project path contains spaces, also create a symlink (some Claude Code
versions choke on spaced paths):
```bash
ln -sf "$(pwd)/.claude/rules/AGENTS.md" .claude/rules/engineering.md
```

### A4. Copy doc_path_audit tool + template

```bash
cp "$REPO/tools/python/doc_path_audit/check.py" tools/doc_path_audit/check.py
cp "$REPO/tools/python/doc_path_audit/test_check.py" tools/doc_path_audit/test_check.py
cp "$REPO/tools/python/doc_path_audit/README.md" tools/doc_path_audit/README.md
touch tools/doc_path_audit/__init__.py tools/__init__.py

cp "$REPO/tools/python/_template/check.py" tools/_template/check.py
cp "$REPO/tools/python/_template/test_check.py" tools/_template/test_check.py
cp "$REPO/tools/python/_template/README.md" tools/_template/README.md
touch tools/_template/__init__.py
```

### A5. Copy the hook (no patching needed)

```bash
cp "$REPO/hooks/session-start.sh" .claude/hooks/session-start.sh
chmod +x .claude/hooks/session-start.sh
```

The shipped hook self-locates its `REPO_ROOT` (two levels up from
`.claude/hooks/`) and auto-detects the Python interpreter (venv → .venv → python3
→ python). No edits required.

### A6. Wire the hook into settings.local.json

Read `.claude/settings.local.json` (or start with `{}`).

Merge in:
```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash \"PROJECT_ROOT/.claude/hooks/session-start.sh\""
          }
        ]
      }
    ]
  }
}
```

Where `PROJECT_ROOT` is the absolute path from A1. Hook commands resolve from
the Claude Code binary's directory, not the project root — use the absolute path,
no `~`, no relative paths.

Preserve any existing keys (permissions, env, etc.).

### A7. Smoke-test the hook

```bash
bash .claude/hooks/session-start.sh
```

Expected:
```json
{"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "..."}}
```

If empty or errors, diagnose:
- `tools/doc_path_audit/` files present? (`ls tools/doc_path_audit/`)
- Python resolves? (`which python3`)
- `REPO_ROOT` resolves? (`cd .claude/hooks && cd ../.. && pwd`)

---

## Part B — Persona (user-scoped, global)

### B1. Install the output style

```bash
mkdir -p ~/.claude/output-styles
cp "$REPO/persona/pro.md" ~/.claude/output-styles/pro.md
```

### B2. Tell the user how to activate

The output style is installed but not active by default. In Claude Code:
```
/output-style pro
```

### B3. Optional — global CLAUDE.md reinforcement

Ask if the user wants the persona reinforced via the global CLAUDE.md too
(belt-and-suspenders, survives style toggling). If yes:

```bash
# Check whether a pro block already exists to avoid duplicates
grep -q "name: pro" ~/.claude/CLAUDE.md 2>/dev/null && \
  echo "already in ~/.claude/CLAUDE.md, skipping" || \
  cat "$REPO/persona/pro.md" >> ~/.claude/CLAUDE.md
```

### B4. Customization prompt

The persona addresses the user as "bro" by default. Remind the user: they can
find/replace `bro` with any form of address they want in
`~/.claude/output-styles/pro.md`, then rename the file and run
`/output-style <new-name>`.

---

## Step 9 — Report

Tell the user:
- Methodology: what was installed, what the hook reported on first run (clean
  or stale paths), and that every new session under this project will open with
  the pre-flight audit result in context
- Persona: that `/output-style pro` activates the voice, and they can rename
  the form of address if "bro" isn't their thing
- Next step for verification: start a fresh Claude Code session and confirm both
  the `SessionStart hook additional context` appears at the top AND the voice
  reads cocky-but-competent from the first response

## Important notes

- Never modify `~/.claude/settings.json` (global) — only the project-scoped
  `settings.local.json`
- If `settings.local.json` already has a `hooks.SessionStart` entry, merge into
  the existing array rather than overwriting
- The hook silently exits if `tools/doc_path_audit/` is missing — it will never
  break a session
- Cross-repo path references and historical prose mentions in audit output are
  expected noise; only entries with code-file extensions need attention
