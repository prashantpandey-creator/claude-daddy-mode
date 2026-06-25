# Claude Pro Mode

A two-piece kit for Claude Code that makes sessions **bolder and tighter**:

1. **Orchestrator-First methodology** — replace decision-tree sub-agents with deterministic, tested, JSON-contract scripts. Keep raw tool output out of context. Reserve the model for genuine judgment.
2. **Pro persona** — a cocky-but-competent senior-engineer output style that biases the model toward **pushing back hard when you're wrong** instead of nodding along. A deferential assistant produces worse code review; earned swagger produces better code review.

Together: Claude calls out the bad idea before you ship it, hypes the good one, ships surgically, and stops burning context on grep dumps.

> Formerly "daddy mode" → "Sir mode" → now **Pro mode**: a sharp senior engineer with earned swagger who calls you *bro*. The persona has been iterated like any other artifact — audited, tuned through examples, failure modes named and fixed. The evolution is itself a small proof the methodology works.

Built and proven on a real production codebase ([PuranGPT](https://purangpt.com)).

---

## TL;DR — one-command install

```bash
mkdir -p ~/.claude/skills
curl -o ~/.claude/skills/claude-pro-mode.md \
  https://raw.githubusercontent.com/prashantpandey-creator/claude-pro-mode/main/skills/claude-pro-mode.md
```

Then in any Claude Code session, in the project you want to wire up:

```
/claude-pro-mode
```

The skill installs both halves: the methodology into the current project, the persona into your global `~/.claude/`. It asks before touching anything.

> Want only one half? `/claude-pro-mode` understands "install the persona" or "install the orchestrator" — say which.

---

# Part 1 — Orchestrator-First (the engineering half)

## The core idea

Every Claude Code session pays a context tax. The two biggest drains are:

1. **Reading raw tool output** — grep results, log dumps, file trees piped straight into context
2. **Spawning sub-agents to eyeball output and pick a branch** — when the decision was always a fixed parse/filter/reshape

Most "go look at the output and decide" tasks are pure decision trees. They don't need judgment — they need a script.

**Rule 0 — Orchestrator-First:** before spawning a sub-agent or ingesting raw tool output, ask: *is this a fixed decision tree?* If yes → call a deterministic script under `tools/`, consume only its `data` field. Sub-agents are last resort, for genuine judgment over unstructured content only.

## The two rules

### Rule 0 — Orchestrator-First

**The decision test** (run before every delegation):

> Is this a fixed decision tree / a parse-filter-reshape over predictable tool output?

- **YES** → call an existing `tools/` script (or build one), consume only `data`
- **NO — needs human-like judgment over novel/unstructured content** → only then is a sub-agent or direct reasoning warranted

**The escalation ladder** (climb only when the rung below can't do it):

1. Existing script in `tools/` — call it; extend it if a small change closes the gap
2. New script — it's a decision tree but no tool exists; build it (see template), then call it
3. Sub-agent — last resort, judgment only

**Session-open pre-flight:** run `doc_path_audit` before any action. Catches stale doc claims before they corrupt the session's map.

**Precondition A — Tests-first with real-output fixtures:**
An untested replacement script you blindly trust is worse than a sub-agent you'd sanity-check. Write tests first, run them (they should fail), implement the minimum to pass, verify until green.

**Precondition B — The JSON envelope:**
Every script returns `{success, data, metadata, errors}`. This makes it a drop-in sub-agent replacement — same call site, same contract, no context spent on raw output.

```json
{ "success": true, "data": { ... }, "metadata": { ... }, "errors": [] }
```

On failure: `success: false`, `data: null`, `errors: [{code, message}]`. Never raise for an expected failure.

**The scope trap:** a correct envelope around the wrong measurement is still wrong. Every tool's README carries a `does_not_measure` section.

### Rule 1 — Proactive API Automation

When the user provides an API key or secret, don't ask them to perform manual dashboard steps. Use the key to automate setup via REST APIs or CLIs. Always pick the most automated path.

## The three patterns

### Pattern 1 — Pre-flight Orientation ✅ implemented + enforced

**Problem:** The agent opens a session with a stale map. Acts confidently on it. No tripwire fires because none was set yet.

**Mechanism:** `doc_path_audit` runs at session start via a `SessionStart` hook. Extracts backtick-quoted path claims from `.md` files, checks each against disk, returns `{missing, present}`. Result is injected as `additionalContext` — the agent sees it before its first action, without being asked.

**What "enforced" means:** the hook fires at the infrastructure level via `settings.local.json`. The agent cannot start a session without the audit result already in context. Behavioral rules (CLAUDE.md instructions to "remember to run X") don't enforce — hooks do.

**Proven:** on PuranGPT, the hook correctly surfaced two stale references on first run, and reports clean on every subsequent session after the docs were fixed.

→ [`tools/python/doc_path_audit/`](tools/python/doc_path_audit/) | [`hooks/session-start.sh`](hooks/session-start.sh)

### Pattern 2 — Branch-the-Future

**Problem:** The agent hits an irreducibly empirical fork — K candidates where only running the real system reveals which is right. Standard methodology serializes: pick one, build it, discover it's wrong, unwind, repeat.

**Mechanism:** Write the verdict predicate first (tests-first, JSON envelope). Launch all K candidates in parallel git worktrees. Drive each to an observable verdict. Ingest only K one-line verdict envelopes — not K output streams. Promote the winner; discard the losers.

**The two novel primitives:**
- **Verdict-predicate-before-candidates** — the script declares the winner; the agent's context never sees the K competing streams
- **Silently-discarded speculative-next-task** — when P(next user ask) ≈ 1.0, run the next task in a background worktree while the user reads the current response. Hit: instant delivery. Miss: `git worktree remove`, never shown.

**Proven:** modeled a real 4-commit, 3-hour serial revert loop on PuranGPT and adjudicated it in milliseconds — picking the same winner the human eventually reverted to. See [`examples/purangpt-session.md`](examples/purangpt-session.md).

### Pattern 3 — Assumption Tripwires *(design)*

**Problem:** The agent makes a wrong assumption, unwinds, records it in FINDINGS.md — then pays the same cost again next session because the lesson is prose, not an executable gate.

**Mechanism:** Every wrong-direction unwind auto-compiles into a `PreToolUse` hook. The falsified belief becomes a hard check, not a note.

**Status:** not yet built. Pattern 1's hook proves the infrastructure works. The auto-compile-on-unwind mechanism is the next piece.

---

# Part 2 — The Pro persona (the voice half)

The persona is a Claude Code **output style**. It runs at the system-prompt level so it survives long sessions and context compression.

## Why a persona at all

A deferential assistant produces a yes-machine. A cocky-but-competent frame produces a senior engineer who **tells you when you're wrong** — bluntly, because the swagger is earned. The voice is engineered to bias toward truth-telling; it's not a bit, it's a behavioral lever. Cocky *because* it's right.

Non-negotiables baked into the style:
- Lead with the substance, never with a warm-up
- Never add filler / closing reassurances
- **Technical accuracy and honesty are untouchable** — roast the code, never fake the facts
- Casual tone, precise facts — the energy stays alive through the whole reply, not bolted around it

## Install just the persona

If you don't want the methodology, you can install only the voice:

```bash
mkdir -p ~/.claude/output-styles
curl -o ~/.claude/output-styles/pro.md \
  https://raw.githubusercontent.com/prashantpandey-creator/claude-pro-mode/main/persona/pro.md
```

Then in Claude Code: `/output-style pro`

## Rename "bro"

The form of address is just the default. Open `~/.claude/output-styles/pro.md`, find/replace `bro` with `chief` / `boss` / `dude` / your actual name, rename the file, and `/output-style <new-name>`.

Voice rules are the product. The form of address is the handle. See [`persona/README.md`](persona/README.md) for details.

---

## Manual install path (skip the skill)

If you'd rather wire it by hand than use `/claude-pro-mode`:

### Step 1 — Drop in the rules

```bash
mkdir -p your-project/.claude/rules
curl -o your-project/.claude/rules/AGENTS.md \
  https://raw.githubusercontent.com/prashantpandey-creator/claude-pro-mode/main/AGENTS.md
```

Claude Code auto-loads `.claude/rules/` at CLAUDE.md priority for every session under your project root.

If your project path contains spaces, symlink:
```bash
ln -s "$(pwd)/AGENTS.md" ".claude/rules/engineering.md"
```

### Step 2 — Wire the pre-flight hook (enforcement layer)

This is what makes the methodology enforced rather than advisory.

```bash
mkdir -p your-project/tools your-project/.claude/hooks
cp -r tools/python/doc_path_audit your-project/tools/
cp hooks/session-start.sh your-project/.claude/hooks/
chmod +x your-project/.claude/hooks/session-start.sh
```

The shipped hook self-locates (no editing needed) and auto-picks the Python interpreter (venv → .venv → python3 → python).

Add to `your-project/.claude/settings.local.json`:
```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash \"your-project/.claude/hooks/session-start.sh\""
          }
        ]
      }
    ]
  }
}
```

Use the absolute path — hook commands resolve from the Claude Code binary's directory, not the project root.

### Step 3 — Build your own tools from the template

For every recurring decision-tree task in your project:

```bash
cp -r tools/python/_template your-project/tools/your_tool_name
```

1. Write tests first in `test_check.py` — run them, watch them fail
2. Implement `run()` in `check.py` until tests pass
3. Update `README.md` with the `does_not_measure` section
4. Add a row to your `tools/README.md` registry

---

## What's in this repo

```
AGENTS.md                     # The rules — drop into .claude/rules/
hooks/
  session-start.sh            # SessionStart hook — enforcement layer (self-locating)
skills/
  claude-pro-mode.md          # Install skill — /claude-pro-mode wires both halves
persona/
  pro.md                      # The output style — system-prompt-level voice
  README.md                   # Persona usage + customization guide
tools/
  python/
    _template/                # Copy this to build a new tool
    doc_path_audit/           # Pre-flight: surface stale path claims in docs
examples/
  purangpt-session.md         # Annotated real session showing each pattern
```

---

## Implementation status

| Piece | Status | Enforced via |
|-------|--------|-------------|
| Pre-flight Orientation | ✅ built + running | `SessionStart` hook in `settings.local.json` |
| Branch-the-Future | ✅ proven on real data | proof-of-concept only, not wired as hook |
| Assumption Tripwires | design only | `PreToolUse` hooks (not yet built) |
| Pro persona | ✅ shipping | `~/.claude/output-styles/pro.md` + optional CLAUDE.md block |

The key distinction: **rules load, hooks enforce.** AGENTS.md shapes behavior. The `SessionStart` hook is what makes Pattern 1 actually run every session regardless of whether the agent "remembers" to.

---

## Why this works

Developed on [PuranGPT](https://github.com/prashantpandey-creator/purangpt). The problems it solves are real:

- A stale `engine/query_engine.py` reference in docs would have corrupted a session's map — the hook catches it before the first action
- An SSE contract drift went undetected because the checker measured the wrong scope — the scope trap, now documented in every tool's `does_not_measure` section
- A 3-hour, 4-commit revert loop was adjudicated by a verdict script in milliseconds — Branch-the-future proven on real git history
- A cocky-but-competent senior-engineer voice ships better code review than a deferential assistant — blunt pushback catches the bad ideas earlier

The envelope shape (`{success, data, metadata, errors}`) is compatible with MCP servers, Anthropic/OpenAI tool calling, and LangGraph — retiring a sub-agent is a drop-in swap.

---

## License

MIT
