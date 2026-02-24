# BPMN-TXT for VS Code

Full language support for the [BPMN-TXT](https://github.com/cwygoda/bpmn-txt) DSL.

## Features

### Syntax Highlighting
- Element keywords (`process`, `task`, `gateway`, etc.)
- Attributes, types, and values
- Flow arrows (`->`)
- Comments (`#`)

### Diagnostics
- Real-time parse error detection
- Validation warnings (duplicate IDs, unresolved references)
- Error locations with line/column

### Autocomplete
- Element keywords at line start
- Attribute names based on parent element
- Type values (`user`, `service`, `exclusive`, etc.)
- Element ID completion for `from:`/`to:` references

### Go to Definition
- Click on `from:` or `to:` references to jump to element definition

### Live Preview
- Side-by-side BPMN diagram preview
- Auto-updates on save
- Dark mode support

## Installation

### From source

```bash
cd vscode-bpmn-txt
pnpm install
pnpm build
```

Then copy or symlink to VS Code extensions:

```bash
# macOS/Linux
ln -s $(pwd) ~/.vscode/extensions/bpmn-txt-0.1.0

# Windows
mklink /D %USERPROFILE%\.vscode\extensions\bpmn-txt-0.1.0 %cd%
```

Restart VS Code to activate.

## Usage

1. Open any `.bpmn.md`, `.bpmn.txt`, or `.bpmntxt` file
2. Use `Cmd+Shift+P` (or `Ctrl+Shift+P`) → "BPMN-TXT: Show Diagram Preview"
3. Or click the preview icon in the editor title bar

## Commands

| Command | Description |
|---------|-------------|
| `BPMN-TXT: Show Diagram Preview` | Open side-by-side BPMN diagram |

## File Associations

| Extension | Language |
|-----------|----------|
| `.bpmn.md` | BPMN-TXT |
| `.bpmn.txt` | BPMN-TXT |
| `.bpmntxt` | BPMN-TXT |
