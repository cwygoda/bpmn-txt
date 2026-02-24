# BPMN-TXT for VS Code

Syntax highlighting for the [BPMN-TXT](https://github.com/cwygoda/bpmn-txt) DSL.

## Features

- Syntax highlighting for `.bpmn.md`, `.bpmn.txt`, and `.bpmntxt` files
- Bracket matching and auto-closing
- Comment toggling with `#`
- Indentation-based folding

## Installation

### From source

1. Clone or copy the `vscode-bpmn-txt` folder
2. Copy to your VS Code extensions directory:
   - **macOS**: `~/.vscode/extensions/bpmn-txt-0.1.0`
   - **Linux**: `~/.vscode/extensions/bpmn-txt-0.1.0`
   - **Windows**: `%USERPROFILE%\.vscode\extensions\bpmn-txt-0.1.0`
3. Restart VS Code

### Using symlink (development)

```bash
ln -s /path/to/vscode-bpmn-txt ~/.vscode/extensions/bpmn-txt-0.1.0
```

## Highlighted Elements

| Category | Keywords |
|----------|----------|
| Containers | `process`, `pool`, `lane`, `subprocess`, `call` |
| Activities | `task`, `gateway` |
| Events | `start`, `end`, `event`, `boundary` |
| Flows | `flow`, `message-flow`, `->` |
| Data | `data-object`, `data-store` |
| Artifacts | `annotation`, `group` |

## Example

```bpmn-txt
process: order-fulfillment
  name: "Order Fulfillment"

  start: order-received
    name: "Order Received"

  task: validate-order
    name: "Validate Order"
    type: service

  gateway: is-valid
    type: exclusive
    name: "Valid?"

  end: order-complete
    name: "Complete"

  flow: f1
    from: order-received
    to: validate-order

  flow: f2
    from: validate-order
    to: is-valid
```
