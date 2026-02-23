# BPMN Mapping

This page shows how BPMN-TXT elements map to BPMN 2.0 XML.

## Process Elements

| BPMN-TXT | BPMN XML |
|---------|----------|
| `process:` | `<bpmn:process>` |
| `pool:` | `<bpmn:participant>` |
| `lane:` | `<bpmn:lane>` |

## Events

| BPMN-TXT | BPMN XML |
|---------|----------|
| `start:` | `<bpmn:startEvent>` |
| `end:` | `<bpmn:endEvent>` |
| `event:` (type: catch) | `<bpmn:intermediateCatchEvent>` |
| `event:` (type: throw) | `<bpmn:intermediateThrowEvent>` |
| `boundary:` | `<bpmn:boundaryEvent>` |

### Event Definitions

| Trigger | BPMN XML |
|---------|----------|
| `trigger: message` | `<bpmn:messageEventDefinition>` |
| `trigger: timer` | `<bpmn:timerEventDefinition>` |
| `trigger: signal` | `<bpmn:signalEventDefinition>` |
| `trigger: error` | `<bpmn:errorEventDefinition>` |
| `trigger: escalation` | `<bpmn:escalationEventDefinition>` |
| `trigger: compensation` | `<bpmn:compensateEventDefinition>` |
| `trigger: conditional` | `<bpmn:conditionalEventDefinition>` |
| `trigger: terminate` | `<bpmn:terminateEventDefinition>` |
| `trigger: link` | `<bpmn:linkEventDefinition>` |

## Tasks

| BPMN-TXT | BPMN XML |
|---------|----------|
| `task:` (type: task) | `<bpmn:task>` |
| `task:` (type: user) | `<bpmn:userTask>` |
| `task:` (type: service) | `<bpmn:serviceTask>` |
| `task:` (type: script) | `<bpmn:scriptTask>` |
| `task:` (type: send) | `<bpmn:sendTask>` |
| `task:` (type: receive) | `<bpmn:receiveTask>` |
| `task:` (type: manual) | `<bpmn:manualTask>` |
| `task:` (type: businessRule) | `<bpmn:businessRuleTask>` |
| `subprocess:` | `<bpmn:subProcess>` |
| `call:` | `<bpmn:callActivity>` |

## Gateways

| BPMN-TXT | BPMN XML |
|---------|----------|
| `gateway:` (type: exclusive) | `<bpmn:exclusiveGateway>` |
| `gateway:` (type: parallel) | `<bpmn:parallelGateway>` |
| `gateway:` (type: inclusive) | `<bpmn:inclusiveGateway>` |
| `gateway:` (type: eventBased) | `<bpmn:eventBasedGateway>` |
| `gateway:` (type: complex) | `<bpmn:complexGateway>` |

## Flows

| BPMN-TXT | BPMN XML |
|---------|----------|
| `flow:` | `<bpmn:sequenceFlow>` |
| `message-flow:` | `<bpmn:messageFlow>` |

### Flow Attributes

| BPMN-TXT Attribute | BPMN XML Attribute |
|-------------------|-------------------|
| `from:` | `sourceRef` |
| `to:` | `targetRef` |
| `condition:` | `<bpmn:conditionExpression>` |

## Data

| BPMN-TXT | BPMN XML |
|---------|----------|
| `data-object:` | `<bpmn:dataObjectReference>` |
| `data-store:` | `<bpmn:dataStoreReference>` |

## Artifacts

| BPMN-TXT | BPMN XML |
|---------|----------|
| `annotation:` | `<bpmn:textAnnotation>` |
| `group:` | `<bpmn:group>` |

## Example Mapping

### BPMN-TXT Input

```yaml
process: order-process
  name: "Order Processing"
  executable: true

  start: order-received
    name: "Order Received"
    trigger: message
    message: NewOrder

  gateway: check-stock
    type: exclusive
    name: "In Stock?"
    default: backorder-flow

  task: ship-order
    name: "Ship Order"
    type: service
    class: com.example.ShipService

  end: completed
    name: "Complete"

  flow: f1
    from: order-received
    to: check-stock
  flow: ship-flow
    from: check-stock
    to: ship-order
    condition: "inStock == true"
  flow: backorder-flow
    from: check-stock
    to: completed
  flow: f4
    from: ship-order
    to: completed
```

### BPMN XML Output

```xml
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">

  <bpmn:process id="order-process" name="Order Processing" isExecutable="true">

    <bpmn:startEvent id="order-received" name="Order Received">
      <bpmn:messageEventDefinition id="MessageEventDefinition_order-received"/>
    </bpmn:startEvent>

    <bpmn:exclusiveGateway id="check-stock" name="In Stock?" default="backorder-flow"/>

    <bpmn:serviceTask id="ship-order" name="Ship Order"/>

    <bpmn:endEvent id="completed" name="Complete"/>

    <bpmn:sequenceFlow id="f1" sourceRef="order-received" targetRef="check-stock"/>
    <bpmn:sequenceFlow id="ship-flow" sourceRef="check-stock" targetRef="ship-order">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">
        inStock == true
      </bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="backorder-flow" sourceRef="check-stock" targetRef="completed"/>
    <bpmn:sequenceFlow id="f4" sourceRef="ship-order" targetRef="completed"/>

  </bpmn:process>

  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="order-process">
      <!-- Shapes and edges with coordinates -->
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>

</bpmn:definitions>
```
