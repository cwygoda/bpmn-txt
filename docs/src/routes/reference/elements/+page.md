# Elements Reference

Complete reference for all BPMN-TXT elements.

## Process

The root container for a BPMN process.

```yaml
process: process-id
  name: "Process Name"
  executable: true
  documentation: |
    Multi-line documentation
    for the process.
```

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No | Display name |
| `executable` | boolean | No | Whether process is executable (default: true) |
| `documentation` | string | No | Process documentation |

## Pool

A participant pool containing lanes and elements.

```yaml
pool: pool-id
  name: "Pool Name"

  lane: lane-id
    # Lane content
```

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No | Display name |

## Lane

A swim lane within a pool.

```yaml
lane: lane-id
  name: "Lane Name"

  task: task-in-lane
    name: "Task"
```

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No | Display name |

## Events

### Start Event

```yaml
start: start-id
  name: "Start"
  trigger: none|message|timer|signal|conditional|error
  message: MessageName       # For message trigger
  timer: PT1H                # For timer trigger (ISO 8601)
  signal: SignalName         # For signal trigger
  condition: "expression"    # For conditional trigger
```

| Trigger | Description |
|---------|-------------|
| `none` | Plain start event (default) |
| `message` | Triggered by message receipt |
| `timer` | Triggered by timer |
| `signal` | Triggered by signal |
| `conditional` | Triggered by condition |
| `error` | Error start (event subprocess) |

### End Event

```yaml
end: end-id
  name: "End"
  trigger: none|message|signal|error|terminate|compensation|escalation
  error: ErrorCode           # For error trigger
```

| Trigger | Description |
|---------|-------------|
| `none` | Plain end event (default) |
| `message` | Sends message on completion |
| `signal` | Throws signal on completion |
| `error` | Throws error |
| `terminate` | Terminates process |
| `compensation` | Triggers compensation |
| `escalation` | Triggers escalation |

### Intermediate Event

```yaml
event: event-id
  name: "Event Name"
  type: catch|throw
  trigger: message|timer|signal|link|compensation|error|escalation|conditional
```

### Boundary Event

Attached to a task or subprocess:

```yaml
task: parent-task
  name: "Long Running Task"

  boundary: timeout-event
    type: timer
    duration: PT30M
    interrupting: true|false
```

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | Yes | Trigger type |
| `interrupting` | boolean | No | Interrupts parent (default: true) |
| `duration` | string | No | Timer duration (ISO 8601) |

## Tasks

```yaml
task: task-id
  name: "Task Name"
  type: task|user|service|script|send|receive|manual|businessRule
```

### Task Types

| Type | Description | Additional Attributes |
|------|-------------|----------------------|
| `task` | Generic task | - |
| `user` | Human task | `assignee`, `candidateGroups`, `candidateUsers` |
| `service` | Automated service | `class`, `implementation` |
| `script` | Script execution | `script`, `scriptFormat` |
| `send` | Send message | - |
| `receive` | Receive message | - |
| `manual` | Manual work | - |
| `businessRule` | DMN decision | - |

### User Task

```yaml
task: review-task
  name: "Review Document"
  type: user
  assignee: ${initiator.manager}
  candidateGroups: reviewers
```

### Service Task

```yaml
task: send-email
  name: "Send Email"
  type: service
  class: com.example.EmailDelegate
```

### Script Task

```yaml
task: calculate
  name: "Calculate Total"
  type: script
  scriptFormat: javascript
  script: |
    var total = items.reduce((sum, item) => sum + item.price, 0);
    execution.setVariable('total', total);
```

## Subprocess

```yaml
subprocess: sub-id
  name: "Subprocess Name"
  triggered: false|true  # Event subprocess

  start: sub-start
  task: sub-task
  end: sub-end

  flow: sf1
    from: sub-start
    to: sub-task
```

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No | Display name |
| `triggered` | boolean | No | Event subprocess (default: false) |

## Call Activity

```yaml
call: call-id
  name: "Call External Process"
  calledElement: external-process-id
```

## Gateways

```yaml
gateway: gateway-id
  name: "Decision Point"
  type: exclusive|parallel|inclusive|eventBased|complex
  default: default-flow-id  # For exclusive/inclusive
```

| Type | Description |
|------|-------------|
| `exclusive` | XOR - one path taken |
| `parallel` | AND - all paths taken |
| `inclusive` | OR - one or more paths |
| `eventBased` | Wait for events |
| `complex` | Complex conditions |

## Sequence Flow

```yaml
flow: flow-id
  from: source-id
  to: target-id
  name: "Flow Label"
  condition: "amount > 1000"
```

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string | Yes | Source element ID |
| `to` | string | Yes | Target element ID |
| `name` | string | No | Flow label |
| `condition` | string | No | Condition expression |

## Message Flow

For communication between pools:

```yaml
message-flow: mf-id
  from: task-in-pool-a
  to: task-in-pool-b
  message: OrderMessage
```

## Data Objects

```yaml
data-object: data-id
  name: "Customer Data"

data-store: store-id
  name: "Customer Database"
```

## Annotations

```yaml
annotation: note-id
  text: |
    This is a note explaining
    the process step.
  annotates: task-id
```
