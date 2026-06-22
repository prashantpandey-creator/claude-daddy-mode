#!/usr/bin/env bash
# Orchestrator-First pre-flight: run doc_path_audit and inject findings as
# additionalContext so the agent knows the stale-path state before its first action.

# Self-locate: the hook lives at <REPO_ROOT>/.claude/hooks/session-start.sh
REPO_ROOT="$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)"

if [ ! -d "$REPO_ROOT" ] || [ ! -d "$REPO_ROOT/tools/doc_path_audit" ]; then
  # Silent exit — never break session startup if the tool isn't installed
  echo '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":""}}'
  exit 0
fi

# Pick a Python interpreter: prefer venv, then .venv, then python3, then python
if [ -x "$REPO_ROOT/venv/bin/python" ]; then
  PY="$REPO_ROOT/venv/bin/python"
elif [ -x "$REPO_ROOT/.venv/bin/python" ]; then
  PY="$REPO_ROOT/.venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PY="python3"
elif command -v python >/dev/null 2>&1; then
  PY="python"
else
  echo '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":""}}'
  exit 0
fi

# Run doc_path_audit — outputs JSON envelope
RESULT=$(cd "$REPO_ROOT" && "$PY" -m tools.doc_path_audit.check --json 2>/dev/null)

if [ -z "$RESULT" ]; then
  echo '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":""}}'
  exit 0
fi

# Extract missing paths that look like real code files
MISSING=$(echo "$RESULT" | "$PY" -c "
import json, sys
d = json.load(sys.stdin)
if not d.get('success'):
    print('')
    sys.exit(0)
CODE_EXTS = ('.py', '.ts', '.tsx', '.js', '.jsx', '.md', '.go', '.rs', '.rb')
items = [
    m for m in d['data']['missing']
    if any(m['path'].endswith(ext) for ext in CODE_EXTS)
]
if not items:
    print('All doc path claims verified against disk.')
else:
    lines = ['STALE DOC PATHS (claimed in docs but missing on disk):']
    for m in items:
        lines.append(f'  {m[\"doc\"]}:{m[\"line\"]}  {m[\"path\"]}')
    lines.append('Verify these before acting on any claim about them.')
    print('\n'.join(lines))
" 2>/dev/null)

# Build additionalContext
if [ -z "$MISSING" ]; then
  CONTEXT="Pre-flight doc_path_audit: all claimed paths verified on disk."
else
  CONTEXT="## Pre-flight doc_path_audit\n\n$MISSING"
fi

# Output the SessionStart hook envelope
"$PY" -c "
import json, sys
context = sys.argv[1]
print(json.dumps({
    'hookSpecificOutput': {
        'hookEventName': 'SessionStart',
        'additionalContext': context
    }
}))
" "$CONTEXT"

exit 0
