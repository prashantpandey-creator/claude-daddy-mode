# Persona Engineering for Claude Code

A field-tested methodology for building **output-style personas** that change how
Claude *behaves* — not just how it talks — without taxing its reasoning or
silently breaking its engineering defaults.

Every principle here was learned the hard way: by building a persona, watching it
fail, diagnosing *why*, and fixing it. Where a claim is **verified** (against the
running binary) vs. merely **observed**, it says so. No benchmark claims are made
that weren't measured.

---

## Why this exists

A Claude Code "output style" is a markdown file in `~/.claude/output-styles/`
that gets injected at the system-prompt level. It's the most durable way to shape
behavior — it survives long sessions and context compression where a chat
instruction decays.

But output styles are sharp tools. Build one naively and you get a persona that:
- says its catchphrase a lot and changes nothing else,
- silently deletes Claude Code's built-in coding discipline,
- or spends so much instruction-weight on *voice* that reasoning degrades.

All three are avoidable. Here's how.

---

## The principles

### 1. Demonstrate, don't describe (examples > adjectives)

A model does not pattern-match to "be witty." It pattern-matches to *examples of
wit in context*. The single biggest cause of a flat persona is a file full of
adjectives ("dry, cheeky, confident") and zero demonstrations.

**Fix:** show before/after pairs. The BAD version (the voice to avoid) next to the
GOOD version (the actual target). Two or three concrete exchanges teach more than
a paragraph of description.

> This is the same insight PuranGPT's persona docs call **"Method Acting over
> Checklists"**: when an LLM reads a policy checklist it sounds artificial; when
> it reads a lived reality it adopts the persona naturally.

### 2. The voice must survive the whole answer

Personas die a specific death: the model lands one witty opener, then reverts to
flat assistant prose for the actual substance. If every example in your file is a
one-line reaction, you are *teaching* that failure.

**Fix:** include at least one example where the voice threads through a long,
multi-step answer — the dry asides live *inside* the technical content, not
stapled on top.

### 3. `keep-coding-instructions: true` — or you lose your defaults *(VERIFIED)*

Installing **any** custom output style replaces a chunk of Claude Code's base
system prompt — including the default coding-discipline block (YAGNI, no
gratuitous comments, verify-before-reporting-done) — *unless the style opts back
in.*

Verified against the Claude Code binary (v2.1.185): system-prompt assembly gates
on `keepCodingInstructions===true`, and the frontmatter key
`keep-coding-instructions` coerces to falsy when absent. So an output style
**without** that key silently ships every project without the default coding
guardrails.

**Fix:** put `keep-coding-instructions: true` in the frontmatter of every custom
style. This layers your persona *on top of* the defaults instead of replacing
them.

### 4. Persona weight is a tax on reasoning *(OBSERVED)*

Every token of "perform this voice" competes for attention with the actual
problem. A heavy, ornate persona (we shipped one at ~1,277 words) appeared to
degrade answer quality; trimming to ~450 words — keeping every *behavioral* rule,
cutting the register-coaching prose — restored it.

This is observed, not benchmarked. But the direction is clear: **lean beats
ornate.** Keep the rules that change behavior; cut the adjectives that only change
tone.

### 5. Decouple personality from policy

Keep *who the persona is* separate from *operational constraints* ("max N
sentences", "never do X"). Mixing them makes both harder to tune and makes the
voice read like a rulebook. (Also from PuranGPT's architecture.)

### 6. Reinforce across altitudes — but keep them consistent

A persona held in three places — the output style (system prompt), the global
`CLAUDE.md` (context), and a `UserPromptSubmit` hook (re-injected each turn) — is
more robust against decay. **But** if those layers contradict each other (e.g.
one hardcodes a fixed catchphrase while another says "vary it"), the most
recent/most-concrete instruction wins and you get exactly the tic you were trying
to avoid. Redundancy only helps when the layers agree.

### 7. Verify against ground truth, not assumptions

The `keep-coding-instructions` behavior wasn't taken on faith — it was confirmed
by inspecting the actual installed binary. When a claim about the tool's behavior
matters, check the tool, not your memory of it.

---

## The build loop

1. Write the style with `keep-coding-instructions: true` and 2–3 before/after examples.
2. Keep it lean — behavioral rules, not register-coaching prose.
3. Activate via `outputStyle` in `settings.json` (or `/output-style <name>`).
4. **Start a fresh session** — output styles load at session start, not mid-session.
5. Use it on a real task. If it goes flat after the opener, your examples are too short (see #2). If reasoning feels worse, the file is too heavy (see #4).
6. Iterate.

---

## Honest limitations

- **No performance benchmark.** The quality claims (#4 especially) are observed
  in use, not measured against an eval suite. Building that eval is future work.
- **Binary-version-specific.** The `keep-coding-instructions` mechanism is
  verified for Claude Code v2.1.185. The frontmatter key is stable, but always
  re-check on major upgrades.
- **Taste isn't transferable.** A good persona for one person reads as noise to
  another. These are construction principles, not a one-size voice.

---

*Distilled from an iterative session building and refining a series of Claude Code
personas. Methodology over mascot: the named voice is disposable, the
construction principles are the point.*
