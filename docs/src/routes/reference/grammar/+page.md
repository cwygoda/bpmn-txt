---
title: Formal Grammar
description: EBNF grammar specification for BPMN-TXT
---

# Formal Grammar

BPMN-TXT uses an indentation-based syntax similar to YAML. This page documents the formal grammar using Extended Backus-Naur Form (EBNF).

## Indentation Rules

- **2 spaces per level** (mandatory)
- Tabs are not allowed
- Blank lines are ignored
- Comments start with `#` and extend to end of line

## Notation

```
( )     grouping
[ ]     optional (0 or 1)
{ }     repetition (0 or more)
|       alternative
" "     literal keyword
< >     non-terminal reference
```

## EBNF Grammar

### Document Structure

```ebnf
document        = { NEWLINE } { processDecl { NEWLINE } } [ globalLayout ] ;

processDecl     = "process:" IDENTIFIER NEWLINE INDENT processBody DEDENT ;
processBody     = { processAttr | poolDecl | flowElement | flowDecl | artifact } ;

processAttr     = nameAttr | executableAttr | documentationAttr ;
```

### Pools and Lanes

```ebnf
poolDecl        = "pool:" IDENTIFIER NEWLINE INDENT poolBody DEDENT ;
poolBody        = { nameAttr | laneDecl | flowElement | flowDecl } ;

laneDecl        = "lane:" IDENTIFIER NEWLINE INDENT laneBody DEDENT ;
laneBody        = { nameAttr | flowElement | flowDecl } ;
```

### Flow Elements

```ebnf
flowElement     = startEvent | intermediateEvent | endEvent
                | taskDecl | subprocessDecl | callActivity
                | gatewayDecl | dataObjectDecl | dataStoreDecl ;
```

### Events

```ebnf
startEvent      = "start:" IDENTIFIER NEWLINE INDENT startBody DEDENT ;
startBody       = { nameAttr | triggerAttr | eventAttr | inlineFlow } ;

intermediateEvent = "event:" IDENTIFIER NEWLINE INDENT eventBody DEDENT ;
eventBody       = { nameAttr | typeAttr | triggerAttr | eventAttr | inlineFlow } ;

endEvent        = "end:" IDENTIFIER NEWLINE INDENT endBody DEDENT ;
endBody         = { nameAttr | triggerAttr | eventAttr } ;

boundaryEvent   = "boundary:" IDENTIFIER NEWLINE INDENT boundaryBody DEDENT ;
boundaryBody    = { nameAttr | typeAttr | triggerAttr | interruptingAttr | eventAttr | inlineFlow } ;

eventAttr       = messageAttr | timerAttr | durationAttr | signalAttr
                | conditionAttr | errorAttr | escalationAttr | linkAttr ;
```

### Tasks

```ebnf
taskDecl        = "task:" IDENTIFIER NEWLINE INDENT taskBody DEDENT ;
taskBody        = { nameAttr | typeAttr | taskAttr | boundaryEvent | inlineFlow | dataAssoc } ;

taskAttr        = documentationAttr | implementationAttr | classAttr
                | scriptAttr | scriptFormatAttr
                | assigneeAttr | candidateGroupsAttr | candidateUsersAttr ;
```

### Subprocesses and Call Activities

```ebnf
subprocessDecl  = "subprocess:" IDENTIFIER NEWLINE INDENT subprocessBody DEDENT ;
subprocessBody  = { nameAttr | triggeredAttr | flowElement | flowDecl | boundaryEvent } ;

callActivity    = "call:" IDENTIFIER NEWLINE INDENT callBody DEDENT ;
callBody        = { nameAttr | calledElementAttr | boundaryEvent | inlineFlow } ;
```

### Gateways

```ebnf
gatewayDecl     = "gateway:" IDENTIFIER NEWLINE INDENT gatewayBody DEDENT ;
gatewayBody     = { nameAttr | typeAttr | defaultAttr | inlineFlow } ;
```

### Data Elements

```ebnf
dataObjectDecl  = "data-object:" IDENTIFIER NEWLINE INDENT dataObjectBody DEDENT ;
dataObjectBody  = { nameAttr } ;

dataStoreDecl   = "data-store:" IDENTIFIER NEWLINE INDENT dataStoreBody DEDENT ;
dataStoreBody   = { nameAttr } ;
```

### Flows

```ebnf
flowDecl        = sequenceFlowDecl | messageFlowDecl ;

sequenceFlowDecl = "flow:" IDENTIFIER NEWLINE INDENT flowBody DEDENT ;
flowBody        = { nameAttr | fromAttr | toAttr | conditionAttr } ;

messageFlowDecl = "message-flow:" IDENTIFIER NEWLINE INDENT msgFlowBody DEDENT ;
msgFlowBody     = { nameAttr | fromAttr | toAttr | messageAttr } ;

inlineFlow      = "->" IDENTIFIER [ inlineAttrs ] NEWLINE ;
inlineAttrs     = "{" [ inlineAttr { "," inlineAttr } ] "}" ;
inlineAttr      = ( "condition:" | "name:" | IDENTIFIER ":" ) attrValue ;
```

### Data Associations

```ebnf
dataAssoc       = inputAssoc | outputAssoc ;
inputAssoc      = "<-" IDENTIFIER NEWLINE ;
outputAssoc     = "=>" IDENTIFIER NEWLINE ;
```

### Artifacts

```ebnf
artifact        = annotationDecl | groupDecl ;

annotationDecl  = "annotation:" IDENTIFIER NEWLINE INDENT annotationBody DEDENT ;
annotationBody  = { textAttr | annotatesAttr } ;

groupDecl       = "group:" IDENTIFIER NEWLINE INDENT groupBody DEDENT ;
groupBody       = { nameAttr | elementsAttr } ;
```

### Layout (Optional)

```ebnf
globalLayout    = "@layout:" NEWLINE INDENT layoutBody DEDENT ;
layoutBody      = { elementLayout | edgeLayout } ;

elementLayout   = IDENTIFIER ":" NEWLINE INDENT elementLayoutBody DEDENT ;
elementLayoutBody = { xAttr | yAttr | widthAttr | heightAttr } ;

edgeLayout      = IDENTIFIER ":" NEWLINE INDENT edgeLayoutBody DEDENT ;
edgeLayoutBody  = { waypointsAttr } ;

waypointsAttr   = "waypoints:" NEWLINE INDENT { waypointEntry } DEDENT ;
waypointEntry   = "-" NEWLINE INDENT { xAttr | yAttr } DEDENT ;
```

### Attributes

```ebnf
nameAttr        = "name:" stringValue NEWLINE ;
typeAttr        = "type:" IDENTIFIER NEWLINE ;
triggerAttr     = "trigger:" IDENTIFIER NEWLINE ;
messageAttr     = "message:" stringValue NEWLINE ;
timerAttr       = "timer:" stringValue NEWLINE ;
durationAttr    = "duration:" stringValue NEWLINE ;
signalAttr      = "signal:" stringValue NEWLINE ;
conditionAttr   = "condition:" stringValue NEWLINE ;
errorAttr       = "error:" stringValue NEWLINE ;
escalationAttr  = "escalation:" stringValue NEWLINE ;
linkAttr        = "link:" stringValue NEWLINE ;
executableAttr  = "executable:" boolValue NEWLINE ;
documentationAttr = "documentation:" ( stringValue | multilineString ) NEWLINE ;
implementationAttr = "implementation:" stringValue NEWLINE ;
classAttr       = "class:" stringValue NEWLINE ;
scriptAttr      = "script:" ( stringValue | multilineString ) NEWLINE ;
scriptFormatAttr = "scriptFormat:" IDENTIFIER NEWLINE ;
assigneeAttr    = "assignee:" stringValue NEWLINE ;
candidateGroupsAttr = "candidateGroups:" stringValue NEWLINE ;
candidateUsersAttr = "candidateUsers:" stringValue NEWLINE ;
triggeredAttr   = "triggered:" boolValue NEWLINE ;
calledElementAttr = "calledElement:" IDENTIFIER NEWLINE ;
defaultAttr     = "default:" IDENTIFIER NEWLINE ;
interruptingAttr = "interrupting:" boolValue NEWLINE ;
fromAttr        = "from:" IDENTIFIER NEWLINE ;
toAttr          = "to:" IDENTIFIER NEWLINE ;
textAttr        = "text:" ( stringValue | multilineString ) NEWLINE ;
annotatesAttr   = "annotates:" IDENTIFIER NEWLINE ;
elementsAttr    = "elements:" arrayValue NEWLINE ;
xAttr           = "x:" NUMBER NEWLINE ;
yAttr           = "y:" NUMBER NEWLINE ;
widthAttr       = "width:" NUMBER NEWLINE ;
heightAttr      = "height:" NUMBER NEWLINE ;
```

### Values

```ebnf
attrValue       = stringValue | boolValue | NUMBER | IDENTIFIER ;
stringValue     = QUOTED_STRING | IDENTIFIER ;
boolValue       = "true" | "false" ;
arrayValue      = "[" [ IDENTIFIER { "," IDENTIFIER } ] "]" ;
multilineString = "|" NEWLINE { INDENT LINE NEWLINE } ;
```

### Terminals

```ebnf
IDENTIFIER      = /[a-zA-Z_$][a-zA-Z0-9_$.-]*/ ;
QUOTED_STRING   = /"(?:[^"\\]|\\.)*"/ ;
NUMBER          = /-?\d+(\.\d+)?/ ;
NEWLINE         = /\r?\n/ ;
INDENT          = (* increase in indentation level by 2 spaces *) ;
DEDENT          = (* decrease in indentation level by 2 spaces *) ;
LINE            = (* any non-empty line of text *) ;
```

## Type Values

### Task Types

- `user` - User task (human interaction)
- `service` - Service task (automated)
- `script` - Script task (inline code)
- `send` - Send task (message sending)
- `receive` - Receive task (message receiving)
- `manual` - Manual task
- `business-rule` - Business rule task

### Gateway Types

- `exclusive` - XOR gateway (default)
- `parallel` - AND gateway
- `inclusive` - OR gateway
- `event-based` - Event-based gateway
- `complex` - Complex gateway

### Event Triggers

Start events: `none`, `message`, `timer`, `signal`, `conditional`

Intermediate events: `message`, `timer`, `signal`, `conditional`, `error`, `escalation`, `link`

End events: `none`, `message`, `signal`, `error`, `escalation`, `terminate`, `compensate`

Boundary events: `message`, `timer`, `signal`, `conditional`, `error`, `escalation`

## Example

```bpmn-txt
process: order-fulfillment
  name: "Order Fulfillment Process"
  executable: true

  start: order-received
    name: "Order Received"
    trigger: message
    message: "NewOrderMessage"
    -> validate-order

  task: validate-order
    name: "Validate Order"
    type: service
    class: com.example.ValidateOrder
    -> check-inventory

  gateway: check-inventory
    name: "Inventory Available?"
    type: exclusive
    -> ship-order {condition: "inventory > 0"}
    -> backorder {condition: "inventory <= 0"}

  task: ship-order
    name: "Ship Order"
    type: user
    assignee: "warehouse"
    -> order-complete

  task: backorder
    name: "Create Backorder"
    type: service
    -> order-complete

  end: order-complete
    name: "Order Complete"
```
