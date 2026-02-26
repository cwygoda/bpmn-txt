# Syntax Overview

BPMN-TXT uses a YAML-like, indentation-based syntax. This page covers the core syntax rules.

## Basic Structure

```yaml
process: process-id
  name: "Process Name"

  # Elements are indented under the process
  start: start-id
    name: "Start Event"

  task: task-id
    name: "Task Name"
    type: user

  # Flows connect elements
  flow: flow-id
    from: start-id
    to: task-id
```

## Indentation

- Use **2 spaces** for each level of indentation
- Tabs are not supported
- Indentation defines hierarchy (process > pool > lane > element)

## Comments

Lines starting with `#` are comments:

```yaml
process: my-process
  # This is a comment
  start: begin
    name: "Start"  # Inline comments work too
```

## Identifiers

Element IDs follow these rules:

- Start with a letter or underscore
- Contain letters, numbers, underscores, hyphens
- Must be unique within the document

```yaml
task: validate_order     # Valid
task: task-123           # Valid
task: _internal          # Valid
task: 123-invalid        # Invalid - starts with number
```

## Strings

String values can be:

**Unquoted** (single word):

```yaml
task: my-task
  type: user
```

**Quoted** (multiple words or special characters):

```yaml
task: my-task
  name: "Validate Customer Order"
  condition: "amount > 1000"
```

## Element Declaration

Elements are declared with their type keyword followed by an ID:

```yaml
keyword: element-id
  attribute: value
```

| Keyword | Element Type |
|---------|--------------|
| `process:` | Process definition |
| `pool:` | Participant pool |
| `lane:` | Swim lane |
| `start:` | Start event |
| `end:` | End event |
| `event:` | Intermediate event |
| `task:` | Task/Activity |
| `subprocess:` | Subprocess |
| `call:` | Call activity |
| `gateway:` | Gateway |
| `flow:` | Sequence flow |
| `message-flow:` | Message flow |

## Attributes

Attributes are indented under their element:

```yaml
task: send-email
  name: "Send Email"
  type: service
  class: com.example.EmailService
```

Common attributes:

- `name:` - Display name
- `type:` - Element subtype (e.g., task type, gateway type)
- `trigger:` - Event trigger type
- `doc:` - Documentation anchor (service catalog integration)
- `service:` - Service catalog identifier

## Nested Elements

Some elements can contain others:

```yaml
process: my-process
  pool: main-pool
    name: "Main Pool"

    lane: processing
      name: "Processing Lane"

      task: do-work
        name: "Do Work"

        boundary: timeout
          type: timer
          duration: PT1H
```

## Flows

Sequence flows connect elements:

```yaml
flow: flow-id
  from: source-element-id
  to: target-element-id
  condition: "optional expression"
```

## Document Structure

A complete document structure:

```yaml
# Optional file-level comment

process: process-id
  name: "Process Name"
  executable: true

  # Pools (optional)
  pool: pool-id
    name: "Pool Name"

    lane: lane-id
      name: "Lane Name"

      # Elements in lane
      start: start-id
      task: task-id
      end: end-id

  # Or direct elements (no pools)
  start: start-id
  task: task-id
  end: end-id

  # Flows at process level
  flow: f1
    from: start-id
    to: task-id
```
