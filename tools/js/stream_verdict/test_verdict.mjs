/**
 * Tests for stream_verdict — written BEFORE the implementation (Rule 0, precondition A).
 *
 * Run: node tools/stream_verdict/test_verdict.mjs   (from purangpt-next/ repo root)
 *
 * THE EXPERIMENT'S SUCCESS CRITERION (Branch-the-future proof):
 *   A deterministic verdict script, fed a realistic token-burst SSE stream, must
 *   INDEPENDENTLY pick the same renderer the human reverted to after 4 commits
 *   and ~3 hours — commit 706abf7's "reliable original" (direct passthrough) —
 *   over the throttled renderer (5c40a1f) that froze.
 *
 * If it does: the pattern's load-bearing claim ("a predicate, not a human, can
 * adjudicate an empirical fork") is PROVEN on real historical data.
 * If it can't separate them: the verdict isn't machine-checkable for this fork,
 * and we've honestly bounded the pattern.
 */
import {
  simulateRender, judge, ENVELOPE_KEYS,
} from "./verdict.mjs";

let failures = 0;
function assert(cond, msg) {
  if (!cond) { console.error(`  FAIL: ${msg}`); failures++; }
}

// A realistic LLM token stream: bursty, fast (way over the throttled 120 chars/sec cap),
// then a `done` event. Total content well beyond what 2 chars/frame can keep up with.
function makeStream() {
  const tokens = [];
  // 40 tokens averaging ~8 chars = ~320 chars, arriving ~1 token per 16ms frame.
  // At 2 chars/frame the throttled renderer can render ~2 chars/frame = it falls
  // hopelessly behind a ~8 chars/frame arrival rate.
  for (let i = 0; i < 40; i++) {
    tokens.push({ t: i * 16, chars: "meditation".slice(0, 6 + (i % 5)) + " " });
  }
  return { tokens, doneAt: 40 * 16 };
}

// ---- Test 1: the throttled renderer FREEZES (final render != full content at done+grace) ----
function test_throttled_freezes() {
  const stream = makeStream();
  const r = simulateRender("throttled", stream);
  // After the stream's `done` plus a generous grace window, throttled is STILL
  // catching up (2 chars/frame can't drain a 320-char buffer in time) → freeze.
  assert(r.frozen === true, `throttled should freeze, got frozen=${r.frozen} (lag=${r.finalLagChars})`);
  assert(r.finalLagChars > 0, `throttled should have residual lag, got ${r.finalLagChars}`);
  console.log(`ok: throttled_freezes (lag=${r.finalLagChars} chars, drainMs=${r.drainMsAfterDone})`);
}

// ---- Test 2: the original renderer does NOT freeze (renders full buffer each frame) ----
function test_original_no_freeze() {
  const stream = makeStream();
  const r = simulateRender("original", stream);
  assert(r.frozen === false, `original should NOT freeze, got frozen=${r.frozen}`);
  assert(r.finalLagChars === 0, `original should fully render, lag=${r.finalLagChars}`);
  console.log(`ok: original_no_freeze (lag=${r.finalLagChars})`);
}

// ---- Test 3: THE PROOF — judge() picks "original" as winner, unprompted ----
function test_judge_picks_the_reverted_winner() {
  const stream = makeStream();
  const env = judge(["throttled", "original"], stream);
  assert([...Object.keys(env)].sort().join() === ENVELOPE_KEYS.sort().join(),
    `envelope shape, got ${Object.keys(env)}`);
  assert(env.success === true, "envelope success");
  assert(env.data.winner === "original",
    `THE EXPERIMENT: script must pick 'original' (=706abf7), got '${env.data.winner}'`);
  assert(env.data.candidates.length === 2, "two candidates judged");
  console.log(`ok: judge_picks_the_reverted_winner (winner=${env.data.winner})`);
}

// ---- Test 4: error envelope on unknown candidate ----
function test_error_envelope_unknown_candidate() {
  const stream = makeStream();
  const env = judge(["throttled", "nonexistent"], stream);
  assert(env.success === false, "unknown candidate → success=false");
  assert(env.errors.length >= 1 && env.errors[0].code === "unknown_candidate",
    `error code, got ${JSON.stringify(env.errors)}`);
  console.log("ok: error_envelope_unknown_candidate");
}

test_throttled_freezes();
test_original_no_freeze();
test_judge_picks_the_reverted_winner();
test_error_envelope_unknown_candidate();

if (failures) { console.error(`\n${failures} TEST(S) FAILED`); process.exit(1); }
console.log("\nALL TESTS PASSED");
