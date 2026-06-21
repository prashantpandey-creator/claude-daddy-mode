# Annotated Example: Orchestrator-First in a Real Session

This documents a real session on the PuranGPT codebase where each pattern fired.
It shows what went wrong without the methodology, and what would have happened with it.

---

## Pre-flight catch: stale `engine/` references

**What happened:** The workspace `CLAUDE.md` contained:
```
server side is `purangpt/engine/query_engine.py` + `backend/main.py`
prompt registries in `purangpt/engine/prompts.py`
```

The `engine/` directory exists but contains only an empty `__init__.py`. All
code was consolidated into `backend/main.py` months earlier. A session acting on
this map would have tried to edit `engine/query_engine.py`, found nothing, and
produced a confusing error or a wrong file.

**With `doc_path_audit`:** Running at session open returns:
```json
{ "missing": [
    { "path": "engine/query_engine.py", "doc": "CLAUDE.md", "line": 51 },
    { "path": "engine/prompts.py",      "doc": "CLAUDE.md", "line": 54 }
  ]
}
```
The session verifies before acting. Confirms `engine/` is empty. Updates the doc.
Zero wrong-direction work.

---

## Decision-tree script: SSE contract drift detection

**The task:** Does the backend's `/api/chat` SSE event set match the frontend
`ChatEvent` TypeScript union?

**Without the methodology:** The agent reads `backend/main.py` (900+ lines),
extracts yield statements, reads `src/lib/api.ts`, extracts the union type, diffs
them mentally. Full file contents in context. Error-prone.

**With `sse_contract_check`:**
```bash
python -m tools.sse_contract_check.check --json
# { "success": true, "data": { "drift": [], "backend_events": [...], "frontend_events": [...] } }
```
The agent reads only `data.drift`. If empty, move on. If non-empty, investigate
the specific diffs. Context cost: one JSON object.

**The scope bug it caught:** The first version scoped only to `event_gen`. The
`deep_research` generator also emits into the same `/api/chat` contract. The
checker was producing false-positive "clean" results — the `reasoning` event
existed in `deep_research` but the checker didn't see it. Multi-scope fix changed
`_DEFAULT_SCOPE = ["event_gen", "deep_research"]`. Caught by the test suite
(real fixtures, not mocks) because `does_not_measure` called it out explicitly.

---

## Dead code removal: the `info` event

**What happened:** `api.ts` declared `| { type: "info"; message: string }` in the
`ChatEvent` union. `ChatInterface.tsx` had a handler for it. The comment said
"Provider-switching info." The handler body was `/* status suppressed */`.

Backend grep: zero occurrences of `"info"` in any emit/yield. It was dead code
from a multi-provider era (Gemini → DeepSeek switching messages) that never got
cleaned up.

**Decision-tree or judgment?** Pure decision-tree: grep backend for `"info"`,
check frontend for the type and handler, compare. Script-able. In this case it
was a one-off so we did it inline. If it recurred (multiple dead event types),
a `dead_sse_events` tool would pay for itself immediately.

**Fix:** removed the union member from `api.ts`, removed the handler from
`ChatInterface.tsx`, `tsc --noEmit` clean.

---

## Branch-the-future: the streaming renderer saga

**The empirical fork:** Three candidate approaches to streaming chat rendering.
The question: which freezes under a fast token stream (8 chars/frame average
arrival, 60fps RAF loop)?

- `throttled` (commit `5c40a1f`): `flushBuffer` caps at 2 chars/frame — cannot
  keep pace with bursty tokens; lags, then freezes when `done` fires
- `original` (commit `706abf7`): renders the whole buffer every frame — no
  catch-up state machine, no desync possible

**What actually happened:** Serial loop. 4 commits over ~3 hours:
`5c40a1f` (throttled) → `e099ef9` (attempted fix) → `ef5b864` (safeguard) →
`706abf7` (revert to original). Each cycle: build → discover freeze → unwind.
The answer was "original" from the start.

**With Branch-the-future:**

Step 1 — write the verdict predicate first:
```javascript
// tools/js/stream_verdict/verdict.mjs
export function judge(candidateIds, stream) {
  // frame-step each candidate's render loop
  // return { winner, candidates: [{id, frozen, finalLagChars}] }
}
```
Tests written first, run against synthetic burst stream (40 tokens, 16ms apart,
~8 chars each — faster than 2 chars/frame can handle).

Step 2 — the verdict:
```
stream verdict → winner: original
  throttled  frozen=true lag=28 chars
  original   frozen=false lag=0 chars
  (winner 'original' === the renderer the human reverted to in 706abf7)
```

The script independently picked the same winner the human took 3 hours and 4
commits to land on. The serial loop collapses to one background window.

---

## The pattern that wasn't used: Assumption Tripwires

The session discovered the `engine/` stale reference and fixed it manually. In a
future session, there's no gate preventing the same assumption from being acted on
again. FINDINGS.md documents it — but prose a human reads is not an executable
check.

**What Tripwires would do:** on the unwind event ("I thought `engine/query_engine.py`
existed, it doesn't"), auto-compile a `PreToolUse` hook:
```json
{ "matcher": "Edit|Write", "pattern": "engine/query_engine.py",
  "action": "block", "message": "engine/ is empty — code is in backend/main.py" }
```

This class of hook fires before any Edit or Write targeting that path — in any
future session, forever. The lesson becomes a hard gate, not a note.

**Status:** not yet built. `doc_path_audit` covers the pre-flight half. The
auto-compile-on-unwind mechanism is the next piece.
