# CLI Usage

The `bpmn-txt` CLI provides commands for compiling, watching, and validating BPMN-TXT files.

## Commands

### compile

Compile a `.bpmn.md` file to BPMN XML or JSON.

```bash
bpmn-txt compile <input> [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <path>` | Output file path | Same as input with `.bpmn` extension |
| `-f, --format <format>` | Output format: `bpmn` or `json` | `bpmn` |
| `--no-layout` | Disable automatic layout generation | Layout enabled |
| `-d, --direction <dir>` | Layout direction: `RIGHT`, `LEFT`, `DOWN`, `UP` | `RIGHT` |
| `-q, --quiet` | Suppress output except errors | Show output |

**Examples:**

```bash
# Basic compilation
bpmn-txt compile process.bpmn.md

# Specify output file
bpmn-txt compile process.bpmn.md -o output/my-process.bpmn

# Export as JSON
bpmn-txt compile process.bpmn.md -f json

# Vertical layout (top to bottom)
bpmn-txt compile process.bpmn.md -d DOWN

# Without auto-layout (for manual positioning)
bpmn-txt compile process.bpmn.md --no-layout

# Quiet mode (only show errors)
bpmn-txt compile process.bpmn.md -q
```

### watch

Watch a file and recompile on changes.

```bash
bpmn-txt watch <input> [options]
```

Same options as `compile`. Press `Ctrl+C` to stop watching.

**Example:**

```bash
bpmn-txt watch process.bpmn.md -o dist/process.bpmn
```

Output:
```
Watching process.bpmn.md for changes...
Press Ctrl+C to stop

✓ process.bpmn.md → process.bpmn

[10:30:45] File changed, recompiling...
✓ process.bpmn.md → process.bpmn
```

### validate

Validate a file without generating output.

```bash
bpmn-txt validate <input>
```

**Examples:**

```bash
# Valid file
bpmn-txt validate process.bpmn.md
# Output: ✓ process.bpmn.md is valid

# File with warnings
bpmn-txt validate process.bpmn.md
# Output:
# process.bpmn.md:15:3 warning: Service task 'send-email' has no implementation
# ✓ process.bpmn.md is valid
#   1 warning(s)

# Invalid file (exits with code 1)
bpmn-txt validate invalid.bpmn.md
# Output:
# invalid.bpmn.md:8:5 error: Reference to undefined element: nonexistent
# ✗ 1 validation error(s)
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (parse error, validation error, file not found) |

## Error Output

Errors include file path, line, and column:

```
process.bpmn.md:12:3 error: Duplicate element ID: task-1
```

This format is compatible with most editors and CI tools.

## Integration Examples

### npm Scripts

```json
{
  "scripts": {
    "build:bpmn": "bpmn-txt compile src/process.bpmn.md -o dist/process.bpmn",
    "watch:bpmn": "bpmn-txt watch src/process.bpmn.md -o dist/process.bpmn",
    "validate": "bpmn-txt validate src/process.bpmn.md"
  }
}
```

### CI/CD

```yaml
# GitHub Actions example
- name: Validate BPMN
  run: bpmn-txt validate processes/*.bpmn.md

- name: Compile BPMN
  run: |
    for file in processes/*.bpmn.md; do
      bpmn-txt compile "$file" -o "dist/$(basename "$file" .bpmn.md).bpmn"
    done
```

### Makefile

```makefile
BPMN_SOURCES := $(wildcard src/*.bpmn.md)
BPMN_OUTPUTS := $(patsubst src/%.bpmn.md,dist/%.bpmn,$(BPMN_SOURCES))

dist/%.bpmn: src/%.bpmn.md
	bpmn-txt compile $< -o $@

bpmn: $(BPMN_OUTPUTS)

.PHONY: bpmn
```
