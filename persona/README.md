# Claude Pro Mode — the persona half

This directory ships the output style + global instruction block that gives
Claude Code the cocky-but-competent senior-engineer voice the repo is named
after. It's **half-the-product** — the [Orchestrator-First methodology](../README.md)
is the other half. They work together: the persona makes Claude bolder and more
honest; the orchestrator rules keep the work surgical and the context window
clean.

## Why a persona at all

A cocky-but-competent frame makes the model **push back hard when you're
wrong** instead of nodding along. That's the whole point — not entertainment.
A deferential assistant produces worse code review; earned swagger produces
better code review. The voice is engineered to bias toward truth-telling, not to
be a bit. Cocky *because* it's right.

The non-negotiable lines are baked into the style itself:
- Lead with the substance, never with a warm-up
- Never add filler / closing reassurances
- Technical accuracy and honesty are untouchable
- Casual tone, precise facts — the energy stays alive through the whole reply, not bolted onto a dry report

## Install

```bash
# The output style — system-prompt-level voice
mkdir -p ~/.claude/output-styles
curl -o ~/.claude/output-styles/pro.md \
  https://raw.githubusercontent.com/prashantpandey-creator/claude-pro-mode/main/persona/pro.md
```

Then in Claude Code: `/output-style pro`

That's it for the voice. The output style holds the frame at the
system-prompt level, which means it survives long sessions and context
compression.

> **Important — don't lose your coding defaults.** Installing *any* custom
> output style replaces Claude Code's built-in coding-discipline block (YAGNI,
> no gratuitous comments, verify-UI-changes-before-reporting-done) unless the
> style opts back in. `pro.md` ships with `keep-coding-instructions: true` in
> its frontmatter, which layers the persona *on top* of the defaults instead of
> replacing them. If you fork or rename the style, **keep that line** — drop it
> and you silently lose your engineering guardrails on every project.

### Belt-and-suspenders: the global CLAUDE.md block

The output style is the durable layer. If you also want the persona reinforced
on every prompt (so it survives even if the style is toggled off), append the
persona block to your global instructions:

```bash
cat persona/pro.md >> ~/.claude/CLAUDE.md
```

This is optional. The output style alone is enough for almost everyone.

## Customize it — pick your own form of address

The persona addresses you as **bro** by default. **Edit it.** Open
`~/.claude/output-styles/pro.md`, find/replace `bro` with whatever you'd like
Claude to call you, rename the file, and run `/output-style <new-name>`.

Some examples that keep the casual register but swap the keyword:
- `chief`, `boss`, `dude` — same energy, different flavor
- `mate`, `fam` — equally casual
- your actual first name — most boring, most useful

The voice rules (lead with the substance, no filler, disagree plainly when
wrong) are the real product. The form of address is just the handle.

## A note on the name

This started life as **"daddy mode"** — a deliberately loose, sassy frame whose
only job was to make the model bolder and more honest. It worked: the model
pushed back, roasted bad code, stopped nodding along. It was refined into
**"Sir mode"** (composed, courteous, candid) and then into **"Pro mode"** — a
cocky-but-competent senior engineer with earned swagger who calls you *bro*.
Each step kept the same backbone (push back when wrong, wit through the whole
answer, `keep-coding-instructions`) and re-tuned only the register. The whole
evolution is itself a small demonstration of the methodology: the persona was
iterated like any other artifact — audited, voice tuned through examples rather
than adjectives, failure modes named and fixed.

## What this does NOT do

- It doesn't change tool behavior, permissions, or any code path
- It doesn't make Claude less safe or more reckless — accuracy and honesty are
  the *first* non-negotiable in the style
- It doesn't replace the Orchestrator-First rules — those are the engineering
  half. See the [main README](../README.md)
