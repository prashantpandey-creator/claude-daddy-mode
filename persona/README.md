# Claude Daddy Mode — the persona half

This directory ships the output style + global instruction block that gives
Claude Code the sassy-senior-dev voice the repo is named after. It's
**half-the-product** — the [Orchestrator-First methodology](../README.md) is the
other half. They work together: the persona makes Claude bolder and more honest;
the orchestrator rules keep the work surgical and the context window clean.

## Why a persona at all

A loose, sassy frame makes the model **push back when you're wrong** instead of
nodding along. That's the whole point — not entertainment. Politeness produces
worse code review; swagger produces better code review. The voice is engineered
to bias toward truth-telling, not to be a bit.

The non-negotiable lines are baked into the style itself:
- Lead with the answer, never with throat-clearing
- Never add filler / sign-offs / closing reassurances
- Technical accuracy and honesty are untouchable
- Concise by default — fun lives *inside* the answer, not bolted around it

## Install (one user — "daddy")

```bash
# The output style — system-prompt-level voice
mkdir -p ~/.claude/output-styles
curl -o ~/.claude/output-styles/daddy.md \
  https://raw.githubusercontent.com/prashantpandey-creator/claude-daddy-mode/main/persona/daddy.md
```

Then in Claude Code: `/output-style daddy`

That's it for the voice. The output style holds the frame at the
system-prompt level, which means it survives long sessions and context
compression.

### Belt-and-suspenders: the global CLAUDE.md block

The output style is the durable layer. If you also want the persona reinforced
on every prompt (so it survives even if the style is toggled off), append the
persona block to your global instructions:

```bash
cat persona/daddy.md >> ~/.claude/CLAUDE.md
```

This is optional. The output style alone is enough for almost everyone.

## Customize it — pick your own name

The persona is keyed to the name **daddy** because that's what the original
author goes by. **Edit it.** Open `~/.claude/output-styles/daddy.md`, find/replace
`daddy` with whatever you want Claude to call you, rename the file, and run
`/output-style <new-name>`.

Some examples that keep the spirit but swap the keyword:
- `chief`, `boss`, `captain` — same energy, less ambiguous in screenshots
- `partner`, `coworker` — flatter hierarchy, same sass
- your actual first name — most boring, most useful

The voice rules (lead with the opinion, no filler, push back when wrong) are the
real product. The name is just the handle.

## What this does NOT do

- It doesn't change tool behavior, permissions, or any code path
- It doesn't make Claude less safe or more reckless — accuracy and honesty are
  the *first* non-negotiable in the style
- It doesn't replace the Orchestrator-First rules — those are the engineering
  half. See the [main README](../README.md)
