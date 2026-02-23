# Processes & Pools

Learn how to structure BPMN processes with pools and lanes.

## Process Definition

Every BPMN-TXT file starts with a process definition:

```yaml
process: order-processing
  name: "Order Processing"
  executable: true
```

| Attribute | Description |
|-----------|-------------|
| `name` | Human-readable process name |
| `executable` | Whether the process can be executed (default: true) |

## Simple Process (No Pools)

For simple processes, elements are defined directly under the process:

```yaml
process: simple-flow
  name: "Simple Flow"

  start: begin
  task: work
  end: finish

  flow: f1
    from: begin
    to: work
  flow: f2
    from: work
    to: finish
```

## Pools

Pools represent participants in a collaboration. Use pools when modeling interactions between different organizations or systems:

```yaml
process: collaboration
  name: "Order Collaboration"

  pool: customer
    name: "Customer"

    start: order-placed
    task: submit-order
    end: order-confirmed

  pool: vendor
    name: "Vendor"

    start: order-received
    task: process-order
    end: order-shipped
```

## Lanes

Lanes subdivide pools into responsibilities (roles, departments):

```yaml
pool: sales-department
  name: "Sales Department"

  lane: sales-rep
    name: "Sales Representative"

    task: create-quote
      name: "Create Quote"
      type: user

  lane: manager
    name: "Sales Manager"

    task: approve-quote
      name: "Approve Quote"
      type: user
```

## Nested Structure

The full hierarchy:

```yaml
process: full-example
  name: "Full Example"

  pool: organization
    name: "Organization"

    lane: department-a
      name: "Department A"

      start: begin
        name: "Start"

      task: task-a
        name: "Task A"
        type: user

    lane: department-b
      name: "Department B"

      task: task-b
        name: "Task B"
        type: service

      end: finish
        name: "End"

  # Flows connect elements across lanes
  flow: f1
    from: begin
    to: task-a
  flow: f2
    from: task-a
    to: task-b
  flow: f3
    from: task-b
    to: finish
```

## Message Flows

When using multiple pools, use message flows for communication:

```yaml
process: inter-org
  pool: buyer
    task: send-order
      type: send

  pool: seller
    task: receive-order
      type: receive

  # Message flow between pools
  message-flow: order-msg
    from: send-order
    to: receive-order
    message: PurchaseOrder
```

> **Tip:** Sequence flows connect elements within the same pool. Message flows connect elements between different pools.

## Best Practices

1. **Use pools** when modeling interactions between different organizations
2. **Use lanes** for responsibilities within an organization
3. **Keep lane names role-based** (e.g., "Manager", "Customer Service")
4. **Define flows at process level** for better visibility
