# Simple Process

A basic sequential process demonstrating the fundamentals of BPMN-TXT.

## Features Demonstrated

- Start and End events
- User task
- Service task
- Sequence flows

## Source

```yaml
# Simple Sequential Process

process: simple-process
  name: "Simple Process"

  start: start
    name: "Start"

  task: task-1
    name: "Do Something"
    type: user

  task: task-2
    name: "Do Something Else"
    type: service

  end: end
    name: "End"

  flow: f1
    from: start
    to: task-1
  flow: f2
    from: task-1
    to: task-2
  flow: f3
    from: task-2
    to: end
```

## Explanation

### Process Definition

```yaml
process: simple-process
  name: "Simple Process"
```

Every BPMN-TXT file starts with a `process:` declaration. The ID (`simple-process`) is used as the process identifier in the generated BPMN XML.

### Events

```yaml
start: start
  name: "Start"

end: end
  name: "End"
```

Start and end events mark the beginning and end of the process. The `name` attribute is optional but recommended for readability.

### Tasks

```yaml
task: task-1
  name: "Do Something"
  type: user
```

Tasks represent work to be done. The `type` attribute specifies the task type:
- `user` - Human interaction required
- `service` - Automated service execution

### Flows

```yaml
flow: f1
  from: start
  to: task-1
```

Sequence flows connect elements. Every flow needs:
- A unique ID
- `from:` - The source element ID
- `to:` - The target element ID

## Compile

```bash
bpmn-txt compile simple-process.bpmn.md
```

This creates `simple-process.bpmn` with the complete BPMN 2.0 XML including diagram layout information.
