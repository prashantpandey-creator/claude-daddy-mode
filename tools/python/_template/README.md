# _template

Copy this to build a new Rule-0 tool:
```bash
cp -r tools/python/_template tools/python/your_tool_name
```

Then:
1. Write tests first in `test_check.py` — run them, watch them fail
2. Implement `run()` in `check.py` until tests pass
3. Update this `README.md` with your tool's descriptor, failure-mode table, and `does_not_measure` section
4. Add a row to your `tools/README.md` registry

## Tool descriptor

```json
{
  "tool_name": "<tool_name>",
  "input_schema": {
    "type": "object",
    "properties": { "example_input": { "type": "string" } },
    "required": []
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "echo":   { "type": "string" },
      "length": { "type": "integer" }
    },
    "required": ["echo", "length"]
  }
}
```

## Does not measure

*(List what this tool explicitly does not check — prevents the scope trap)*

## Usage

```bash
python -m tools.your_tool_name.check --input hello
python -m tools.your_tool_name.check --input hello --json
```

## Failure modes

| Condition | Behavior |
|-----------|----------|
| Bad input | `success=false`, `errors=[{code:"bad_input"}]`, exit 2 |
| Finding detected | `success=true`, exit 1 |
| Normal | `success=true`, exit 0 |

## Tests

```bash
python -m tools.your_tool_name.test_check
```
