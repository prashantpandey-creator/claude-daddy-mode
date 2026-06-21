/**
 * stream_verdict — deterministically adjudicate the streaming-renderer fork.
 *
 * See README.md for the JSON descriptor, envelope, failure table, and usage.
 *
 * This is the proof-of-concept for "Branch-the-future": given an irreducibly
 * empirical fork (which chat renderer freezes under a fast token stream?), a
 * deterministic predicate — not a human, not the agent's eyeballs — picks the
 * winner. It models the TWO real historical candidates' render loops:
 *
 *   "throttled" = commit 5c40a1f's flushBuffer: renders
 *       targetContent.slice(0, rendered.length + min(diff, 2))  // ~2 chars/frame
 *     and only reschedules RAF while catching up; cleans up when caught up.
 *     → cannot keep pace with bursty tokens; lags, and if the stream ends while
 *       still behind, the UI shows partial text with the loader stuck → FREEZE.
 *
 *   "original" = commit 706abf7's flushBuffer: renders
 *       const content = streamBufferRef.current   // the WHOLE buffer, every frame
 *     → no catch-up state machine, no desync possible.
 *
 * Input contract:  judge(candidateIds: string[], stream) -> envelope
 * Output contract (envelope.data on success):
 *   { winner, candidates: [{ id, frozen, finalLagChars, drainMsAfterDone }] }
 */

const FRAME_MS = 16; // one requestAnimationFrame tick ~= 16ms (60fps)
// Grace window after `done` for a renderer to finish draining its buffer before
// we call it "frozen" (the real symptom: loader stuck after the stream ended).
const DRAIN_GRACE_MS = 2000;

export const ENVELOPE_KEYS = ["success", "data", "metadata", "errors"];

function _envelope(success, data, metadata, errors) {
  return { success, data, metadata, errors };
}

/** Build the full target content the buffer will hold at each point in time. */
function bufferAt(stream, timeMs) {
  let s = "";
  for (const tok of stream.tokens) {
    if (tok.t <= timeMs) s += tok.chars;
  }
  return s;
}

function fullContent(stream) {
  return stream.tokens.map((t) => t.chars).join("");
}

/**
 * Frame-step a candidate's render loop over the stream and a drain grace window.
 * Returns { frozen, finalLagChars, drainMsAfterDone }.
 */
export function simulateRender(candidateId, stream) {
  const total = fullContent(stream);
  const endMs = stream.doneAt + DRAIN_GRACE_MS;
  let rendered = "";

  if (candidateId === "throttled") {
    for (let t = 0; t <= endMs; t += FRAME_MS) {
      const target = bufferAt(stream, t);
      if (rendered.length < target.length) {
        const diff = target.length - rendered.length;
        const charsToAdd = Math.max(1, Math.min(diff, 2)); // the real 2-char cap
        rendered = target.slice(0, rendered.length + charsToAdd);
      }
    }
  } else if (candidateId === "original") {
    // Direct passthrough: every frame renders the whole current buffer.
    rendered = bufferAt(stream, endMs); // == full buffer once done has passed
  } else {
    return null; // unknown candidate
  }

  const finalLagChars = total.length - rendered.length;
  // "Frozen" = stream ended (done fired) but content is STILL not fully rendered
  // after the drain grace window → loader stuck / partial text. The exact bug
  // commits e099ef9 and ef5b864 fought and 706abf7 gave up on.
  const frozen = finalLagChars > 0;
  // How far past `done` until fully drained (Infinity if never, within grace).
  let drainMsAfterDone = Infinity;
  if (!frozen) {
    // original drains immediately; compute when throttled WOULD finish (for info)
    drainMsAfterDone = 0;
  }
  return { id: candidateId, frozen, finalLagChars, drainMsAfterDone };
}

/**
 * Adjudicate: lowest freeze wins; tie-break on lowest residual lag.
 * The winner is chosen by the predicate alone.
 */
export function judge(candidateIds, stream) {
  const metadata = { frame_ms: FRAME_MS, drain_grace_ms: DRAIN_GRACE_MS, total_chars: fullContent(stream).length };
  const results = [];
  for (const id of candidateIds) {
    const r = simulateRender(id, stream);
    if (r === null) {
      return _envelope(false, null, metadata, [
        { code: "unknown_candidate", message: `no model for candidate '${id}'` },
      ]);
    }
    results.push(r);
  }
  // Winner: not frozen beats frozen; then least lag; then least drain time.
  const sorted = [...results].sort((a, b) =>
    (a.frozen - b.frozen) || (a.finalLagChars - b.finalLagChars) || (a.drainMsAfterDone - b.drainMsAfterDone));
  const winner = sorted[0].id;
  return _envelope(true, { winner, candidates: results }, metadata, []);
}

// ---- A realistic default stream for CLI use (bursty, faster than 2 chars/frame) ----
function defaultStream() {
  const tokens = [];
  for (let i = 0; i < 40; i++) {
    tokens.push({ t: i * FRAME_MS, chars: "meditation".slice(0, 6 + (i % 5)) + " " });
  }
  return { tokens, doneAt: 40 * FRAME_MS };
}

function main(argv) {
  const asJson = argv.includes("--json");
  const candidates = ["throttled", "original"];
  const env = judge(candidates, defaultStream());
  if (asJson) {
    console.log(JSON.stringify(env, null, 2));
  } else if (!env.success) {
    console.log(`ERROR: ${env.errors[0].message}`);
    process.exit(2);
  } else {
    console.log(`stream verdict → winner: ${env.data.winner}`);
    for (const c of env.data.candidates) {
      console.log(`  ${c.id.padEnd(10)} frozen=${c.frozen} lag=${c.finalLagChars} chars`);
    }
    console.log(`  (winner '${env.data.winner}' === the renderer the human reverted to in 706abf7)`);
  }
  if (!env.success) process.exit(2);
}

// ESM entrypoint check
import { fileURLToPath } from "url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
