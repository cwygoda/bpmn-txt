# Gateways & Flows

Learn how to control process flow with gateways and sequence flows.

## Sequence Flows

Sequence flows connect elements within a process:

```yaml
flow: flow-id
  from: source-element
  to: target-element
```

### Conditional Flows

Add conditions to create decision branches:

```yaml
flow: high-value
  from: check-amount
  to: manager-approval
  condition: "amount > 10000"

flow: low-value
  from: check-amount
  to: auto-approve
  condition: "amount <= 10000"
```

### Named Flows

Add labels to flows for documentation:

```yaml
flow: approved-path
  from: decision
  to: proceed
  name: "Approved"
  condition: "approved == true"
```

## Gateways

Gateways control the flow of tokens through a process.

### Exclusive Gateway (XOR)

Routes to exactly one path based on conditions:

```yaml
gateway: check-status
  type: exclusive
  name: "Check Status"
  default: error-path  # Fallback if no condition matches

# Outgoing flows with conditions
flow: success-path
  from: check-status
  to: continue
  condition: "status == 'success'"

flow: retry-path
  from: check-status
  to: retry
  condition: "status == 'retry'"

flow: error-path
  from: check-status
  to: handle-error
  # No condition - this is the default
```

> **Tip:** Always set a `default` flow on exclusive gateways to handle unexpected cases.

### Parallel Gateway (AND)

Activates all outgoing paths simultaneously:

```yaml
# Split - start parallel execution
gateway: parallel-start
  type: parallel
  name: "Start Parallel"

# Join - wait for all paths
gateway: parallel-end
  type: parallel
  name: "Wait for All"

flow: path-a
  from: parallel-start
  to: task-a
flow: path-b
  from: parallel-start
  to: task-b

flow: join-a
  from: task-a
  to: parallel-end
flow: join-b
  from: task-b
  to: parallel-end
```

### Inclusive Gateway (OR)

Activates one or more paths based on conditions:

```yaml
gateway: notification-type
  type: inclusive
  name: "Notification Type"

flow: email
  from: notification-type
  to: send-email
  condition: "notifyEmail == true"

flow: sms
  from: notification-type
  to: send-sms
  condition: "notifySms == true"

flow: push
  from: notification-type
  to: send-push
  condition: "notifyPush == true"
```

### Event-Based Gateway

Waits for one of several events:

```yaml
gateway: wait-for-event
  type: eventBased
  name: "Wait for Response"

# Followed by catching events
event: response-received
  type: catch
  trigger: message
  message: Response

event: timeout
  type: catch
  trigger: timer
  timer: PT24H

flow: to-response
  from: wait-for-event
  to: response-received
flow: to-timeout
  from: wait-for-event
  to: timeout
```

## Gateway Patterns

### Decision Pattern

```yaml
gateway: decision
  type: exclusive
  name: "Approved?"

flow: yes
  from: decision
  to: proceed
  condition: "approved"

flow: no
  from: decision
  to: reject
  condition: "!approved"
```

### Fork-Join Pattern

```yaml
# Fork
gateway: fork
  type: parallel

# Parallel tasks
task: task-a
task: task-b
task: task-c

# Join
gateway: join
  type: parallel

# Flows
flow: f1
  from: fork
  to: task-a
flow: f2
  from: fork
  to: task-b
flow: f3
  from: fork
  to: task-c
flow: f4
  from: task-a
  to: join
flow: f5
  from: task-b
  to: join
flow: f6
  from: task-c
  to: join
```

### Loop Pattern

```yaml
task: process-item
  name: "Process Item"

gateway: more-items
  type: exclusive
  name: "More Items?"

flow: loop-back
  from: more-items
  to: process-item
  condition: "hasMoreItems"

flow: exit-loop
  from: more-items
  to: done
  condition: "!hasMoreItems"
```

## Gateway Summary

| Type | Behavior | Use Case |
|------|----------|----------|
| `exclusive` | One path | Decisions, routing |
| `parallel` | All paths | Parallel work |
| `inclusive` | One or more | Optional paths |
| `eventBased` | Wait for event | External triggers |
| `complex` | Custom logic | Complex conditions |
