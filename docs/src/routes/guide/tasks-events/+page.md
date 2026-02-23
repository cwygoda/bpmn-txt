# Tasks & Events

Learn how to define activities and events in BPMN-TXT.

## Tasks

Tasks represent work to be done in a process.

### Basic Task

```yaml
task: my-task
  name: "Do Something"
```

### Task Types

```yaml
# User Task - Human interaction
task: review
  name: "Review Document"
  type: user
  assignee: john.doe

# Service Task - Automated
task: send-email
  name: "Send Email"
  type: service
  class: com.example.EmailService

# Script Task - Inline script
task: calculate
  name: "Calculate Total"
  type: script
  scriptFormat: javascript
  script: |
    var total = 0;
    for (var i = 0; i < items.length; i++) {
      total += items[i].price;
    }
    execution.setVariable('total', total);

# Manual Task - Non-automated work
task: physical-check
  name: "Physical Inspection"
  type: manual

# Send/Receive Tasks - Messaging
task: request
  name: "Send Request"
  type: send

task: wait-response
  name: "Wait for Response"
  type: receive
```

### Task Type Summary

| Type | Description | Use Case |
|------|-------------|----------|
| `user` | Human task | Forms, approvals, reviews |
| `service` | Automated service | API calls, processing |
| `script` | Script execution | Calculations, transformations |
| `send` | Send message | Outbound communication |
| `receive` | Wait for message | Inbound communication |
| `manual` | Manual work | Physical tasks |
| `businessRule` | DMN decision | Business rules |

## Events

Events represent things that happen during a process.

### Start Events

```yaml
# Plain start
start: begin
  name: "Start"

# Message start - triggered by message
start: order-received
  name: "Order Received"
  trigger: message
  message: NewOrder

# Timer start - triggered by schedule
start: daily-job
  name: "Daily Job"
  trigger: timer
  timer: R/P1D  # Every day

# Signal start - triggered by signal
start: alert-received
  name: "Alert Received"
  trigger: signal
  signal: SystemAlert
```

### End Events

```yaml
# Plain end
end: complete
  name: "Complete"

# Error end - throws error
end: failed
  name: "Failed"
  trigger: error
  error: ProcessError

# Terminate end - kills all tokens
end: abort
  name: "Abort"
  trigger: terminate

# Message end - sends message
end: notify-complete
  name: "Notify Complete"
  trigger: message
  message: ProcessComplete
```

### Intermediate Events

```yaml
# Catch event - waits for something
event: wait-approval
  name: "Wait for Approval"
  type: catch
  trigger: message
  message: ApprovalResponse

# Throw event - triggers something
event: send-notification
  name: "Send Notification"
  type: throw
  trigger: signal
  signal: StatusUpdate

# Timer intermediate - wait
event: wait-24h
  name: "Wait 24 Hours"
  type: catch
  trigger: timer
  timer: PT24H
```

### Boundary Events

Boundary events attach to tasks or subprocesses:

```yaml
task: long-process
  name: "Long Running Process"
  type: service

  # Interrupting timer - cancels task
  boundary: timeout
    type: timer
    duration: PT1H
    interrupting: true

  # Non-interrupting - parallel execution
  boundary: reminder
    type: timer
    duration: PT30M
    interrupting: false
```

## Timer Expressions

Timers use ISO 8601 duration format:

| Expression | Meaning |
|------------|---------|
| `PT30S` | 30 seconds |
| `PT5M` | 5 minutes |
| `PT1H` | 1 hour |
| `P1D` | 1 day |
| `P7D` | 7 days |
| `R/PT1H` | Every hour (repeating) |
| `R3/PT1H` | 3 times, every hour |

## Event Triggers Summary

| Trigger | Start | End | Intermediate | Boundary |
|---------|-------|-----|--------------|----------|
| `message` | yes | yes | yes | yes |
| `timer` | yes | - | yes | yes |
| `signal` | yes | yes | yes | yes |
| `error` | yes | yes | yes | yes |
| `escalation` | - | yes | yes | yes |
| `compensation` | - | yes | yes | yes |
| `terminate` | - | yes | - | - |
| `conditional` | yes | - | yes | yes |
