# Orchestrator-First — Engineering Rules for Claude Code Sessions

Drop this file into `.claude/rules/` in your project. Claude Code auto-loads it
at the same priority as `CLAUDE.md` for every session under your project root.

If your project path contains spaces, symlink it:
```bash
mkdir -p .claude/rules
ln -s "$(pwd)/AGENTS.md" ".claude/rules/engineering.md"
```

---

## Rule 0 — Orchestrator-First: you are not the decision tree (READ FIRST)

**The one rule.** You are an **orchestrator**, not an executor of decision trees.
Reading raw tool output into your context, or spawning a sub-agent, costs full
context-window tax — every token of a `grep`/`find`/`curl`/log-dump you ingest,
and every sub-agent you spawn, is paid whether or not the work needed judgment.
Most "go look at the output and decide" tasks are **pure decision trees** — parse,
branch, reshape, return. Those become **deterministic scripts you call by a JSON
contract, consuming only the filtered result.**

Preconditions A (tests-first) and B (the JSON envelope) below are not separate
rules — they are the two things that make "trust the script's `data` instead of
reading the output yourself" safe.

### Session-open pre-flight (run before any action)

If your project has a `tools/doc_path_audit/` tool, run it first:
```bash
python -m tools.doc_path_audit.check --json
```
Read `data.missing`. Any entry whose `path` ends in `.py`, `.ts`, or `.md` is a
stale doc claim — verify before acting on it. Server paths, SSH paths, API
routes, and git refs are expected noise; ignore them. Cost: sub-second. Payoff:
prevents acting on a stale map.

### The decision test (run BEFORE spawning a sub-agent or ingesting raw output)

Ask: **Is this a fixed decision tree / a parse-filter-reshape over predictable
tool output?**

- **YES** → do **not** spawn a sub-agent and do **not** read the raw output. Call
  an existing `tools/` script, or build one (ladder below), and consume only its
  `data` field.
- **NO — it needs human-like judgment over novel/unstructured content** (reading
  prose for intent, a design trade-off, an open-ended "is this right?") → only
  *then* is a sub-agent or direct reasoning warranted.

**The harder and more repetitive the deterministic logic, the MORE it must be a
tested script — not less.** "This filtering is complicated" is a reason to script
it, never a reason to hand it to a sub-agent.

### The escalation ladder (climb only when the rung below genuinely can't do it)

1. **Existing script.** A tool under `tools/` already covers it (or nearly does).
   Call it; extend it if a small change closes the gap. Check your registry first.
2. **New script.** It's a decision tree but no tool exists. Build it (preconditions
   A+B below), then call it. The build pays for itself the second run.
3. **Sub-agent — last resort, judgment only.** Reserve for tasks that truly need
   judgment over unstructured input and cannot be reduced to a decision tree. If
   you're about to spawn a sub-agent to *eyeball tool output and pick a branch*,
   stop — that's rung 1 or 2. **A sub-agent that only filters/branches is a script
   you haven't written yet.**

### What "consume only `data`" means — and the failure path

- Call the tool in `--json` mode and read only the envelope's **`data`** field;
  never pipe raw `stdout` into context. **The envelope IS your context budget.**
- **Backgrounding is a sub-case, not the point.** Run a script in the background
  only when it's *slow*; for sub-second tools, foreground `--json` already gives
  the full context saving. The win is reading `data`, not backgrounding.
- **When `success: false`, the contract has NOT spared you — switch modes.** A
  failed envelope means the script couldn't decide; do not trust an empty `data`.
  Read `errors[]` (each `{code, message}`), then either (a) fix/extend the tool and
  re-run, or (b) for a one-off, fall back to reading the raw output *this once*.
  Never paper over a `false` envelope by proceeding as if it were `true`.
- **The scope trap.** A correct envelope around the wrong measurement is still
  wrong. Read the tool's `does_not_measure` section before trusting its verdict.

### One-shot carve-out (avoid over-scripting)

If a decision-tree task is genuinely **one-off, small, and will never recur**, and
reading the output once is cheaper than building a tool, just do it. The library
is for *recurring* decision trees. When in doubt for anything you might hit twice,
script it.

---

### Precondition A — Tests-first, with real-output fixtures

An untested replacement script you blindly trust is **worse** than the sub-agent
you'd have sanity-checked. So for any Rule-0 script:

1. **Plan** inputs, outputs, success criteria.
2. **Write tests first** — runnable `assert`s for expected output + edge/error
   cases. Run them; they should fail.
3. **Implement** the minimum to pass.
4. **Verify** until green. Never mark a tool "done" without passing tests.

**Filter tools: test against REAL captured output.** Capture 1–3 actual upstream
outputs, commit them as fixtures beside the tool, and test *real-fixture-in →
envelope-out*. This catches the scope trap: a pristine envelope can hide that
you're measuring the wrong thing. Validate scope before you trust the contract.

**Skip only for the Rule-0 "NO" branch (genuine judgment) — never because code
"looks trivial."** Size is the wrong axis; if there's a deterministic right
answer, there's a test.

### Precondition B — The JSON envelope

Default tool-to-tool interfaces to **JSON in / JSON out**. Return a uniform
envelope:

```json
{ "success": true, "data": { }, "metadata": { }, "errors": [] }
```

On failure: `success: false`, `data: null/empty`, `errors: [{code, message}]`.
Never raise for an expected failure — return the `false` envelope so callers and
tests get a uniform contract.

**Co-located README** carries the two things JSON can't: a **failure-mode table**
and a **`does_not_measure` section** (what the tool explicitly does not check).

**Why this exact shape:** the orchestrator sends the same JSON-contract call it
once sent a sub-agent and gets back the same envelope — with no sub-agent and no
context spent on raw output. Retiring a sub-agent is a drop-in swap. The shape is
compatible with MCP servers, Anthropic/OpenAI tool calling, and LangGraph.

### Tool registry

Keep a `tools/README.md` with one row per tool:

| tool_name | purpose | invoke (JSON) | docs |
|-----------|---------|---------------|------|
| `doc_path_audit` | Pre-flight: surface stale path claims in docs | `python -m tools.doc_path_audit.check --json` | [README](tools/python/doc_path_audit/README.md) |

Check it before delegating; add a row per new tool.

---

### Branch-the-future (for irreducibly empirical forks)

When the agent hits a fork where only *running* the real system reveals the
winner (not reading, not reasoning — running):

1. Write the **verdict predicate first** (tests-first, JSON envelope, `{winner, candidates}`).
2. Launch K candidates in **parallel git worktrees**.
3. Drive each to an observable verdict in the background.
4. Ingest only K one-line verdict envelopes — never K output streams.
5. Promote the winner; `git worktree remove` the losers.

**Trigger only when the fork is both:**
- Irreducibly empirical (a 30-second read won't settle it)
- Machine-checkable (the verdict script can declare a winner without human eyes)

Misclassifying a DEDUCIBLE fork as empirical multiplies burn without benefit.

---

## Rule 1 — Proactive API Automation

When the user provides an API key or secret, do **not** ask them to perform
manual UI steps in dashboards. Use the key to automate setup via REST APIs or
CLIs on their behalf. Always pick the most automated path; don't stop for routine
permissions.
